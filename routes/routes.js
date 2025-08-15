// routes/hierarchy.js
const express = require('express');
const router = express.Router();
const { getNationalHierarchy } = require('../controllers/hierarchyController');
const { getResponsibilitiesBySlug } = require('../controllers/responsibilitiesController');
const { getNewsByPersonSlug } = require("../controllers/newsController");
const fetchAndSaveNews = require("../cron/newsCron");
const aboutController = require('../controllers/aboutController');
const leaderController = require("../controllers/searchLeaders");
const regionController = require("../controllers/FindLeaderByRegionType");
const financialsController = require('../controllers/financialsController');
const responsibilitiesByLeaderController = require('../controllers/responsibilitiesByLeaderController');
const criminalRecordsController = require("../controllers/criminalRecordsController");

router.get("/criminal-records/:slug", criminalRecordsController.getCriminalRecordsBySlug);
router.get('/leader-responsibilities/:slug', responsibilitiesByLeaderController.getResponsibilitiesByLeader);
router.get('/hierarchy', getNationalHierarchy);
router.get('/responsibilities/:slug', getResponsibilitiesBySlug);
router.get("/news/:slug", getNewsByPersonSlug);
router.get("/test-news-fetch", async (req, res) => {
  await fetchAndSaveNews();
});
router.get("/find-leader", leaderController.findLeadersByName);
router.get("/find-leader-by-region", regionController.findLeaderByRegionType);
router.get('/about/:slug', aboutController.getLeaderAbout);
router.get('/financials/:slug', financialsController.getLeaderFinancials);
module.exports = router;
