import os
import time
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import requests

app = Flask(__name__)
CORS(app)
os.makedirs("logs", exist_ok=True)
# ✅ Configure logging
logging.basicConfig(
    filename='logs/order_processor.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger()

# ✅ Load Scenario Config
scenario_config = {}
try:
    with open('scenario_config.json') as f:
        scenario_config = json.load(f)
    logger.info("Loaded scenario config")
except Exception as e:
    logger.error(f"Could not load scenario_config.json: {e}")

# ✅ Database connection with retry logic
conn = None
for attempt in range(10):
    try:
        conn = psycopg2.connect(
            host=os.environ.get("PGHOST", "localhost"),
            port=os.environ.get("PGPORT", "5432"),
            database=os.environ.get("PGDATABASE", "emartdb"),
            user=os.environ.get("PGUSER", "emartuser"),
            password=os.environ.get("PGPASSWORD", "emartpass")
        )
        logger.info("Connected to Postgres")
        break
    except psycopg2.OperationalError as e:
        logger.warning(f"Attempt {attempt+1}/10: Waiting for Postgres... {e}")
        time.sleep(3)
else:
    logger.critical("Could not connect to Postgres after 10 attempts")
    raise Exception("Could not connect to Postgres after 10 attempts")

# ✅ Create users table and seed it
cursor = conn.cursor()
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(100),
    kyc_verified BOOLEAN DEFAULT FALSE,
    balance NUMERIC DEFAULT 0.0
)
""")
# ✅ Idempotent user seeding
users_to_seed = [
    ('u1', 'Alice', 'ignio1.platformtesting@ext.digitate.com', 'pass123', True, 50000),
    ('u2', 'Bob', 'ignio1.platformtesting@ext.digitate.com', 'pass123', False, 20000),
    ('u3', 'Charlie', 'ignio1.platformtesting@ext.digitate.com', 'pass123', True, 8000),
    ('user4', 'David', 'ignio1.platformtesting@ext.digitate.com', 'pass123', True, 15000),
    ('user5', 'Eva', 'ignio1.platformtesting@ext.digitate.com', 'pass123', True, 20000),
    ('user6', 'Frank', 'ignio1.platformtesting@ext.digitate.com', 'pass123', False, 5000),
    ('user7', 'Grace', 'ignio1.platformtesting@ext.digitate.com', 'pass123', True, 30000)
]

for user in users_to_seed:
    cursor.execute("SELECT 1 FROM users WHERE id = %s", (user[0],))
    if cursor.fetchone() is None:
        cursor.execute("""
            INSERT INTO users (id, name, email, password, kyc_verified, balance)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, user)
        logger.info(f"Seeded user: {user[0]}")
    else:
        logger.info(f"User already exists: {user[0]}")

conn.commit()
cursor.close()
logger.info("User seeding complete")


# ✅ Health check
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200

# ✅ User Login Route (return email if valid)
@app.route("/validateuser", methods=["POST"])
def validate_user():
    data = request.json
    user_id = data.get("user_id")
    password = data.get("password")

    # 🔥 Check scenario for login_delay
    scenario = scenario_config.get(user_id)
    if scenario == "login_delay":
        logger.info(f"Simulating login delay for {user_id}")
        time.sleep(5)  # Simulate 5-second delay

    cursor = conn.cursor()
    cursor.execute("SELECT email FROM users WHERE id = %s AND password = %s", (user_id, password))
    user = cursor.fetchone()
    cursor.close()

    if user:
        email = user[0]
        logger.info(f"VALIDATE: {user_id} -> FOUND (email: {email})")
        return jsonify({"status": "success", "user": user_id, "email": email})
    else:
        logger.warning(f"VALIDATE: {user_id} -> NOT FOUND")
        return jsonify({"status": "failed"}), 401

# ✅ Compliance check fetch: Get KYC and balance
@app.route("/userdetails/<user_id>", methods=["GET"])
def get_user_details(user_id):
    cursor = conn.cursor()
    cursor.execute("SELECT kyc_verified, balance FROM users WHERE id = %s", (user_id,))
    result = cursor.fetchone()
    cursor.close()

    if result:
        kyc, balance = result
        logger.info(f"Fetched user details for {user_id}")
        return jsonify({
            "user_id": user_id,
            "kyc_verified": kyc,
            "balance": float(balance)
        })
    else:
        logger.error(f"User not found: {user_id}")
        return jsonify({"error": "User not found"}), 404

# ✅ Submit Order Route with retry logic for Java Ledger
@app.route("/submitorder", methods=["POST"])
def submit_order():
    data = request.json
    user_id = data.get("user_id")
    items = data.get("items", [])
    total_amount = data.get("total", 0.0)

    if not user_id or not items:
        logger.warning("Submit Order: Missing user_id or items")
        return jsonify({"status": "failed", "message": "Missing user_id or items"}), 400

    LEDGER_URL = os.environ.get("LEDGER_URL", "http://ledger-service-java:8080")
    success_count = 0

    for item in items:
        payload = {
            "user_id": user_id,
            "product_id": str(item.get("product_id")),
            "name": item.get("name"),
            "quantity": item.get("quantity", 1),
            "price": item.get("price", 0.0),
            "total_amount": total_amount
        }

        for attempt in range(3):
            try:
                response = requests.post(f"{LEDGER_URL}/record", json=payload, timeout=5)
                logger.info(f"Attempt {attempt+1} → Status: {response.status_code}, Response: {response.text}")
                if response.ok:
                    success_count += 1
                    break
                else:
                    logger.warning(f"Ledger error on attempt {attempt+1}: {response.status_code} - {response.text}")
            except Exception as e:
                logger.error(f"Ledger request failed (attempt {attempt+1}): {e}")
            time.sleep(2 ** attempt)  # exponential backoff: 1s, 2s, 4s

    status_msg = f"{success_count}/{len(items)} items recorded"
    logger.info(f"Submit Order Result for {user_id}: {status_msg}")
    return jsonify({
        "status": "success" if success_count == len(items) else "partial",
        "message": status_msg
    }), 200 if success_count > 0 else 500

# ✅ Start Flask
if __name__ == "__main__":
    logger.info("Starting Flask on port 5002")
    app.run(host="0.0.0.0", port=5002)
