import mongoose from "mongoose";

const emergencySchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    citizenName: {
      type: String,
      required: true,
    },
    citizenPhone: {
      type: String,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: {
        type: String,
      },
    },
    description: {
      type: String,
      default: "",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "assigned",
        "en_route",
        "picked_up",
        "hospital_notified",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },
    assignedERS: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedAmbulance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
    },
    assignedTraffic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    hospitalResponse: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    routeCleared: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

emergencySchema.index({ "location.coordinates": "2dsphere" });

const Emergency = mongoose.model("Emergency", emergencySchema);
export default Emergency;
