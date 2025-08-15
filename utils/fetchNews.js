const axios = require("axios");

const fetchNewsForPerson = async (personName) => {
  const url = `https://newsdata.io/api/1/news?apikey=pub_e33559e71a1b4dd58092bbcb00263998&qInTitle=${encodeURIComponent(personName)}&language=en`;

  try {
    const res = await axios.get(url);
    return res.data.results || [];
  } catch (err) {
    console.error("Error fetching news:", err.message);
    return [];
  }
};

module.exports = { fetchNewsForPerson };
