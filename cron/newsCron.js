const cron = require("node-cron");
const axios = require("axios");
const pool = require("../utils/db");
const generateSummary = require("../utils/gemini"); // from Step 2

const NEWS_API_KEY = "pub_e33559e71a1b4dd58092bbcb00263998";

const leaders = [
  { name: "Narendra Modi", slug: "narendra-modi" },
  { name: "Amit Shah", slug: "amit-shah" },
  { name: "Rahul Gandhi", slug: "rahul-gandhi" },
  // Add more leaders here
];

const fetchAndSaveNews = async () => {
  console.log("📰 Starting News Fetch Job...");

  for (const leader of leaders) {
    try {
      const response = await axios.get("https://newsdata.io/api/1/news", {
        params: {
          apikey: NEWS_API_KEY,
          q: leader.name,
          language: "en",
          country: "in",
          size: 5,
        },
      });

      const articles = response.data.results || [];

      for (const article of articles) {
        const {
          title,
          description,
          source_id: publisher_name,
          pubDate,
          link,
          content,
        } = article;

        // Skip if already exists in DB
        const check = await pool.query(
          `SELECT id FROM news_posts WHERE url = $1`,
          [link]
        );
        if (check.rows.length > 0) continue;

        // Use content/description to generate AI Summary
        const summary = await generateSummary(content || description || title);

        // Insert into DB
await pool.query(
  `INSERT INTO news_posts 
    (person_slug, title, description, publisher_name, published_at, url, ai_summary, related_to)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
  [leader.slug, title, description, publisher_name, pubDate, link, summary, leader.name]
);

      }
    } catch (err) {
      console.error(`Error fetching news for ${leader.name}:`, err.message);
        // 🔁 Fallback to hardcoded summary
    return "This is a fallback summary. AI-based summary couldn't be generated at the moment.";
    }
  }

  console.log("✅ News Fetch Job Complete.");
};

// Schedule it to run every day at 7 AM
cron.schedule("0 7 * * *", fetchAndSaveNews);

module.exports = fetchAndSaveNews;
