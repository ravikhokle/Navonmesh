import mongoose from "mongoose";

const ALLOWED_ROLES = ["ers", "ambulance", "hospital", "traffic"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: {
        values: ALLOWED_ROLES,
        message: "Role must be one of: ers, ambulance, hospital, traffic",
      },
      required: [true, "Role is required"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    isOnDuty: {
      type: Boolean,
      default: false,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
  },
  { timestamps: true }
);

export { ALLOWED_ROLES };
const User = mongoose.model("User", userSchema);
export default User;
