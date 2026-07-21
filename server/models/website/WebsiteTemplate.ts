// @ts-nocheck
import mongoose from "mongoose";

const templateSchema = new mongoose.Schema(
  {
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
    workspaceId: {
      type: String,
      default: null,
      index: true,
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
        enabled: { type: Boolean, default: true },
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
        enabled: { type: Boolean, default: true },
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
    socials: {
      instagram: {
        enabled: { type: Boolean, default: false },
        link: { type: String, default: "", trim: true },
      },
      facebook: {
        enabled: { type: Boolean, default: false },
        link: { type: String, default: "", trim: true },
      },
      twitter: {
        enabled: { type: Boolean, default: false },
        link: { type: String, default: "", trim: true },
      },
      linkedin: {
        enabled: { type: Boolean, default: false },
        link: { type: String, default: "", trim: true },
      },
      whatsapp: {
        enabled: { type: Boolean, default: false },
        link: { type: String, default: "", trim: true },
      },
    },
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
    },
    verticalType: {
      type: String,
    },
    themeId: { type: String, default: "co-working-default" },
    heroVariant: { type: String, default: "text-image" },
    themeVariant: { type: String, default: "default" },
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
    enabledSections: {
      type: [String],
      default: [],
    },
    sectionOverrides: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    styleConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    pageNavItems: {
      type: [
        {
          name: { type: String, default: "" },
          slug: { type: String, default: "" },
          enabled: { type: Boolean, default: true },
          pageHeading: { type: String, default: "" },
          pageIntro: { type: String, default: "" },
          metaTitle: { type: String, default: "" },
          metaDescription: { type: String, default: "" },
        },
      ],
      default: [],
    },
    productDropdownPages: {
      type: [
        {
          name: { type: String, default: "" },
          slug: { type: String, default: "" },
          enabled: { type: Boolean, default: true },
          heroEnabled: { type: Boolean, default: true },
          inclusionsEnabled: { type: Boolean, default: true },
          faqEnabled: { type: Boolean, default: true },
          heroHeading: { type: String, default: "" },
          heroSubHeading: { type: String, default: "" },
          heroMode: { type: String, default: "single" },
          heroImage: {
            id: { type: String },
            url: { type: String },
          },
          heroImages: [
            {
              id: { type: String },
              url: { type: String },
            },
          ],
          heroButtonText: { type: String, default: "" },
          homeCardHeading: { type: String, default: "" },
          homeCardSubText: { type: String, default: "" },
          homeCardImage: {
            id: { type: String },
            url: { type: String },
          },
          leadEnabled: { type: Boolean, default: true },
          leadFormLabel: { type: String, default: "" },
          faqs: {
            type: [
              {
                question: { type: String, default: "" },
                answer: { type: String, default: "" },
              },
            ],
            default: [],
          },
          inclusions: {
            type: [
              {
                key: { type: String, default: "" },
                enabled: { type: Boolean, default: true },
              },
            ],
            default: [],
          },
        },
      ],
      default: [],
    },
    aboutPageIntro: { type: String, default: "" },
    aboutPageOverview: { type: String, default: "" },
    aboutPageStory: { type: String, default: "" },
    aboutPageMission: { type: String, default: "" },
    aboutPageVision: { type: String, default: "" },
    aboutPageValues: { type: String, default: "" },
    aboutPageTeamHeading: { type: String, default: "" },
    aboutPageImages: [
      {
        id: { type: String },
        url: { type: String },
      },
    ],
    aboutPageImageCards: {
      type: [
        {
          title: { type: String, default: "" },
          description: { type: String, default: "" },
          enabled: { type: Boolean, default: true },
          image: {
            id: { type: String },
            url: { type: String },
          },
        },
      ],
      default: [],
    },
    galleryPageHeading: { type: String, default: "" },
    testimonialsPageHeading: { type: String, default: "" },
    testimonialsPageIntro: { type: String, default: "" },
    testimonialsHomePreviewCount: { type: Number, default: 3 },
    testimonialsEnableWriteReview: { type: Boolean, default: true },
    testimonialsSuccessMessage: { type: String, default: "" },
    contactPageHeading: { type: String, default: "" },
    contactPageIntro: { type: String, default: "" },
    contactEnableInquiryForm: { type: Boolean, default: true },
    contactInquirySuccessMessage: { type: String, default: "" },
    contactBusinessHours: { type: String, default: "" },
    contactPersonName: { type: String, default: "" },
    contactPersonRole: { type: String, default: "" },
    contactPersonEmail: { type: String, default: "" },
    contactPersonPhone: { type: String, default: "" },
    rooms: {
      type: [
        {
          title: { type: String },
          description: { type: String },
          enabled: { type: Boolean, default: true },
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
    meetingRooms: {
      type: [
        {
          title: { type: String },
          description: { type: String },
          enabled: { type: Boolean, default: true },
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
    coLivingRooms: {
      type: [
        {
          title: { type: String },
          description: { type: String },
          enabled: { type: Boolean, default: true },
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
          enabled: { type: Boolean, default: true },
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
          enabled: { type: Boolean, default: true },
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
          enabled: { type: Boolean, default: true },
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
    logoCarousel: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: "" },
      logos: [
        {
          id: { type: String },
          url: { type: String },
        },
      ],
    },
    // Partner page
    partnerPageHeading: { type: String, default: "" },
    partnerPageContent: { type: String, default: "" },
    partnerFormTitle: { type: String, default: "" },
    // Careers page
    careersPageHeading: { type: String, default: "" },
    careersPageIntro: { type: String, default: "" },
    careersHeroImage: {
      id: { type: String },
      url: { type: String },
    },
    careersHeroButtonText: { type: String, default: "" },
    careersClosingHeading: { type: String, default: "" },
    careersClosingText: { type: String, default: "" },
    careersApplyButtonText: { type: String, default: "" },
    careersApplyButtonLink: { type: String, default: "" },
    careersFormFields: { type: String, default: "[]" },
    // Founders section (about page)
    founders: {
      type: [
        {
          name: { type: String, default: "" },
          role: { type: String, default: "" },
          bio: { type: String, default: "" },
          highlights: [{ type: String }],
          image: {
            id: { type: String },
            url: { type: String },
          },
        },
      ],
      default: [],
    },
    isDraft: { type: Boolean, default: false },
    faqs: {
      type: [
        {
          question: { type: String, default: "" },
          answer: { type: String, default: "" },
          enabled: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    inclusions: {
      type: [
        {
          key: { type: String, default: "" },
          enabled: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    draftData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    draftUpdatedAt: { type: Date, default: null },
    isPublished: { type: Boolean, default: false },
    deployedUrl: { type: String, default: null },
    deployedAt: { type: Date, default: null },
    // Frozen copy of the template served to the live hosted website. Drafts keep
    // mutating the top-level fields for local preview; the hosted site only sees
    // this snapshot, refreshed on publish/submit.
    publishedData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const WebsiteTemplate = mongoose.model("WebsiteTemplate", templateSchema);
export default WebsiteTemplate;
