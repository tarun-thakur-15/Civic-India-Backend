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
require("./cron/newsCron"); // this line will start the cron job


app.use(express.json());
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use('/api', hierarchyRoutes);

app.listen(PORT, () => {
  console.log('Server running on port 8000');
});

app.use((err, req, res, next) => {
  console.error("❌ Error occurred:", err.stack || err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});