import express from "express";
import {
  updateBeds,
  acceptEmergency,
  rejectEmergency,
  getHospitalEmergencies,
  getMyHospital,
} from "../controllers/hospitalController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, authorize("hospital"));

router.get("/me", getMyHospital);
router.get("/emergencies", getHospitalEmergencies);
router.put("/:id/beds", updateBeds);
router.put("/emergency/:id/accept", acceptEmergency);
router.put("/emergency/:id/reject", rejectEmergency);

export default router;
