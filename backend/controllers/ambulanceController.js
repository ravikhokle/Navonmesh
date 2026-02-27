import Emergency from "../models/Emergency.js";
import { sendWhatsAppMessage } from "../utils/sendWhatsApp.js";

// @desc    Update ambulance/emergency status (en_route, picked_up, completed)
// @route   PUT /api/ambulance/emergency/:id/status
// @access  Private (ambulance)
export const updateEmergencyStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["en_route", "picked_up", "completed"];
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
      .populate("assignedHospital", "name phone");

    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    // Send WhatsApp update to citizen if phone is available
    if (emergency.citizenPhone) {
      const statusMessages = {
        en_route: "🚑 An ambulance is on its way to your location.",
        picked_up: "🏥 Patient picked up. Heading to hospital.",
        completed: "✅ Emergency completed. Stay safe!",
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
      .populate("assignedHospital", "name")
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
    await user.save();

    res.json({ isOnDuty: user.isOnDuty });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
