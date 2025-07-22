const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const nodemailer = require('nodemailer');
const winston = require('winston'); // ✅ Added Winston for logging

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Setup Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(), // Logs to console
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

// ✅ Load Scenario Config
let scenarioConfig = {};
try {
    scenarioConfig = JSON.parse(fs.readFileSync('./scenario_config.json'));
    logger.info("Loaded scenario config");
} catch (err) {
    logger.error(`Could not load scenario_config.json: ${err.message}`);
}

// ✅ Helper: Get scenario for a user
function getScenario(user_id) {
    return scenarioConfig[user_id] || "normal_flow";
}

// ✅ In-memory OTP store
const otpStore = {};

// ✅ Configure nodemailer transporter for Office365 SMTP
const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
        user: 'ignio1.platformtesting@ext.digitate.com', // 🔥 Replace with your Office365 email
        pass: 'Ignio@12345' // 🔥 Replace with app password if MFA enabled
    }
});

// ✅ Send OTP Route (validate user + send OTP to registered email)
app.post("/send-otp", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        logger.warn("Send OTP: Username and password missing");
        return res.status(400).json({ message: "Username and password are required" });
    }

    try {
        // ✅ Step 1: Validate credentials
        const validationResponse = await axios.post("http://order-processor-python:5002/validateuser", {
            user_id: username,
            password: password
        });

        if (validationResponse.data.status !== "success") {
            logger.warn(`Invalid credentials for ${username}`);
            return res.status(401).json({ message: "Invalid username or password" });
        }

        // ✅ Step 2: Get registered email
        const registeredEmail = validationResponse.data.email;
        if (!registeredEmail) {
            logger.error(`No registered email found for user ${username}`);
            return res.status(404).json({ message: "Registered email not found" });
        }

        // ✅ Step 3: Generate OTP and send email
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[username] = otp;

        await transporter.sendMail({
            from: '"eMart OTP" <ignio1.platformtesting@ext.digitate.com>',
            to: registeredEmail,
            subject: "Your eMart OTP",
            text: `Hello ${username},\n\nYour OTP is: ${otp}. It will expire in 5 minutes.\n\nThank you,\neMart Team`
        });

        logger.info(`Sent OTP ${otp} to ${registeredEmail} for user ${username}`);
        res.json({ message: "OTP sent to your registered email" });
    } catch (error) {
        logger.error(`Error in send-otp: ${error.message}`);
        res.status(500).json({ message: "Failed to send OTP" });
    }
});

// ✅ Verify OTP Route
app.post("/verify-otp", (req, res) => {
    const { username, otp } = req.body;
    if (!username || !otp) {
        logger.warn("Verify OTP: Username and OTP missing");
        return res.status(400).json({ message: "Username and OTP are required" });
    }

    const storedOtp = otpStore[username];
    if (storedOtp === otp) {
        delete otpStore[username];
        logger.info(`OTP verified for user ${username}`);
        return res.json({ message: "OTP verified successfully" });
    } else {
        logger.warn(`Invalid OTP for user ${username}`);
        return res.status(400).json({ message: "Invalid OTP" });
    }
});

// 🔥 EXISTING ROUTES BELOW 🔥

app.post("/login", async (req, res) => {
    try {
        const response = await axios.post("http://order-processor-python:5002/validateuser", req.body);
        logger.info(`Login success for user ${req.body.user_id}`);
        res.json(response.data);
    } catch (error) {
        logger.error(`Login error: ${error.message}`);
        res.status(401).json({ message: "Login failed" });
    }
});

app.get("/products", async (req, res) => {
    try {
        const response = await axios.get("http://order-processor-python:5002/products");
        logger.info("Fetched product list");
        res.json(response.data);
    } catch (error) {
        logger.error(`Product fetch error: ${error.message}`);
        res.status(500).json({ message: "Could not fetch products" });
    }
});

app.post("/submitorder", async (req, res) => {
    const user_id = req.body.user_id;
    const scenario = getScenario(user_id);

    if (scenario === "payment_slow") {
        logger.info(`Simulating payment slowness for ${user_id}`);
        await new Promise(resolve => setTimeout(resolve, 7000));
    }

    try {
        const { user_id, items, total } = req.body;

        if (!user_id || !Array.isArray(items) || items.length === 0 || typeof total !== 'number') {
            logger.warn("Submit order: Missing or invalid fields");
            return res.status(400).json({ message: "Missing or invalid order fields" });
        }

        const response = await axios.post("http://order-processor-python:5002/submitorder", req.body);
        logger.info(`Order submitted for user: ${user_id}`);
        res.json(response.data);
    } catch (error) {
        logger.error(`Submit order error: ${error.message}`);
        res.status(500).json({ message: "Could not submit order" });
    }
});

app.post('/initiatepayment', async (req, res) => {
    const { user_id, amount, items } = req.body;
    const scenario = getScenario(user_id);

    if (scenario === "payment_slow") {
        logger.info(`Simulating payment slowness for ${user_id}`);
        await new Promise(resolve => setTimeout(resolve, 9000));
    }

    if (scenario === "gateway_timeout") {
        logger.error(`Simulating gateway timeout for ${user_id}`);
        return res.status(504).json({ error: "Gateway Timeout" });
    }

    try {
        const complianceResponse = await axios.post('http://compliance:80/ComplianceCheck', {
            id: user_id,
            cartTotal: amount
        });

        if (complianceResponse.data.status !== 'Approved') {
            logger.warn(`Compliance check failed for ${user_id}`);
            return res.status(400).json({
                error: 'Compliance check failed',
                reason: complianceResponse.data.reason || 'Unknown compliance failure'
            });
        }

        logger.info(`Compliance approved for user: ${user_id}`);

        const submitOrderResponse = await axios.post("http://order-processor-python:5002/submitorder", {
            user_id,
            items,
            total: amount
        });

        logger.info(`Order submitted for user: ${user_id}`);
        return res.json({
            message: 'Payment and order successful',
            compliance: complianceResponse.data,
            order: submitOrderResponse.data
        });

    } catch (error) {
        logger.error(`Payment/Order error: ${error.message}`);
        const fallback = error?.response?.data?.reason || error?.response?.data?.error || 'Payment/Order processing failed';
        return res.status(500).json({ error: fallback });
    }
});

app.listen(3001, () => logger.info('API Gateway running on port 3001'));
