const pool = require("../utils/db");

const findMyCM = async (req, res) => {
  try {
    const { state } = req.query;

    // 1️⃣ Validate
    if (!state) {
      return res.status(400).json({
        error: "State is required.",
      });
    }

    // 2️⃣ Find state in DB
    const stateResult = await pool.query(
      `SELECT id, name FROM states WHERE LOWER(name) = $1`,
      [state.trim().toLowerCase()]
    );

    if (stateResult.rows.length === 0) {
      return res.status(404).json({
        error: `State '${state}' not found in database.`,
      });
    }

    const stateId = stateResult.rows[0].id;
    const stateName = stateResult.rows[0].name;

    // 3️⃣ Find Chief Minister (ONLY required fields)
    const cmResult = await pool.query(
      `
      SELECT designation, name, profile_image_url, about, website_url, networth, assets, liabilities, salary
      FROM all_leaders
      WHERE LOWER(designation) = 'chief minister'
      AND state_id = $1
      LIMIT 1
      `,
      [stateId]
    );

    if (cmResult.rows.length === 0) {
      return res.status(404).json({
        error: `Chief Minister not found for ${stateName}.`,
      });
    }

    const cm = cmResult.rows[0];

    // 4️⃣ Clean Response
    return res.json({
      success: true,
      state: stateName,
      designation: cm.designation,
      name: cm.name,
      profile_image_url: cm.profile_image_url,
      website_url: cm.website_url,
      about: cm.about,
      salary: cm.salary,
      networth: cm.networth,
      assets: cm.assets,
      liabilities: cm.liabilities
    });

  } catch (error) {
    console.error("Error finding Chief Minister:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

const findMyMLA = async (req, res) => {
  try {
    const { pincode } = req.query;

    // 1️⃣ Validate
    if (!pincode) {
      return res.status(400).json({
        error: "Pincode is required.",
      });
    }

    // 2️⃣ Find pincode mapping
    const pincodeResult = await pool.query(
      `
      SELECT city_id, constituency_id
      FROM pincode_wards
      WHERE pincode = $1
      LIMIT 1
      `,
      [pincode]
    );

    if (pincodeResult.rows.length === 0) {
      return res.status(404).json({
        error: `Pincode ${pincode} not found.`,
      });
    }

    const { city_id, constituency_id } = pincodeResult.rows[0];

    // 3️⃣ Get City + State
    const cityResult = await pool.query(
      `
      SELECT c.name AS city_name, s.name AS state_name
      FROM cities c
      JOIN states s ON c.state_id = s.id
      WHERE c.id = $1
      `,
      [city_id]
    );

    if (cityResult.rows.length === 0) {
      return res.status(404).json({
        error: "City not found.",
      });
    }

    const { city_name, state_name } = cityResult.rows[0];

    // 4️⃣ Find MLA
    const mlaResult = await pool.query(
      `
      SELECT 
        name,
        profile_image_url,
        website_url,
        about,
        assets,
        networth,
        salary,
        liabilities
      FROM all_leaders
      WHERE LOWER(designation) = 'mla'
      AND city_id = $1
      AND constituency_id = $2
      LIMIT 1
      `,
      [city_id, constituency_id]
    );

    if (mlaResult.rows.length === 0) {
      return res.status(404).json({
        error: "MLA not found for this location.",
      });
    }

    const mla = mlaResult.rows[0];

    // 5️⃣ Clean Response
    return res.json({
      success: true,
      pincode,
      city: city_name,
      state: state_name,
      mla: {
        designation: "MLA",
        name: mla.name,
        profile_image_url: mla.profile_image_url,
        website_url: mla.website_url,
        about: mla.about,
        assets: mla.assets,
        networth: mla.networth,
        salary: mla.salary,
        liabilities: mla.liabilities
      },
    });

  } catch (error) {
    console.error("Error finding MLA:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

const findMyMayor = async (req, res) => {
  try {
    const { city } = req.query;

    // 1️⃣ Validate
    if (!city) {
      return res.status(400).json({
        error: "City is required.",
      });
    }

    // 2️⃣ Normalize City Name (First Letter Capital)
    const formattedCity =
      city.trim().charAt(0).toUpperCase() +
      city.trim().slice(1).toLowerCase();

    const designation = `Mayor of ${formattedCity}`;

    // 3️⃣ Find Mayor in all_leaders
    const mayorResult = await pool.query(
      `
      SELECT 
        name,
        profile_image_url,
        website_url,
        about,
        salary,
        networth,
        liabilities,
        assets
      FROM all_leaders
      WHERE designation = $1
      LIMIT 1
      `,
      [designation]
    );

    if (mayorResult.rows.length === 0) {
      return res.status(404).json({
        error: `Mayor not found for ${formattedCity}.`,
      });
    }

    const mayor = mayorResult.rows[0];

    // 4️⃣ Clean Response
    return res.json({
      success: true,
      city: formattedCity,
      designation,
      name: mayor.name,
      profile_image_url: mayor.profile_image_url,
      website_url: mayor.website_url,
      about: mayor.about,
      salary: mayor.salary,
      networth: mayor.networth,
      liabilities: mayor.liabilities,
      assets: mayor.assets
    });

  } catch (error) {
    console.error("Error finding Mayor:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

module.exports = { findMyCM, findMyMLA, findMyMayor };
