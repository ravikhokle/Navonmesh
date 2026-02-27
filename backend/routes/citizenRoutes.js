import express from "express";
import {
  createEmergency,
  getNearestHospitals,
  getMyEmergencies,
} from "../controllers/citizenController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Public citizen routes — no login required
router.post("/emergency", createEmergency);
router.get("/hospitals/nearby", getNearestHospitals);

// Optional: if a citizen later has an account, protected route
router.get("/emergencies", protect, getMyEmergencies);

export default router;
