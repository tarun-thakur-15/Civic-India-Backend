const pool = require("../utils/db");

exports.getLeaderFinancials = async (req, res) => {
  try {
    let { slug } = req.params;

    // Convert slug to name
    let name = decodeURIComponent(slug).replace(/-/g, " ");

    const query = `
      SELECT 
        name,
        networth,
        assets,
        liabilities,
        salary
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
    console.error("Error fetching leader financials:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
