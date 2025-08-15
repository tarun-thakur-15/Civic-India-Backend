// index.js
const express = require('express');
const app = express();
const cors = require("cors");
const hierarchyRoutes = require('./routes/routes');
const allowedOrigins = [
  "http://localhost:3000",                 
  "https://civic-india-frontend-beta.vercel.app",
];

require("dotenv").config();
require("./cron/newsCron"); // this line will start the cron job


app.use(express.json());
app.use(cors());
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

app.listen(8000, () => {
  console.log('Server running on port 8000');
});
