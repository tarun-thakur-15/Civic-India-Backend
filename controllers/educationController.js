// controllers/educationController.js
const pool = require("../utils/db");

// Utility: convert slug variations to possible name matches
const slugToNameVariants = (slug) => {
  // decode URI (to handle %20, etc.)
  const decoded = decodeURIComponent(slug);

  // remove extra dashes, turn into spaces
  const withSpaces = decoded.replace(/-/g, " ");

  // Capitalize first letters (optional, depends on how names are stored in DB)
  const normalized = withSpaces
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return [decoded, withSpaces, normalized];
};

const getEducationRecords = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: "Slug is required" });
    }

    const nameVariants = slugToNameVariants(slug);

    const query = `
      SELECT name, education 
      FROM all_leaders 
      WHERE LOWER(name) = ANY($1::text[])
      LIMIT 1;
    `;

    const values = [nameVariants.map((n) => n.toLowerCase())];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Education record not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching education record:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { getEducationRecords };
