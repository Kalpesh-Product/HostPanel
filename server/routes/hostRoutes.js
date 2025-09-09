const {
  getCompanyListings,
} = require("../controllers/hostControllers/hostControllers");

const router = require("express").Router();

router.get("/get-company-listings", getCompanyListings);

module.exports = router;
