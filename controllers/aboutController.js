const pool = require("../utils/db");

const getLeaderAbout = async (req, res) => {
  try {
    let { slug } = req.params;

    // Convert slug to name (replace hyphens with spaces and decode URI)
    let name = decodeURIComponent(slug).replace(/-/g, " ");

    // SQL query
    const query = `
      SELECT 
        name, 
        profile_image_url, 
        designation, 
        about, 
        salary, 
        website_url
      FROM all_leaders
      WHERE LOWER(name) LIKE LOWER($1)
      LIMIT 1;
    `;

    const result = await pool.query(query, [`%${name}%`]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Leader not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching leader about info:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
module.exports = { getLeaderAbout };