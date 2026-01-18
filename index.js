// index.js
const express = require('express');
const app = express();
const cors = require("cors");
const hierarchyRoutes = require('./routes/routes');
const allowedOrigins = [
  "http://localhost:3000",                 
  "https://civic-india-frontend-beta.vercel.app",
];
const PORT = process.env.PORT || 8000;

require("dotenv").config();

// Middlewares
app.use(express.json());
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// Routes
app.use('/api', hierarchyRoutes);

// Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Error occurred:", err.stack || err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
