import mongoose from "mongoose";

const templateSchema = new mongoose.Schema(
  {
    searchKey: { type: String, required: true, index: true },
    isActive: {
      type: Boolean,
      default: false,
    },
    //hero
    companyLogo: {
      id: { type: String },
      url: { type: String },
    },
    companyName: { type: String, required: true },
    companyId: {
      type: String,
      // required: true
    },
    title: { type: String, required: true },
    subTitle: { type: String, required: true },
    CTAButtonText: { type: String },
    heroImages: {
      type: [{ id: String, url: String }],
      validate: [(v) => v.length <= 5, "Max 5 hero images allowed"],
    },
    //about
    about: [{ type: String, required: true }],
    //products
    productTitle: { type: String },
    products: [
      {
        type: { type: String, required: true },
        name: { type: String, required: true },
        cost: { type: String },
        description: { type: String, required: true },
        images: {
          type: [{ id: String, url: String }],
          validate: [(v) => v.length <= 10, "Max 10 product images allowed"],
        },
      },
    ],
    galleryTitle: { type: String },
    gallery: {
      type: [{ id: String, url: String }],
      validate: [(v) => v.length <= 40, "Max 40 gallery images allowed"],
    },
    //   //testimonials
    testimonialTitle: { type: String },
    testimonials: [
      {
        image: {
          id: { type: String },
          url: { type: String },
        },
        name: { type: String },
        jobPosition: { type: String },
        testimony: { type: String },
        rating: { type: Number },
      },
    ],
    // contact
    contactTitle: { type: String },
    mapUrl: { type: String },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String },
    //footer
    registeredCompanyName: { type: String },
    copyrightText: { type: String },
  },
  { timestamps: true }
);

const WebsiteTemplate = mongoose.model("WebsiteTemplate", templateSchema);
export default WebsiteTemplate;
