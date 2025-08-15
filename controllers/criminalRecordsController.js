const pool = require("../utils/db");

// Convert slug into a clean comparable name
function slugToName(slug) {
  return slug
    .replace(/-/g, " ")
    .replace(/%20/g, " ")
    .trim()
    .toLowerCase();
}

exports.getCriminalRecordsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const formattedSlug = slugToName(slug);

    // Find leader_id based on name match in all_leaders table
    const leaderResult = await pool.query(
      "SELECT id, name FROM all_leaders WHERE LOWER(name) ILIKE $1",
      [`%${formattedSlug}%`]
    );

    if (leaderResult.rows.length === 0) {
      return res.status(404).json({ error: "Leader not found" });
    }

    const leaderId = leaderResult.rows[0].id;

    // Get criminal records for the leader_id
    const recordsResult = await pool.query(
      `SELECT description, under_section, status 
       FROM criminal_records 
       WHERE leader_id = $1`,
      [leaderId]
    );

    if (recordsResult.rows.length === 0) {
      return res.json({
        leader: leaderResult.rows[0].name,
        criminal_records: [],
        message: "No criminal records found for this leader."
      });
    }

    res.json({
      leader: leaderResult.rows[0].name,
      criminal_records: recordsResult.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
