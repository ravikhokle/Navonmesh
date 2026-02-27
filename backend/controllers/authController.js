import bcrypt from "bcryptjs";
import User, { ALLOWED_ROLES } from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

// @desc    Signup a new user (ERS, Ambulance, Hospital, Traffic only)
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req, res) => {
  try {
    const { name, email, password, role, city } = req.body;

    // --- Validate all fields present ---
    if (!name || !email || !password || !role || !city) {
      return res.status(400).json({ message: "All fields are required (name, email, password, role, city)" });
    }

    // --- Validate email format ---
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email" });
    }

    // --- Validate password length ---
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // --- Validate role ---
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(", ")}`,
      });
    }

    // --- Check duplicate email ---
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // --- Hash password ---
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // --- Create user ---
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      city,
    });

    const token = generateToken(user._id, user.role);
    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        city: user.city,
      },
      token,
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Login user (ERS, Ambulance, Hospital, Traffic only)
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // --- Validate fields ---
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // --- Find user ---
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // --- Compare password ---
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id, user.role);
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        city: user.city,
        isOnDuty: user.isOnDuty,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
