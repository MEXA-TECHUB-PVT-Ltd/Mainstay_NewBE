const express = require("express");
const {
  createCoachArea,
  getAllCoachAreas,
  getCoachArea,
  updateCoachArea,
  deleteCoachArea,
  searchCoachAreas,
  deleteAllCoachAreas,
} = require("../controllers/coachArea");
const { cloudinaryUpload } = require("../middleware/cloudinaryUpload");
const router = express.Router();
router.post("/create", cloudinaryUpload.single("icon"), createCoachArea);
router.get("/get-all", getAllCoachAreas);
router.get("/search", searchCoachAreas);
router.get("/get/:id", getCoachArea);
router.put("/update/:id", cloudinaryUpload.single("icon"), updateCoachArea);
router.delete("/delete/:id", deleteCoachArea);
router.delete("/delete-all", deleteAllCoachAreas);
module.exports = router;
