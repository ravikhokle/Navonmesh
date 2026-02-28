import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import { autoAssignNearbyTraffic } from "./utils/autoTraffic.js";

// Route imports
import authRoutes from "./routes/authRoutes.js";
import citizenRoutes from "./routes/citizenRoutes.js";
import ersRoutes from "./routes/ersRoutes.js";
import ambulanceRoutes from "./routes/ambulanceRoutes.js";
import hospitalRoutes from "./routes/hospitalRoutes.js";
import trafficRoutes from "./routes/trafficRoutes.js";

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Make io accessible in controllers via req.app.get("io")
app.set("io", io);

// Module-scope live-location cache: { [userId]: { lat, lng, role, name, timestamp } }
// Updated in real-time whenever any ambulance/traffic/citizen emits "update-location"
const liveLocations = {};
app.set("liveLocations", liveLocations);

// Throttle map: { [ambulanceUserId]: lastCheckTimestamp }
const lastAutoAssignCheck = {};

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/citizen", citizenRoutes);
app.use("/api/ers", ersRoutes);
app.use("/api/ambulance", ambulanceRoutes);
app.use("/api/hospital", hospitalRoutes);
app.use("/api/traffic", trafficRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Emergex API is running" });
});

// Public live-locations endpoint — no auth needed (citizens need ambulance position)
// Returns locations updated within the last 5 minutes
app.get("/api/live-locations", (req, res) => {
  const now = Date.now();
  const fresh = Object.fromEntries(
    Object.entries(liveLocations).filter(([, v]) => now - v.timestamp < 5 * 60 * 1000)
  );
  res.json(fresh);
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  // Join role-specific room (ers, ambulance, hospital, traffic)
  socket.on("join-role", (role) => {
    socket.join(role);
    console.log(`[socket] ${socket.id} → room:${role}`);
  });

  // Join personal user room for targeted notifications
  socket.on("join-user", (userId) => {
    if (userId) {
      socket.join(`user-${userId}`);
      console.log(`[socket] ${socket.id} → user-${userId}`);
    }
  });

  // Join emergency room for targeted updates (ambulance driver, citizen, hospital)
  socket.on("join-emergency", (emergencyId) => {
    socket.join(`emergency-${emergencyId}`);
    console.log(`[socket] ${socket.id} → emergency-${emergencyId}`);
  });

  // Real-time location ping from ambulance / traffic officers / citizens
  socket.on("update-location", (data) => {
    if (data.userId) {
      liveLocations[data.userId] = { ...data, timestamp: Date.now() };
    }
    // Broadcast to ALL clients so every dashboard stays in sync
    io.emit("location-update", data);

    // Auto-assign nearby traffic officers when ambulance moves (throttled 10 s)
    if (data.role === "ambulance" && data.lat && data.lng && data.userId) {
      const now = Date.now();
      if (!lastAutoAssignCheck[data.userId] || now - lastAutoAssignCheck[data.userId] > 10000) {
        lastAutoAssignCheck[data.userId] = now;
        autoAssignNearbyTraffic(data.userId, data.lat, data.lng, io, liveLocations, false);
      }
    }
  });

  // Remove a user’s location from the shared cache and notify all clients
  socket.on("clear-location", (data) => {
    if (data?.userId) delete liveLocations[data.userId];
    io.emit("location-cleared", { userId: data?.userId });
  });

  socket.on("disconnect", (reason) => {
    console.log(`[socket] disconnected: ${socket.id} (${reason})`);
  });
});

// Purge stale live-locations every 5 minutes
setInterval(() => {
  const now = Date.now();
  let pruned = 0;
  for (const [uid, loc] of Object.entries(liveLocations)) {
    if (now - loc.timestamp > 5 * 60 * 1000) {
      delete liveLocations[uid];
      io.emit("location-cleared", { userId: uid });
      pruned++;
    }
  }
  if (pruned > 0) console.log(`[location] purged ${pruned} stale entries`);
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Emergex server running on port ${PORT}`);
});
