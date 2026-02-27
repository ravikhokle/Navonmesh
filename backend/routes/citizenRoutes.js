import express from "express";
import {
  createEmergency,
  getNearestHospitals,
  getMyEmergencies,
} from "../controllers/citizenController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, authorize("citizen"));

router.post("/emergency", createEmergency);
router.get("/emergencies", getMyEmergencies);
router.get("/hospitals/nearby", getNearestHospitals);

export default router;
