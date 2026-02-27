import Emergency from "../models/Emergency.js";
import User from "../models/User.js";
import Hospital from "../models/Hospital.js";
import { sendWhatsAppMessage } from "../utils/sendWhatsApp.js";

// @desc    Manually create an emergency from a phone call (ERS officer)
// @route   POST /api/ers/emergency
// @access  Private (ers)
export const createEmergencyManual = async (req, res) => {
  try {
    const { citizenName, citizenPhone, description, priority, latitude, longitude } = req.body;

    if (!citizenName || !latitude || !longitude) {
      return res.status(400).json({ message: "Citizen name and location (latitude/longitude) are required" });
    }

    const emergency = await Emergency.create({
      citizenName,
      citizenPhone: citizenPhone || "",
      description: description || "",
      priority: priority || "medium",
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      createdByERS: true,
    });

    const io = req.app.get("io");
    io.emit("new-emergency", emergency);

    res.status(201).json(emergency);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all emergency requests (for ERS dashboard)
// @route   GET /api/ers/emergencies
// @access  Private (ers)
export const getEmergencies = async (req, res) => {
  try {
    const emergencies = await Emergency.find()
      .populate("citizen", "name email")
      .populate("assignedAmbulance", "name currentLocation city")
      .populate("assignedHospital", "name location city phone")
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

    // Verify the ambulance driver is on duty
    const driver = await User.findById(ambulanceId);
    if (!driver || !driver.isOnDuty) {
      return res.status(400).json({ message: "This ambulance driver is not on duty" });
    }

    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      {
        assignedAmbulance: ambulanceId,
        assignedERS: req.user._id,
        status: "assigned",
      },
      { new: true }
    )
      .populate("assignedAmbulance", "name currentLocation city")
      .populate("assignedHospital", "name location city phone");

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
      .populate("assignedHospital", "name location city phone")
      .populate("assignedAmbulance", "name currentLocation city");

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

// @desc    Send alert to all — assign ambulance, hospital, traffic in one go
// @route   PUT /api/ers/emergency/:id/send-alert
// @access  Private (ers)
export const sendAlertAll = async (req, res) => {
  try {
    const { ambulanceId, hospitalId, trafficId, priority } = req.body;

    // Verify on-duty status for ambulance and traffic before assigning
    if (ambulanceId) {
      const driver = await User.findById(ambulanceId);
      if (!driver || !driver.isOnDuty) {
        return res.status(400).json({ message: "Ambulance driver is not on duty" });
      }
    }
    if (trafficId) {
      const officer = await User.findById(trafficId);
      if (!officer || !officer.isOnDuty) {
        return res.status(400).json({ message: "Traffic officer is not on duty" });
      }
    }

    const updateFields = { assignedERS: req.user._id };
    if (ambulanceId) {
      updateFields.assignedAmbulance = ambulanceId;
      updateFields.status = "assigned";
    }
    if (hospitalId) {
      updateFields.assignedHospital = hospitalId;
      if (!ambulanceId) updateFields.status = "hospital_notified";
    }
    if (trafficId) updateFields.assignedTraffic = trafficId;
    if (priority) updateFields.priority = priority;

    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    )
      .populate("assignedAmbulance", "name currentLocation city")
      .populate("assignedHospital", "name location city phone");

    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    const io = req.app.get("io");
    io.emit("emergency-updated", emergency);

    if (trafficId) {
      io.emit("traffic-alert", { emergencyId: emergency._id, trafficId });
    }

    // WhatsApp to hospital if assigned
    if (hospitalId) {
      const hospital = await Hospital.findById(hospitalId);
      if (hospital?.phone) {
        try {
          await sendWhatsAppMessage(
            hospital.phone,
            `\uD83D\uDEA8 EMERGEX ALERT: Incoming patient "${emergency.citizenName}". Priority: ${emergency.priority}. Please prepare.`
          );
        } catch (err) {
          console.error("WhatsApp notification failed:", err.message);
        }
      }
    }

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

// @desc    Get all hospitals
// @route   GET /api/ers/hospitals
// @access  Private (ers)
export const getHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find().sort({ availableBeds: -1 });
    res.json(hospitals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get available traffic police (on-duty)
// @route   GET /api/ers/traffic-users
// @access  Private (ers)
export const getTrafficUsers = async (req, res) => {
  try {
    const trafficUsers = await User.find({
      role: "traffic",
      isOnDuty: true,
    }).select("-password");

    res.json(trafficUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
