import express from "express";
import {
  getEmergencies,
  assignAmbulance,
  setPriority,
  notifyHospital,
  notifyTraffic,
  getAvailableAmbulances,
  getHospitals,
  getTrafficUsers,
} from "../controllers/ersController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, authorize("ers"));

router.get("/emergencies", getEmergencies);
router.get("/ambulances", getAvailableAmbulances);
router.get("/hospitals", getHospitals);
router.get("/traffic-users", getTrafficUsers);
router.put("/emergency/:id/assign-ambulance", assignAmbulance);
router.put("/emergency/:id/priority", setPriority);
router.put("/emergency/:id/notify-hospital", notifyHospital);
router.put("/emergency/:id/notify-traffic", notifyTraffic);

export default router;
