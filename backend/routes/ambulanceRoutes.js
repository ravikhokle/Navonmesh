import express from "express";
import {
  updateEmergencyStatus,
  getMyAssignedEmergencies,
  toggleDuty,
} from "../controllers/ambulanceController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, authorize("ambulance"));

router.get("/emergencies", getMyAssignedEmergencies);
router.put("/emergency/:id/status", updateEmergencyStatus);
router.put("/toggle-duty", toggleDuty);

export default router;
