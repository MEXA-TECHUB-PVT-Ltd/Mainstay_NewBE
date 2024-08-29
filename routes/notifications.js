const express = require("express");

const controller = require("../controllers/notifications");

const router = express.Router();

router.post("/create", controller.create);
router.put("/update", controller.updateReadStatus);
router.put("/updateByUser", controller.updateReadStatusByUser);
router.get("/getAll", controller.getAll);
router.get("/getCount", controller.getCount);

module.exports = router;
