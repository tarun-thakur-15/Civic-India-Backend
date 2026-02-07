const pool = require("../utils/db");
const SUPPORTED_STATES = ["madhya pradesh", "telangana", "gujarat"];
const getNationalHierarchy = async (req, res) => {
  try {
    const { country, state, city, ward, pincode } = req.query;

    // === 1. VALIDATION ===
    if (country && country.toLowerCase() !== "india") {
      return res
        .status(400)
        .json({ error: "Currently, data is available only for India." });
    }

    if (state && !SUPPORTED_STATES.includes(state.toLowerCase())) {
      return res.status(400).json({
        error: "Currently, data is only available for supported states.",
      });
    }

    if (city) {
      const cityCheck = await pool.query(
        `SELECT id FROM cities WHERE LOWER(name) = $1`,
        [city.toLowerCase()],
      );

      if (cityCheck.rows.length === 0) {
        return res.status(400).json({
          error: `Currently, data is only available for Bhopal, Indore, Hyderabad and Ahmedabad cities, City '${city}' not supported.`,
        });
      }
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
    const cityToStateMap = {
      bhopal: "madhya pradesh",
      indore: "madhya pradesh",
      hyderabad: "telangana",
      ahmedabad: "gujarat",
    };
    const normalizedCity = city?.toLowerCase();
    const targetState = state?.toLowerCase() || cityToStateMap[normalizedCity];

    // if (targetState || ward || pincode)
if (targetState) {

  // 1️⃣ Get state id + proper formatted name
  const stateInfo = await pool.query(
    `SELECT id, name FROM states WHERE LOWER(name) = $1`,
    [targetState]
  );

  if (stateInfo.rows.length === 0) {
    return res.status(400).json({ error: `State '${targetState}' not found.` });
  }

  const stateId = stateInfo.rows[0].id;
  const stateName = stateInfo.rows[0].name;

  // 2️⃣ Fetch leaders using state_id (faster + cleaner than JOIN)
  const stateResult = await pool.query(
    `
    SELECT *
    FROM all_leaders
    WHERE region_type = 'state'
    AND state_id = $1
    ORDER BY COALESCE(display_order, 999999), id
    `,
    [stateId]
  );

  const stateHierarchy = buildHierarchy(stateResult.rows);

  // 3️⃣ Add state_name in response
  response.state = {
    level: "State Level",
    state_name: stateName,  // ⭐ NEW FIELD
    hierarchy: stateHierarchy,
  };
}


    // === 4. LOCAL LEVEL ===
    if (cityToStateMap[normalizedCity] || pincode) {
      let cityId;
      let cityName;

      if (cityToStateMap[normalizedCity]) {
        const cityIdResult = await pool.query(
          `SELECT id, name FROM cities WHERE LOWER(name) = $1`,
          [city.toLowerCase()],
        );

        if (cityIdResult.rows.length === 0) {
          return res.status(400).json({ error: `City '${city}' not found.` });
        }
        cityId = cityIdResult.rows[0].id;
        cityName = cityIdResult.rows[0].name;
      } else if (pincode) {
        const pincodeCityResult = await pool.query(
          `
    SELECT c.id, c.name
    FROM pincode_wards pw
    JOIN wards w ON pw.ward_id = w.id
    JOIN cities c ON w.city_id = c.id
    WHERE pw.pincode = $1
    LIMIT 1
    `,
          [pincode],
        );

        if (pincodeCityResult.rows.length === 0) {
          return res
            .status(400)
            .json({ error: `Pincode ${pincode} not found.` });
        }

        cityId = pincodeCityResult.rows[0].id;
        cityName = pincodeCityResult.rows[0].name;
      }

      // === PINCODE LOGIC ===
      if (pincode) {
        // Get constituency_id from pincode_wards table
        const pincodeResult = await pool.query(
          `SELECT constituency_id FROM pincode_wards WHERE pincode = $1`,
          [pincode],
        );

        if (pincodeResult.rows.length === 0) {
          return res.status(400).json({
            error: `Pincode ${pincode} not found in Bhopal, Indore, Hyderabad or Ahmedabad.`,
          });
        }

        const constituencyId = pincodeResult.rows[0].constituency_id;

        // Get constituency name
        const constituencyResult = await pool.query(
          `SELECT name FROM constituencies WHERE id = $1`,
          [constituencyId],
        );

        const constituencyName =
          constituencyResult.rows.length > 0
            ? constituencyResult.rows[0].name
            : "Unknown Constituency";

        // Get MLA for this constituency
        const mlaResult = await pool.query(
          `
          SELECT al.*
          FROM all_leaders al
          WHERE al.constituency_id = $1
            AND LOWER(al.designation) = 'mla'
          LIMIT 1
          `,
          [constituencyId],
        );

        // Get only non-MLA city-level leaders (BMC hierarchy, but exclude MLAs)
        const cityLeadersResult = await pool.query(
          `
          SELECT al.*, co.name AS constituency_name
          FROM all_leaders al
          LEFT JOIN constituencies co ON al.constituency_id = co.id
          WHERE al.region_type = 'city' AND al.city_id = $1
            AND LOWER(al.designation) != 'mla'
          ORDER BY COALESCE(al.display_order, 999999), al.id
          `,
          [cityId],
        );

        // Build city hierarchy (BMC, Mayor, etc. - excluding MLAs)
        const cityHierarchy = buildHierarchy(cityLeadersResult.rows);

        // Create local hierarchy starting with city leaders (non-MLAs)
        const localHierarchy = [...cityHierarchy];

        // Add MLA if found
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
            [mla.id],
          );

          mla.children = mlaChildrenResult.rows || [];
          localHierarchy.push(mla);
        }

        // Fetch ward details using ward number coming from request
        const wardResult = await pool.query(
          `SELECT * FROM wards WHERE ward_number = $1 AND city_id = $2`,
          [ward, cityId],
        );

        if (wardResult.rows.length > 0) {
          const wardData = wardResult.rows[0];

          // Add Ward Councillor just like ward-branch
          localHierarchy.push({
            id: null,
            name: wardData.ward_councillor,
            designation: `Ward Councillor - Ward ${wardData.ward_number}`,
            children: [],
          });

          // Also attach in response object
          response.local = {
            level: "Local Level",
            city_name: cityName,
            hierarchy: localHierarchy,
            constituency_name: constituencyName,
            pincode: pincode,
            ward_number: wardData.ward_number,
            ward_councillor: wardData.ward_councillor,
          };
        } else {
          // fallback if ward not found
          response.local = {
            level: "Local Level",
            city_name: cityName,
            hierarchy: localHierarchy,
            constituency_name: constituencyName,
            pincode: pincode,
          };
        }
      } else if (ward) {
        // === WARD LOGIC (existing) ===
        const wardResult = await pool.query(
          `SELECT * FROM wards WHERE ward_number = $1 AND city_id = $2`,
          [ward, cityId],
        );

        if (wardResult.rows.length === 0) {
          return res
            .status(400)
            .json({ error: `Ward number ${ward} not found.` });
        }

        const wardData = wardResult.rows[0];
        const constituencyId = wardData.constituency_id;

        // Get constituency name
        const constituencyResult = await pool.query(
          `SELECT name FROM constituencies WHERE id = $1`,
          [constituencyId],
        );

        const constituencyName =
          constituencyResult.rows.length > 0
            ? constituencyResult.rows[0].name
            : "Unknown Constituency";

        // Get MLA for this constituency
        const mlaResult = await pool.query(
          `
          SELECT al.*
          FROM all_leaders al
          WHERE al.constituency_id = $1
            AND LOWER(al.designation) = 'mla'
          LIMIT 1
          `,
          [constituencyId],
        );

        // Get only non-MLA city-level leaders (BMC hierarchy, but exclude MLAs)
        const cityLeadersResult = await pool.query(
          `
          SELECT al.*, co.name AS constituency_name
          FROM all_leaders al
          LEFT JOIN constituencies co ON al.constituency_id = co.id
          WHERE al.region_type = 'city' AND al.city_id = $1
            AND LOWER(al.designation) != 'mla'
          ORDER BY COALESCE(al.display_order, 999999), al.id
          `,
          [cityId],
        );

        // Build city hierarchy (BMC, Mayor, etc. - excluding MLAs)
        const cityHierarchy = buildHierarchy(cityLeadersResult.rows);

        // Create local hierarchy starting with city leaders (non-MLAs)
        const localHierarchy = [...cityHierarchy];

        // Add MLA if found
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
            [mla.id],
          );

          mla.children = mlaChildrenResult.rows || [];
          localHierarchy.push(mla);
        }

        // Add Ward Councillor
        localHierarchy.push({
          id: null,
          name: wardData.ward_councillor,
          designation: `Ward Councillor - Ward ${wardData.ward_number}`,
          children: [],
        });

        response.local = {
          level: "Local Level",
          city_name: cityName,
          hierarchy: localHierarchy,
          constituency_name: constituencyName,
          ward_number: wardData.ward_number,
          ward_councillor: wardData.ward_councillor,
        };
      } else {
        // === NO WARD/PINCODE - existing behavior (all MLAs + other city leaders) ===
        const localResult = await pool.query(
          `
          SELECT al.*, co.name AS constituency_name
          FROM all_leaders al
          LEFT JOIN constituencies co ON al.constituency_id = co.id
          WHERE al.region_type = 'city' AND al.city_id = $1
          ORDER BY COALESCE(al.display_order, 999999), al.id
          `,
          [cityId],
        );

        const localHierarchy = buildHierarchy(localResult.rows);

        response.local = {
          level: "Local Level",
          city_name: cityName,
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

    // ⭐ SPECIAL RULE → Junior ministers always last
    const aJunior = a.designation?.toLowerCase().includes("junior");
    const bJunior = b.designation?.toLowerCase().includes("junior");

    if (aJunior && !bJunior) return 1;
    if (!aJunior && bJunior) return -1;

    // ⭐ existing logic stays same
    const aRank = a.hierarchy_rank ?? 999999;
    const bRank = b.hierarchy_rank ?? 999999;

    if (aRank !== bRank) return aRank - bRank;

    const aOrder = a.display_order ?? 999999;
    const bOrder = b.display_order ?? 999999;

    if (aOrder !== bOrder) return aOrder - bOrder;

    return a.id - b.id;
  });

  nodes.forEach((node) => {
    if (node.children.length > 0) {
      sortByDisplayOrder(node.children);
    }
  });
}



module.exports = { getNationalHierarchy };
//--------
