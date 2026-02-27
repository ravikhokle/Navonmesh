import Emergency from "../models/Emergency.js";
import { sendWhatsAppMessage } from "../utils/sendWhatsApp.js";
import { autoAssignNearbyTraffic } from "../utils/autoTraffic.js";

// @desc    Update ambulance/emergency status (en_route, picked_up, completed)
// @route   PUT /api/ambulance/emergency/:id/status
// @access  Private (ambulance)
export const updateEmergencyStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["en_route", "picked_up", "hospital_notified", "completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate("citizen", "name")
      .populate("assignedHospital", "name location city phone");

    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    // Send WhatsApp update to citizen if phone is available
    if (emergency.citizenPhone) {
      const statusMessages = {
        en_route:          "🚑 An ambulance is on its way to your location.",
        picked_up:         "🏥 Patient picked up. Heading to hospital.",
        hospital_notified: "🏥 Ambulance has arrived at the hospital.",
        completed:         "✅ Emergency completed. Stay safe!",
      };

      try {
        await sendWhatsAppMessage(
          emergency.citizenPhone,
          `EMERGEX Update: ${statusMessages[status]}`
        );
      } catch (err) {
        console.error("WhatsApp notification failed:", err.message);
      }
    }

    const io = req.app.get("io");
    io.emit("emergency-updated", emergency);
    io.emit("status-changed", { emergency, status });

    // When ambulance starts moving, auto-assign the nearest traffic officer
    if (status === "en_route") {
      const liveLocations = req.app.get("liveLocations");
      const ambLoc = liveLocations[req.user._id.toString()];
      if (ambLoc?.lat) {
        autoAssignNearbyTraffic(req.user._id, ambLoc.lat, ambLoc.lng, io, liveLocations, true);
      }
    }

    res.json(emergency);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get emergencies assigned to this ambulance
// @route   GET /api/ambulance/emergencies
// @access  Private (ambulance)
export const getMyAssignedEmergencies = async (req, res) => {
  try {
    const emergencies = await Emergency.find({
      assignedAmbulance: req.user._id,
    })
      .populate("citizen", "name")
      .populate("assignedHospital", "name location city")
      .sort({ createdAt: -1 });

    res.json(emergencies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle ambulance on-duty status
// @route   PUT /api/ambulance/toggle-duty
// @access  Private (ambulance)
export const toggleDuty = async (req, res) => {
  try {
    const user = req.user;
    user.isOnDuty = !user.isOnDuty;

    // Update location if provided (from browser geolocation)
    if (req.body.latitude && req.body.longitude) {
      user.currentLocation = {
        type: "Point",
        coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)],
      };
    }

    await user.save();

    // Emit duty change so ERS dashboard can refresh in real-time
    const io = req.app.get("io");
    io.emit("duty-changed", {
      userId: user._id,
      role: user.role,
      name: user.name,
      isOnDuty: user.isOnDuty,
    });

    res.json({ isOnDuty: user.isOnDuty });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
