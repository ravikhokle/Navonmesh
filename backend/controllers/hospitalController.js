import Hospital from "../models/Hospital.js";
import Emergency from "../models/Emergency.js";

// @desc    Update bed availability
// @route   PUT /api/hospital/:id/beds
// @access  Private (hospital)
export const updateBeds = async (req, res) => {
  try {
    const { availableBeds } = req.body;

    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { availableBeds },
      { new: true }
    );

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    const io = req.app.get("io");
    io.emit("hospital-updated", hospital);

    res.json(hospital);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept an emergency
// @route   PUT /api/hospital/emergency/:id/accept
// @access  Private (hospital)
export const acceptEmergency = async (req, res) => {
  try {
    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      { hospitalResponse: "accepted" },
      { new: true }
    )
      .populate("assignedHospital", "name")
      .populate("assignedAmbulance", "name");

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

// @desc    Reject an emergency
// @route   PUT /api/hospital/emergency/:id/reject
// @access  Private (hospital)
export const rejectEmergency = async (req, res) => {
  try {
    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      { hospitalResponse: "rejected" },
      { new: true }
    )
      .populate("assignedHospital", "name")
      .populate("assignedAmbulance", "name");

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

// @desc    Get emergencies assigned to this hospital
// @route   GET /api/hospital/emergencies
// @access  Private (hospital)
export const getHospitalEmergencies = async (req, res) => {
  try {
    // Find hospital managed by this user
    const hospital = await Hospital.findOne({ managedBy: req.user._id });
    if (!hospital) {
      return res
        .status(404)
        .json({ message: "No hospital linked to this account" });
    }

    const emergencies = await Emergency.find({
      assignedHospital: hospital._id,
    })
      .populate("citizen", "name")
      .populate("assignedAmbulance", "name")
      .sort({ createdAt: -1 });

    res.json(emergencies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get hospital profile for current user
// @route   GET /api/hospital/me
// @access  Private (hospital)
export const getMyHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ managedBy: req.user._id });
    if (!hospital) {
      return res
        .status(404)
        .json({ message: "No hospital linked to this account" });
    }

    res.json(hospital);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
