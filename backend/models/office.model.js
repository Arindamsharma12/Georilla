import mongoose, { Schema } from "mongoose";
import { User } from "./userSchema.model.js"; // Import User model

const officeSchema = new Schema(
  {
    branchName: {
      type: String,
      required: true,
    },
    officeCoordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    companyName: {
      type: String,
      required: true,
    },
    radius: {
      type: Number,
      default: 100,
    },
  },
  {
    timestamps: true,
    // Ensure virtuals are included when converting to JSON/Object
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Define the virtual field for employee count
officeSchema.virtual("employeeCount").get(async function () {
  try {
    const count = await User.countDocuments({
      companyName: this.companyName,
      branchName: this.branchName,
    });
    return count;
  } catch (error) {
    console.error("Error fetching employee count:", error);
    return 0; // Return 0 or handle error as appropriate
  }
});

export const Office = mongoose.model("Office", officeSchema);
