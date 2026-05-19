// @ts-nocheck
import mongoose from "mongoose";
const templateSchema = new mongoose.Schema({
    searchKey: { type: String, required: true, index: true },
    isActive: {
        type: Boolean,
        default: true,
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
    vertical: {
        type: String,
        enum: [
            "co-working",
            "co-living",
            "workation",
            "hostel",
            "meeting-rooms",
            "cafe",
        ],
        default: "co-working",
    },
    themeId: { type: String, default: "co-working-default" },
    activeSections: {
        type: [String],
        default: [
            "hero",
            "about",
            "products",
            "gallery",
            "testimonials",
            "contact",
            "footer",
        ],
    },
    rooms: {
        type: [
            {
                title: { type: String },
                description: { type: String },
                images: [
                    {
                        id: { type: String },
                        url: { type: String },
                    },
                ],
                price: { type: String },
            },
        ],
        default: [],
    },
    packages: {
        type: [
            {
                title: { type: String },
                description: { type: String },
                price: { type: String },
                duration: { type: String },
                images: [
                    {
                        id: { type: String },
                        url: { type: String },
                    },
                ],
            },
        ],
        default: [],
    },
    dorms: {
        type: [
            {
                title: { type: String },
                description: { type: String },
                capacity: { type: Number },
                images: [
                    {
                        id: { type: String },
                        url: { type: String },
                    },
                ],
                price: { type: String },
            },
        ],
        default: [],
    },
    menuItems: {
        type: [
            {
                category: { type: String },
                name: { type: String },
                description: { type: String },
                price: { type: String },
                image: {
                    id: { type: String },
                    url: { type: String },
                },
            },
        ],
        default: [],
    },
    amenities: {
        type: [
            {
                title: { type: String },
                description: { type: String },
                icon: { type: String },
            },
        ],
        default: [],
    },
    pricing: {
        type: [
            {
                title: { type: String },
                price: { type: String },
                duration: { type: String },
                features: [{ type: String }],
            },
        ],
        default: [],
    },
    isPublished: { type: Boolean, default: false },
    deployedUrl: { type: String, default: null },
    deployedAt: { type: Date, default: null },
}, { timestamps: true });
const WebsiteTemplate = mongoose.model("WebsiteTemplate", templateSchema);
export default WebsiteTemplate;
