import mongoose from "mongoose";

const templateSchema = new mongoose.Schema(
  {
    searchKey: { type: String, required: true, index: true },
    isActive: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
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
    title: { type: String },
    subTitle: { type: String },
    CTAButtonText: { type: String },
    heroImages: [
      {
        id: { type: String },
        url: { type: String },
      },
    ],
    //about
    about: [{ type: String }],
    //products
    productTitle: { type: String },
    products: [
      {
        type: { type: String },
        name: { type: String },
        cost: { type: String },
        description: { type: String },
        images: [
          {
            id: { type: String },
            url: { type: String },
          },
        ],
      },
    ],
    galleryTitle: { type: String },
    gallery: [
      {
        id: { type: String },
        url: { type: String },
      },
    ],
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
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    //footer
    registeredCompanyName: { type: String },
    copyrightText: { type: String },
  },
  { timestamps: true }
);

const WebsiteTemplate = mongoose.model("WebsiteTemplate", templateSchema);
export default WebsiteTemplate;
