import Hospital from "../models/Hospital.js";
import Emergency from "../models/Emergency.js";

// @desc    Register / add a hospital (by hospital admin after login)
// @route   POST /api/hospital/register
// @access  Private (hospital)
export const registerHospital = async (req, res) => {
  try {
    const { name, city, phone, availableBeds, longitude, latitude } = req.body;

    if (!name || !city) {
      return res.status(400).json({ message: "Hospital name and city are required" });
    }

    // Check if this user already manages a hospital
    const existing = await Hospital.findOne({ managedBy: req.user._id });
    if (existing) {
      // Update existing hospital
      existing.name = name;
      existing.city = city;
      if (phone) existing.phone = phone;
      if (availableBeds !== undefined) existing.availableBeds = availableBeds;
      if (longitude && latitude) {
        existing.location = {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        };
      }
      await existing.save();

      const io = req.app.get("io");
      io.emit("hospital-updated", existing);

      return res.json(existing);
    }

    // Create new hospital
    const hospital = await Hospital.create({
      name,
      city,
      phone: phone || "",
      availableBeds: availableBeds || 0,
      location: {
        type: "Point",
        coordinates: [
          parseFloat(longitude) || 0,
          parseFloat(latitude) || 0,
        ],
      },
      managedBy: req.user._id,
    });

    const io = req.app.get("io");
    io.emit("hospital-added", hospital);

    res.status(201).json(hospital);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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
      .populate("assignedHospital", "name location city")
      .populate("assignedAmbulance", "name currentLocation city");

    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    const io = req.app.get("io");
    io.emit("emergency-updated", emergency);
    io.emit("hospital-response", { emergency, response: "accepted" });

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
      .populate("assignedHospital", "name location city")
      .populate("assignedAmbulance", "name currentLocation city");

    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    const io = req.app.get("io");
    io.emit("emergency-updated", emergency);
    io.emit("hospital-response", { emergency, response: "rejected" });

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
      .populate("assignedAmbulance", "name currentLocation city")
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
