const pool = require("../utils/db");

const getNationalHierarchy = async (req, res) => {
  try {
    const { country, state, city, ward_number } = req.query;

    // === 1. VALIDATION ===
    if (country && country.toLowerCase() !== "india") {
      return res
        .status(400)
        .json({ error: "Currently, data is available only for India." });
    }

    if (state && state.toLowerCase() !== "madhya pradesh") {
      return res.status(400).json({
        error: "Currently, data is only available for Madhya Pradesh.",
      });
    }

    if (city && city.toLowerCase() !== "bhopal") {
      return res
        .status(400)
        .json({ error: "Currently, data is only available for Bhopal city." });
    }

    let response = {};

    // === 2. NATIONAL LEVEL ===
    const nationalResult = await pool.query(`
      SELECT * FROM all_leaders
      WHERE region_type = 'national'
      ORDER BY COALESCE(display_order, 999999), id
    `);
    response.national = {
      level: "National Level",
      hierarchy: buildHierarchy(nationalResult.rows),
    };

    // === 3. STATE LEVEL ===
    if (
      state?.toLowerCase() === "madhya pradesh" ||
      city?.toLowerCase() === "bhopal" ||
      ward_number
    ) {
      const stateResult = await pool.query(`
  SELECT al.*
  FROM all_leaders al
  JOIN states s ON al.state_id = s.id
  WHERE al.region_type = 'state' AND LOWER(s.name) = 'madhya pradesh'
  ORDER BY COALESCE(al.display_order, 999999), al.id
`);

      const stateHierarchy = buildHierarchy(stateResult.rows);
      response.state = {
        level: "State Level",
        hierarchy: stateHierarchy,
      };
    }

    // === 4. LOCAL LEVEL ===
if (city?.toLowerCase() === "bhopal") {
  const cityIdResult = await pool.query(
    `SELECT id FROM cities WHERE LOWER(name) = $1`,
    [city.toLowerCase()]
  );

  if (cityIdResult.rows.length === 0) {
    return res.status(400).json({ error: `City '${city}' not found.` });
  }

  const cityId = cityIdResult.rows[0].id;

  if (ward_number) {
    // Get ward info
    const wardResult = await pool.query(
      `SELECT * FROM wards WHERE ward_number = $1 AND city_id = $2`,
      [ward_number, cityId]
    );

    if (wardResult.rows.length === 0) {
      return res
        .status(400)
        .json({ error: `Ward number ${ward_number} not found in Bhopal.` });
    }

    const ward = wardResult.rows[0];
    const constituencyId = ward.constituency_id;

    // Get MLA for this constituency
    const mlaResult = await pool.query(
      `
      SELECT al.*, co.name AS constituency_name
      FROM all_leaders al
      LEFT JOIN constituencies co ON al.constituency_id = co.id
      WHERE al.constituency_id = $1
        AND LOWER(al.designation) = 'mla'
      LIMIT 1
      `,
      [constituencyId]
    );

    const localHierarchy = [];

    if (mlaResult.rows.length > 0) {
      const mla = mlaResult.rows[0];

      // Get MLA's children (e.g., deputy leaders, assistants)
      const mlaChildrenResult = await pool.query(
        `
        SELECT *
        FROM all_leaders
        WHERE parent_id = $1
        ORDER BY COALESCE(display_order, 999999), id
        `,
        [mla.id]
      );

      mla.children = mlaChildrenResult.rows || [];
      localHierarchy.push(mla);
    }

    // Ward Councillor
    localHierarchy.push({
      id: null,
      name: ward.ward_councillor,
      designation: `Ward Councillor - Ward ${ward.ward_number}`,
      children: [],
    });

    response.local = {
      level: "Local Level",
      hierarchy: localHierarchy,
      constituency_name:
        mlaResult.rows[0]?.constituency_name || "Assembly Constituency",
    };

  } else {
    // No ward number → existing behaviour (all MLAs + other city leaders)
    const localResult = await pool.query(
      `
      SELECT al.*, co.name AS constituency_name
      FROM all_leaders al
      LEFT JOIN constituencies co ON al.constituency_id = co.id
      WHERE al.region_type = 'city' AND al.city_id = $1
      ORDER BY COALESCE(al.display_order, 999999), al.id
      `,
      [cityId]
    );

    const localHierarchy = buildHierarchy(localResult.rows);

    response.local = {
      level: "Local Level",
      hierarchy: localHierarchy,
    };
  }
}

    return res.json(response);
  } catch (error) {
    console.error("Error building hierarchy:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// === Utility: Build hierarchy tree ===
function buildHierarchy(leaders) {
  const map = new Map();
  leaders.forEach((leader) => {
    leader.children = [];
    map.set(leader.id, leader);
  });

  const roots = [];
  leaders.forEach((leader) => {
    if (leader.parent_id === null) {
      roots.push(leader);
    } else {
      const parent = map.get(leader.parent_id);
      if (parent) {
        parent.children.push(leader);
      }
    }
  });

  sortByDisplayOrder(roots);
  return roots;
}

function sortByDisplayOrder(nodes) {
  nodes.sort((a, b) => {
    const aOrder = a.display_order ?? 999999;
    const bOrder = b.display_order ?? 999999;
    return aOrder - bOrder;
  });
  nodes.forEach((node) => {
    if (node.children.length > 0) {
      sortByDisplayOrder(node.children);
    }
  });
}

module.exports = { getNationalHierarchy };
