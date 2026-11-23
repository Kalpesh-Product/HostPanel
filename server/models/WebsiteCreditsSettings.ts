// @ts-nocheck
import mongoose from "mongoose";

// Singleton document holding the monthly website-edit credit allowance per
// plan. This is WRITTEN by the Master Panel (Website Credits -> Plan Credit
// Limits) and only READ here, so both panels share one staff-controlled
// setting instead of each keeping its own hardcoded numbers.
//
// Collection/model name must stay identical to
// WoNoMasterPanel/server/models/website/WebsiteCreditsSettings.js.
const websiteCreditsSettingsSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: "default",
      unique: true,
    },
    basicCredits: {
      type: Number,
      default: 5,
      min: 0,
    },
    professionalCredits: {
      type: Number,
      default: 8,
      min: 0,
    },
    customCredits: {
      type: Number,
      default: 12,
      min: 0,
    },
    updatedByEmail: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true, collection: "website_credits_settings" },
);

const WebsiteCreditsSettings =
  mongoose.models.WebsiteCreditsSettings ||
  mongoose.model(
    "WebsiteCreditsSettings",
    websiteCreditsSettingsSchema,
    "website_credits_settings",
  );

export default WebsiteCreditsSettings;
