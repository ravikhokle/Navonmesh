import express from "express";
import {
  toggleDuty,
  clearRoute,
  getMyTrafficEmergencies,
} from "../controllers/trafficController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, authorize("traffic"));

router.get("/emergencies", getMyTrafficEmergencies);
router.put("/toggle-duty", toggleDuty);
router.put("/emergency/:id/clear-route", clearRoute);

export default router;
