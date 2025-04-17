import mongoose, { Schema } from "mongoose";
import { Office } from "./office.model.js";

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    companyName: {
      type: String,
      required: true,
      validate: {
        validator: async function (value) {
          const exists = await Office.exists({
            companyName: value,
            branchName: this.branchName,
          });
          return !!exists;
        },
        message: "Company and branch name must exist in the Office database.",
      },
    },
    branchName: {
      type: String,
      required: true,
      validate: {
        validator: async function (value) {
          const exists = await Office.exists({
            companyName: this.companyName,
            branchName: value,
          });
          return !!exists;
        },
        message: "Company and branch name must exist in the Office database.",
      },
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePic: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
