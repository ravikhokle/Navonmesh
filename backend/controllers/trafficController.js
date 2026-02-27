import User from "../models/User.js";
import Emergency from "../models/Emergency.js";

// @desc    Toggle traffic police on-duty status
// @route   PUT /api/traffic/toggle-duty
// @access  Private (traffic)
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

// @desc    Mark route as cleared for an emergency
// @route   PUT /api/traffic/emergency/:id/clear-route
// @access  Private (traffic)
export const clearRoute = async (req, res) => {
  try {
    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      { routeCleared: true },
      { new: true }
    );

    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    const io = req.app.get("io");
    io.emit("emergency-updated", emergency);
    io.emit("route-cleared", { emergencyId: emergency._id });

    res.json(emergency);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get emergencies assigned to this traffic officer
// @route   GET /api/traffic/emergencies
// @access  Private (traffic)
export const getMyTrafficEmergencies = async (req, res) => {
  try {
    const emergencies = await Emergency.find({
      assignedTraffic: req.user._id,
    })
      .populate("citizen", "name")
      .populate("assignedAmbulance", "name")
      .populate("assignedHospital", "name")
      .sort({ createdAt: -1 });

    res.json(emergencies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
