// routes/hierarchy.js
const express = require("express");
const router = express.Router();
const { getNationalHierarchy } = require("../controllers/hierarchyController");
const {
  getResponsibilitiesBySlug,
} = require("../controllers/responsibilitiesController");

const aboutController = require("../controllers/aboutController");
const leaderController = require("../controllers/searchLeaders");
const regionController = require("../controllers/FindLeaderByRegionType");
const financialsController = require("../controllers/financialsController");
const responsibilitiesByLeaderController = require("../controllers/responsibilitiesByLeaderController");
const criminalRecordsController = require("../controllers/criminalRecordsController");
const educationController = require("../controllers/educationController");

router.get(
  "/criminal-records/:slug",
  criminalRecordsController.getCriminalRecordsBySlug
);
router.get(
  "/leader-responsibilities/:slug",
  responsibilitiesByLeaderController.getResponsibilitiesByLeader
);
router.get("/hierarchy", getNationalHierarchy);
router.get("/responsibilities/:slug", getResponsibilitiesBySlug);


router.get("/find-leader", leaderController.findLeadersByName);
router.get("/find-leader-by-region", regionController.findLeaderByRegionType);
router.get("/about/:slug", aboutController.getLeaderAbout);
router.get("/financials/:slug", financialsController.getLeaderFinancials);
router.get("/education/:slug", educationController.getEducationRecords);
module.exports = router;
