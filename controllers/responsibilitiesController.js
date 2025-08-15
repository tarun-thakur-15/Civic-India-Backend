const pool = require("../utils/db");

const getResponsibilitiesBySlug = async (req, res) => {
  const { slug } = req.params;

  try {
    const query = `
      SELECT
        lr.responsibility,
        lr.description,
        lr.description_2,
        lr.description_3
      FROM all_leaders al
      JOIN designations d ON al.designation = d.title
      JOIN leaders_responsibilities lr ON lr.designation_id = d.id
      WHERE LOWER(REPLACE(al.name, ' ', '-')) = $1
    `;

    const { rows } = await pool.query(query, [slug]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No responsibilities found for this leader." });
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching responsibilities:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getResponsibilitiesBySlug };
