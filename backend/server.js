import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";

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
  console.log("Client connected:", socket.id);

  // Join role-specific rooms
  socket.on("join-role", (role) => {
    socket.join(role);
    console.log(`Socket ${socket.id} joined room: ${role}`);
  });

  // Join emergency room for targeted updates (ambulance driver, citizen, hospital)
  socket.on("join-emergency", (emergencyId) => {
    socket.join(`emergency-${emergencyId}`);
    console.log(`Socket ${socket.id} joined emergency: ${emergencyId}`);
  });

  // Real-time location ping from ambulance / traffic officers / citizens
  // data: { userId, role, name, lat, lng }
  socket.on("update-location", (data) => {
    if (data.userId) {
      liveLocations[data.userId] = { ...data, timestamp: Date.now() };
    }
    // Broadcast to ALL clients (io.emit) so even ERS connected before ambulance gets updates
    io.emit("location-update", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Emergex server running on port ${PORT}`);
});
