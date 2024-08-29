const express = require("express");
const router = express.Router();
const controller = require("../controllers/polices");
const { isAuthenticated } = require("../middleware/auth");

router.post("/add", isAuthenticated, controller.add);
router.get("/get/:type",  controller.get);


module.exports = router;
