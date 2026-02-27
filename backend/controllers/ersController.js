import Emergency from "../models/Emergency.js";
import User from "../models/User.js";
import { sendWhatsAppMessage } from "../utils/sendWhatsApp.js";

// @desc    Get all emergency requests (for ERS dashboard)
// @route   GET /api/ers/emergencies
// @access  Private (ers)
export const getEmergencies = async (req, res) => {
  try {
    const emergencies = await Emergency.find()
      .populate("citizen", "name email")
      .populate("assignedAmbulance", "name")
      .populate("assignedHospital", "name")
      .sort({ createdAt: -1 });

    res.json(emergencies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Assign ambulance to an emergency
// @route   PUT /api/ers/emergency/:id/assign-ambulance
// @access  Private (ers)
export const assignAmbulance = async (req, res) => {
  try {
    const { ambulanceId } = req.body;

    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      {
        assignedAmbulance: ambulanceId,
        assignedERS: req.user._id,
        status: "assigned",
      },
      { new: true }
    )
      .populate("assignedAmbulance", "name")
      .populate("assignedHospital", "name");

    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    const io = req.app.get("io");
    io.emit("emergency-updated", emergency);

    res.json(emergency);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set emergency priority
// @route   PUT /api/ers/emergency/:id/priority
// @access  Private (ers)
export const setPriority = async (req, res) => {
  try {
    const { priority } = req.body;

    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      { priority },
      { new: true }
    );

    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    const io = req.app.get("io");
    io.emit("emergency-updated", emergency);

    res.json(emergency);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Notify hospital about incoming emergency
// @route   PUT /api/ers/emergency/:id/notify-hospital
// @access  Private (ers)
export const notifyHospital = async (req, res) => {
  try {
    const { hospitalId } = req.body;

    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      {
        assignedHospital: hospitalId,
        status: "hospital_notified",
      },
      { new: true }
    )
      .populate("assignedHospital", "name phone")
      .populate("assignedAmbulance", "name");

    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    // Send WhatsApp notification to hospital (if phone available)
    if (emergency.assignedHospital?.phone) {
      try {
        await sendWhatsAppMessage(
          emergency.assignedHospital.phone,
          `🚨 EMERGEX ALERT: Incoming emergency patient "${emergency.citizenName}". Priority: ${emergency.priority}. Please prepare.`
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

// @desc    Notify traffic police for route clearance
// @route   PUT /api/ers/emergency/:id/notify-traffic
// @access  Private (ers)
export const notifyTraffic = async (req, res) => {
  try {
    const { trafficId } = req.body;

    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      { assignedTraffic: trafficId },
      { new: true }
    );

    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    const io = req.app.get("io");
    io.emit("emergency-updated", emergency);
    io.emit("traffic-alert", { emergencyId: emergency._id, trafficId });

    res.json(emergency);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get available ambulances (on-duty ambulance users)
// @route   GET /api/ers/ambulances
// @access  Private (ers)
export const getAvailableAmbulances = async (req, res) => {
  try {
    const ambulances = await User.find({
      role: "ambulance",
      isOnDuty: true,
    }).select("-password");

    res.json(ambulances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
