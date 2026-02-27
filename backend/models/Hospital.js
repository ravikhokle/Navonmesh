import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Hospital name is required"],
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
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
    },
    availableBeds: {
      type: Number,
      default: 0,
      min: 0,
    },
    phone: {
      type: String,
    },
    managedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

hospitalSchema.index({ "location.coordinates": "2dsphere" });

const Hospital = mongoose.model("Hospital", hospitalSchema);
export default Hospital;
