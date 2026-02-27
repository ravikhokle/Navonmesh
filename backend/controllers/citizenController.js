import Emergency from "../models/Emergency.js";
import Hospital from "../models/Hospital.js";

// @desc    Create a new emergency request
// @route   POST /api/citizen/emergency
// @access  Private (citizen)
export const createEmergency = async (req, res) => {
  try {
    const { citizenName, citizenPhone, location, description } = req.body;

    const emergency = await Emergency.create({
      citizen: req.user._id,
      citizenName,
      citizenPhone,
      location,
      description,
    });

    // Emit real-time event to ERS dashboard
    const io = req.app.get("io");
    io.emit("new-emergency", emergency);

    res.status(201).json(emergency);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get nearest hospitals based on coordinates
// @route   GET /api/citizen/hospitals/nearby?lng=XX&lat=YY&maxDistance=5000
// @access  Private (citizen)
export const getNearestHospitals = async (req, res) => {
  try {
    const { lng, lat, maxDistance = 10000 } = req.query;

    if (!lng || !lat) {
      return res
        .status(400)
        .json({ message: "Longitude and latitude are required" });
    }

    const hospitals = await Hospital.find({
      "location.coordinates": {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(maxDistance),
        },
      },
      availableBeds: { $gt: 0 },
    });

    res.json(hospitals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get citizen's own emergencies
// @route   GET /api/citizen/emergencies
// @access  Private (citizen)
export const getMyEmergencies = async (req, res) => {
  try {
    const emergencies = await Emergency.find({ citizen: req.user._id })
      .populate("assignedAmbulance", "name")
      .populate("assignedHospital", "name")
      .sort({ createdAt: -1 });

    res.json(emergencies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
