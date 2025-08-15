const pool = require("../utils/db");

const findLeaderByRegionType = async (req, res) => {
  try {
    let { name } = req.query;

    // Replace hyphens with spaces, and decode any URI encoding
    name = decodeURIComponent(name).replace(/-/g, " ");

    if (!name) {
      return res.status(400).json({ error: "Name parameter is required" });
    }

    const query = `
      SELECT name, designation, profile_image_url, region_type
      FROM all_leaders
      WHERE name ILIKE $1
    `;

    const result = await pool.query(query, [`%${name}%`]);

    const national = [];
    const state = [];
    const local = [];

    result.rows.forEach((leader) => {
      const { name, designation, profile_image_url, region_type } = leader;

      if (region_type === "national") {
        national.push({ name, designation, profile_image_url, region_type });
      } else if (region_type === "state") {
        state.push({ name, designation, profile_image_url, region_type });
      } else if (region_type === "city") {
        local.push({ name, designation, profile_image_url, region_type });
      }
    });

    return res.status(200).json({
      "National Level": national,
      "State Level": state,
      "Local Level": local,
    });
  } catch (error) {
    console.error("Error finding leader by region:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { findLeaderByRegionType };
