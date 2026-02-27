import bcrypt from "bcryptjs";
import crypto from "crypto";
import User, { ALLOWED_ROLES } from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../utils/sendEmail.js";

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

    // --- Send verification email ---
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (err) {
      console.error("Verification email failed:", err.message);
    }

    // Do NOT return a JWT — user must verify email first
    res.status(201).json({
      message: "Account created! Please check your email to verify your account before logging in.",
      email: user.email,
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

    // --- Check email verification ---
    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in. Check your inbox for the verification link.",
        needsVerification: true,
        email: user.email,
      });
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
        isEmailVerified: user.isEmailVerified,
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

// @desc    Update current user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, email, city } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if new email is already taken by another user
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: "Email already in use" });
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ message: "Please provide a valid email" });
      }
      user.email = email;
      user.isEmailVerified = false; // Re-verify if email changes
    }

    if (name) user.name = name.trim();
    if (city) user.city = city.trim();

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      city: user.city,
      isOnDuty: user.isOnDuty,
      isEmailVerified: user.isEmailVerified,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Verify email address
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification link" });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ message: "Email verified successfully! You can now login." });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Private
export const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    await sendVerificationEmail(user.email, verificationToken);

    res.json({ message: "Verification email sent! Check your inbox." });
  } catch (error) {
    res.status(500).json({ message: "Failed to send verification email" });
  }
};

// @desc    Forgot password — send reset email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: "If that email is registered, you'll receive a reset link." });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail(user.email, resetToken);
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: "Failed to send reset email. Try again later." });
    }

    res.json({ message: "If that email is registered, you'll receive a reset link." });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ message: "Password reset successful! You can now login with your new password." });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
