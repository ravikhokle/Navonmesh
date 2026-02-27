import Emergency from "../models/Emergency.js";
import Hospital from "../models/Hospital.js";
import { parseVoiceWithAI } from "../utils/parseVoiceAI.js";

// @desc    Create a new emergency request
// @route   POST /api/citizen/emergency
// @access  Private (citizen)
export const createEmergency = async (req, res) => {
  try {
    const { citizenName, citizenPhone, location, description } = req.body;

    if (!citizenName || !location?.coordinates) {
      return res.status(400).json({ message: "Citizen name and location are required" });
    }

    const emergency = await Emergency.create({
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

// @desc    Parse voice transcript into name, phone, description using Cohere AI
// @route   POST /api/citizen/parse-voice
// @access  Public (citizen SOS page has no login)
export const parseVoice = async (req, res) => {
  try {
    const { transcript, language } = req.body;

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 3) {
      return res
        .status(400)
        .json({ message: "Transcript is required (min 3 characters)" });
    }

    const parsed = await parseVoiceWithAI(transcript.trim(), language || "en-IN");
    res.json(parsed);
  } catch (error) {
    console.error("Voice parse error:", error.message);
    res.status(500).json({ message: "AI parsing failed: " + error.message });
  }
};
