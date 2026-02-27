import Emergency from "../models/Emergency.js";
import User from "../models/User.js";

// Proximity threshold in meters — ambulance must be within this distance of a
// traffic officer for the officer to be automatically assigned.
const PROXIMITY_THRESHOLD = 1500; // 1.5 km

/**
 * Haversine distance between two lat/lng points in metres.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in metres
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Automatically assign nearby on-duty traffic officers to the active emergency
 * for the given ambulance.
 *
 * @param {string}  ambulanceUserId  – The ambulance driver's user _id
 * @param {number}  ambLat           – Current ambulance latitude
 * @param {number}  ambLng           – Current ambulance longitude
 * @param {object}  io               – Socket.IO server instance
 * @param {object}  liveLocations    – In-memory { userId: { lat, lng, … } } cache
 * @param {boolean} forceNearest     – If true, always assign the single nearest
 *                                     officer (used on initial en_route trigger)
 */
export async function autoAssignNearbyTraffic(
  ambulanceUserId,
  ambLat,
  ambLng,
  io,
  liveLocations,
  forceNearest = false
) {
  try {
    // 1. Find the active emergency for this ambulance
    const emergency = await Emergency.findOne({
      assignedAmbulance: ambulanceUserId,
      status: { $in: ["assigned", "en_route", "picked_up"] },
    });
    if (!emergency) return;

    // 2. Get all on-duty traffic officers
    const officers = await User.find({ role: "traffic", isOnDuty: true }).select(
      "_id name"
    );
    if (!officers.length) return;

    // 3. Build set of already-assigned IDs (handle legacy single-value gracefully)
    const raw = emergency.assignedTraffic || [];
    const alreadyAssigned = new Set(
      (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map((id) => id.toString())
    );

    // 4. Score each unassigned officer by distance (only those sharing live location)
    const candidates = [];
    for (const officer of officers) {
      if (alreadyAssigned.has(officer._id.toString())) continue;
      const loc = liveLocations[officer._id.toString()];
      if (!loc?.lat) continue; // officer not sharing location
      const dist = haversineDistance(ambLat, ambLng, loc.lat, loc.lng);
      candidates.push({ officer, dist });
    }
    if (!candidates.length) return;

    // Sort nearest first
    candidates.sort((a, b) => a.dist - b.dist);

    // 5. Decide which officers to assign
    let toAssign;
    if (forceNearest) {
      // Initial dispatch — just the single nearest officer
      toAssign = [candidates[0]];
    } else {
      // Ongoing — all officers within the proximity threshold
      toAssign = candidates.filter((c) => c.dist <= PROXIMITY_THRESHOLD);
    }
    if (!toAssign.length) return;

    // 6. Persist assignments
    const newIds = toAssign.map((c) => c.officer._id);
    const updatedEmergency = await Emergency.findByIdAndUpdate(
      emergency._id,
      { $addToSet: { assignedTraffic: { $each: newIds } } },
      { new: true }
    )
      .populate("assignedAmbulance", "name currentLocation city")
      .populate("assignedHospital", "name location city phone");

    // 7. Emit targeted traffic-alert per officer + broadcast the update
    for (const { officer } of toAssign) {
      io.emit("traffic-alert", {
        emergencyId: emergency._id,
        trafficId: officer._id.toString(),
      });
    }
    io.emit("emergency-updated", updatedEmergency);

    console.log(
      `Auto-assigned ${toAssign.length} traffic officer(s) to emergency ${emergency._id}`
    );
  } catch (err) {
    console.error("Auto traffic assignment error:", err.message);
  }
}
