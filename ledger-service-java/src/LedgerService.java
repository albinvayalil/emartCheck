import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory; // ✅ Added logger

public class LedgerService {
    private static final Logger logger = LoggerFactory.getLogger(LedgerService.class); // ✅ Logger instance

    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        server.createContext("/record", new OrderHandler());
        server.setExecutor(null); // creates a default executor
        logger.info("🚀 Ledger service running on port 8080");
        server.start();
    }

    static class OrderHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(405, -1); // Method Not Allowed
                return;
            }

            InputStream is = exchange.getRequestBody();
            StringBuilder body = new StringBuilder();
            BufferedReader reader = new BufferedReader(new InputStreamReader(is));
            String line;
            while ((line = reader.readLine()) != null) {
                body.append(line);
            }

            try {
                JSONObject json = new JSONObject(body.toString());

                String user_id = String.valueOf(json.get("user_id"));
                String product_id = String.valueOf(json.get("product_id"));
                String name = json.getString("name");
                int quantity = json.getInt("quantity");
                double price = json.getDouble("price");
                double total_amount = json.getDouble("total_amount");

                logger.info("📥 Received order for user: {} → {} × {}", user_id, name, quantity);

                String host = System.getenv().getOrDefault("PGHOST", "localhost");
                String port = System.getenv().getOrDefault("PGPORT", "5432");
                String db = System.getenv().getOrDefault("PGDATABASE", "emartdb");
                String user = System.getenv().getOrDefault("PGUSER", "emartuser");
                String password = System.getenv().getOrDefault("PGPASSWORD", "emartpass");

                String url = "jdbc:postgresql://" + host + ":" + port + "/" + db;
                logger.info("🔗 Connecting to DB: {}", url);

                Connection conn = DriverManager.getConnection(url, user, password);
                logger.info("✅ Connected to Postgres from Java");

                // Ensure table exists
                Statement tableCheck = conn.createStatement();
                tableCheck.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS orders (
                        id SERIAL PRIMARY KEY,
                        user_id TEXT,
                        product_id TEXT,
                        name TEXT,
                        quantity INTEGER,
                        price NUMERIC,
                        total_amount NUMERIC,
                        order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """);
                logger.info("🛠️ Orders table ensured");

                // Insert order
                PreparedStatement stmt = conn.prepareStatement("""
                    INSERT INTO orders (user_id, product_id, name, quantity, price, total_amount)
                    VALUES (?, ?, ?, ?, ?, ?)
                """);
                stmt.setString(1, user_id);
                stmt.setString(2, product_id);
                stmt.setString(3, name);
                stmt.setInt(4, quantity);
                stmt.setDouble(5, price);
                stmt.setDouble(6, total_amount);

                int inserted = stmt.executeUpdate();
                logger.info("✅ Inserted rows: {}", inserted);

                stmt.close();
                conn.close();

                String response = "✅ Order recorded";
                byte[] responseBytes = response.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, responseBytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(responseBytes);
                os.close();

            } catch (Exception e) {
                logger.error("❌ Exception occurred while processing order", e);

                String response = "❌ Error: " + e.getMessage();
                byte[] responseBytes = response.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(500, responseBytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(responseBytes);
                os.close();
            }
        }
    }
}
