const pool = require("../utils/db");

const getNewsByPersonSlug = async (req, res) => {
  const { slug } = req.params;

  try {
    const query = `
      SELECT id, title, description, publisher_name, url, published_at, ai_summary
      FROM news_posts
      WHERE person_slug = $1
      ORDER BY published_at DESC
      LIMIT 20
    `;
    const { rows } = await pool.query(query, [slug]);
    res.json(rows);
  } catch (err) {
    console.error("News fetch error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { getNewsByPersonSlug };
