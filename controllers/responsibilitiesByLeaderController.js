const pool = require("../utils/db");

exports.getResponsibilitiesByLeader = async (req, res) => {
  try {
    let { slug } = req.params;

    // Step 1: Convert slug to readable name
    let name = decodeURIComponent(slug).replace(/-/g, " ");

    // Step 2: Find designation(s) for that leader from all_leaders
    const leaderQuery = `
      SELECT DISTINCT designation
      FROM all_leaders
      WHERE LOWER(name) LIKE LOWER($1)
    `;
    const leaderResult = await pool.query(leaderQuery, [`%${name}%`]);

    // If no leader found → return empty data, not error
    if (leaderResult.rows.length === 0) {
      return res.json({
        leader_name: name,
        data: [],
      });
    }

    let responsibilitiesData = [];

    // Step 3: For each designation, find its ID in designations table
    for (const row of leaderResult.rows) {
      const designationTitle = row.designation;

      const designationQuery = `
        SELECT id
        FROM designations
        WHERE title = $1
        LIMIT 1
      `;
      const designationResult = await pool.query(designationQuery, [designationTitle]);

      if (designationResult.rows.length === 0) {
        continue; // No matching designation in designations table
      }

      const designationId = designationResult.rows[0].id;

      // Step 4: Get responsibilities from leaders_responsibilities
      const respQuery = `
        SELECT 
          responsibility,
          description,
          description_2,
          description_3
        FROM leaders_responsibilities
        WHERE designation_id = $1
        ORDER BY id
      `;
      const respResult = await pool.query(respQuery, [designationId]);

      responsibilitiesData.push({
        designation: designationTitle,
        responsibilities: respResult.rows || [],
      });
    }

    // If we found leader but no responsibilities → return empty array
    if (responsibilitiesData.every(d => d.responsibilities.length === 0)) {
      return res.json({
        leader_name: name,
        data: [],
      });
    }

    // Step 5: Return response
    res.json({
      leader_name: name,
      data: responsibilitiesData,
    });

  } catch (error) {
    console.error("Error fetching leader responsibilities:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
