const pool = require("../utils/db");

const findLeadersByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: "Name parameter is required" });
    }

    const query = `
      SELECT name, designation, profile_image_url, region_type
      FROM all_leaders
      WHERE name ILIKE $1
    `;

    const result = await pool.query(query, [`%${name}%`]);
        // Add slug to each result
    const representatives = result.rows.map((leader) => ({
      ...leader,
      slug: leader.name.toLowerCase().replace(/\s+/g, '-')
    }));

     return res.status(200).json({ representatives });
  } catch (error) {
    console.error("Error fetching leaders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
module.exports = { findLeadersByName };