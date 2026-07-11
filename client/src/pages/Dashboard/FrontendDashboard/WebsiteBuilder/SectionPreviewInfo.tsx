// @ts-nocheck
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Info,
  X,
  Star,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  ChevronDown,
  Facebook,
  Instagram,
  Linkedin,
} from "lucide-react";

// Small "i" button shown next to a form-section heading. Opens a modal that
// renders a miniature mockup (dummy data) of how that section appears on the
// published website, so users know what they are filling in.

const ImgBlock = ({ className = "" }) => (
  <div
    className={`bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 flex items-center justify-center text-[9px] font-pmedium uppercase tracking-widest text-slate-400 ${className}`}
  >
    Image
  </div>
);

const Stars = ({ count = 5 }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={11}
        className={i < count ? "fill-amber-400 text-amber-400" : "text-slate-200"}
      />
    ))}
  </div>
);

const HeroMock = ({ small = false }) => (
  <div className="relative overflow-hidden rounded-xl">
    <ImgBlock className={small ? "h-32 w-full" : "h-48 w-full"} />
    <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center text-center p-4 gap-2">
      <p className="text-white font-pmedium text-lg">Welcome to Your Company</p>
      {!small && (
        <p className="text-slate-200 text-[11px] max-w-xs">
          A short tagline about what your business offers goes here.
        </p>
      )}
      <button
        type="button"
        className="mt-1 bg-[#2563EB] text-white px-4 py-1.5 rounded-xl font-pmedium text-[9px] uppercase tracking-wider pointer-events-none"
      >
        Get In Touch
      </button>
    </div>
  </div>
);

const AboutMock = () => (
  <div className="grid grid-cols-2 gap-4 items-center">
    <div className="space-y-2">
      <p className="font-pmedium text-slate-900 text-sm">About Your Company</p>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Tell visitors who you are, what you do and why they should choose you.
        This paragraph comes from the About text you enter in this section.
      </p>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        You can add multiple paragraphs — each one renders below the previous.
      </p>
    </div>
    <ImgBlock className="h-32 rounded-xl" />
  </div>
);

const ProductsMock = () => (
  <div className="space-y-3">
    <p className="font-pmedium text-slate-900 text-sm text-center">Our Products</p>
    <div className="grid grid-cols-3 gap-3">
      {["Coworking Desk", "Meeting Room", "Private Cabin"].map((name, i) => (
        <div key={name} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <ImgBlock className="h-16 w-full" />
          <div className="p-2">
            <p className="text-[11px] font-pmedium text-slate-900">{name}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">From ₹{(i + 1) * 500}/day</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ProductDetailsMock = () => (
  <div className="space-y-3">
    <HeroMock small />
    <div className="flex items-center justify-between">
      <div>
        <p className="font-pmedium text-slate-900 text-sm">Coworking Desk</p>
        <p className="text-[10px] text-slate-500">Starting at ₹500/day</p>
      </div>
      <Stars count={4} />
    </div>
    <p className="text-[11px] text-slate-500 leading-relaxed">
      The product description you write appears here, followed by inclusions,
      FAQs and an enquiry form.
    </p>
    <InclusionsMock />
  </div>
);

const InclusionsMock = () => (
  <div className="grid grid-cols-2 gap-2">
    {["High Speed Wi-Fi", "Air Conditioning", "Tea & Coffee", "Housekeeping"].map((item) => (
      <div key={item} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
        <span className="text-[10px] font-pmedium text-slate-600">{item}</span>
      </div>
    ))}
  </div>
);

const FaqMock = () => (
  <div className="space-y-2">
    <p className="font-pmedium text-slate-900 text-sm text-center">Frequently Asked Questions</p>
    {["What are your working hours?", "Do you offer day passes?", "Is parking available?"].map(
      (q, i) => (
        <div key={q} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-pmedium text-slate-700">{q}</p>
            <ChevronDown size={13} className="text-slate-400" />
          </div>
          {i === 0 && (
            <p className="mt-1.5 text-[10px] text-slate-500">
              The answer you enter shows here when the visitor expands a question.
            </p>
          )}
        </div>
      ),
    )}
  </div>
);

const GalleryMock = () => (
  <div className="space-y-3">
    <p className="font-pmedium text-slate-900 text-sm text-center">Gallery</p>
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <ImgBlock key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  </div>
);

const TestimonialsMock = () => (
  <div className="space-y-3">
    <p className="font-pmedium text-slate-900 text-sm text-center">What Our Clients Say</p>
    <div className="grid grid-cols-2 gap-3">
      {[
        ["Aarav Shah", "Great workspace, super friendly staff and fast internet."],
        ["Priya Nair", "Loved the meeting rooms — booking was effortless."],
      ].map(([name, text]) => (
        <div key={name} className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5">
          <Stars count={5} />
          <p className="text-[10px] text-slate-500 leading-relaxed">"{text}"</p>
          <p className="text-[10px] font-pmedium text-slate-800">— {name}</p>
        </div>
      ))}
    </div>
  </div>
);

const LogoCarouselMock = () => (
  <div className="space-y-3">
    <p className="font-pmedium text-slate-900 text-sm text-center">Trusted By</p>
    <div className="flex items-center justify-center gap-3">
      {["Acme Co", "Globex", "Initech", "Umbrella"].map((logo) => (
        <div
          key={logo}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-400"
        >
          {logo}
        </div>
      ))}
    </div>
  </div>
);

const ContactMock = () => (
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-2">
      <p className="font-pmedium text-slate-900 text-sm">Contact Us</p>
      {[
        ["Full Name", "Jane Doe"],
        ["Email", "jane@example.com"],
        ["Message", "I'd like to know more..."],
      ].map(([label, value]) => (
        <div key={label} className="space-y-0.5">
          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{label}</p>
          <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-500">
            {value}
          </div>
        </div>
      ))}
      <button
        type="button"
        className="bg-[#2563EB] text-white px-4 py-1.5 rounded-xl font-pmedium text-[9px] uppercase tracking-wider pointer-events-none"
      >
        Send Message
      </button>
    </div>
    <div className="space-y-2">
      <ImgBlock className="h-24 rounded-xl" />
      <div className="space-y-1 text-[10px] text-slate-500">
        <p className="flex items-center gap-1.5"><MapPin size={11} className="text-slate-400" /> 123 Business Street, Panaji, Goa</p>
        <p className="flex items-center gap-1.5"><Phone size={11} className="text-slate-400" /> +91 98765 43210</p>
        <p className="flex items-center gap-1.5"><Mail size={11} className="text-slate-400" /> hello@yourcompany.com</p>
      </div>
    </div>
  </div>
);

const ContactPersonMock = () => (
  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 w-fit mx-auto">
    <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-pmedium">
      RS
    </div>
    <div>
      <p className="text-[11px] font-pmedium text-slate-900">Rahul Sharma</p>
      <p className="text-[10px] text-slate-500">Community Manager</p>
      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
        <Phone size={10} /> +91 98765 43210
      </p>
    </div>
  </div>
);

const FooterMock = () => (
  <div className="rounded-xl bg-slate-900 p-4 space-y-3">
    <div className="grid grid-cols-3 gap-3">
      <div>
        <p className="text-[11px] font-pmedium text-white">Your Company</p>
        <p className="mt-1 text-[9px] text-slate-400 leading-relaxed">
          Registered company name and a short line about the business.
        </p>
      </div>
      <div>
        <p className="text-[10px] font-pmedium text-slate-300 uppercase tracking-widest">Pages</p>
        <p className="mt-1 text-[9px] text-slate-400">Home · Products · About · Contact</p>
      </div>
      <div>
        <p className="text-[10px] font-pmedium text-slate-300 uppercase tracking-widest">Follow Us</p>
        <div className="mt-1.5 flex gap-2 text-slate-400">
          <Facebook size={12} />
          <Instagram size={12} />
          <Linkedin size={12} />
        </div>
      </div>
    </div>
    <p className="border-t border-slate-700 pt-2 text-center text-[9px] text-slate-500">
      © 2026 Your Company. All rights reserved.
    </p>
  </div>
);

const FoundersMock = () => (
  <div className="space-y-3">
    <p className="font-pmedium text-slate-900 text-sm text-center">Meet Our Founders</p>
    <div className="grid grid-cols-2 gap-3">
      {[
        ["Anita Desai", "Co-Founder & CEO"],
        ["Vikram Mehta", "Co-Founder & COO"],
      ].map(([name, role]) => (
        <div key={name} className="rounded-xl border border-slate-200 bg-white p-3 text-center space-y-1.5">
          <ImgBlock className="h-14 w-14 rounded-full mx-auto" />
          <p className="text-[11px] font-pmedium text-slate-900">{name}</p>
          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{role}</p>
        </div>
      ))}
    </div>
  </div>
);

const TeamMock = () => (
  <div className="space-y-3">
    <p className="font-pmedium text-slate-900 text-sm text-center">Our Team</p>
    <div className="grid grid-cols-4 gap-2">
      {["Rohit", "Sneha", "Karan", "Meera"].map((name) => (
        <div key={name} className="rounded-xl border border-slate-200 bg-white p-2 text-center space-y-1">
          <ImgBlock className="h-10 w-10 rounded-full mx-auto" />
          <p className="text-[10px] font-pmedium text-slate-800">{name}</p>
        </div>
      ))}
    </div>
  </div>
);

const PartnersMock = () => (
  <div className="space-y-3">
    <p className="font-pmedium text-slate-900 text-sm text-center">Our Partners</p>
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <ImgBlock key={i} className="h-12 rounded-lg" />
      ))}
    </div>
    <p className="text-[10px] text-slate-500 text-center">
      Partner logos you upload appear in a row like this.
    </p>
  </div>
);

const ApplyFormMock = () => (
  <div className="space-y-2 max-w-xs mx-auto">
    <p className="font-pmedium text-slate-900 text-sm text-center">Apply Now</p>
    {["Full Name", "Email", "Phone", "Upload Resume"].map((label) => (
      <div key={label} className="space-y-0.5">
        <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{label}</p>
        <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-400">
          {label === "Upload Resume" ? "Choose file..." : `Enter ${label.toLowerCase()}`}
        </div>
      </div>
    ))}
    <button
      type="button"
      className="w-full bg-[#2563EB] text-white px-4 py-1.5 rounded-xl font-pmedium text-[9px] uppercase tracking-wider pointer-events-none"
    >
      Submit Application
    </button>
  </div>
);

const LeadFormMock = () => (
  <div className="space-y-2 max-w-xs mx-auto rounded-xl border border-slate-200 bg-white p-3">
    <p className="font-pmedium text-slate-900 text-xs text-center">Enquire Now</p>
    {["Name", "Phone", "Email"].map((label) => (
      <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-400">
        {label}
      </div>
    ))}
    <button
      type="button"
      className="w-full bg-[#2563EB] text-white px-4 py-1.5 rounded-xl font-pmedium text-[9px] uppercase tracking-wider pointer-events-none"
    >
      Send Enquiry
    </button>
    <p className="text-[9px] text-slate-400 text-center">
      Visitors submit this form on the product page; entries land in your Leads.
    </p>
  </div>
);

const PagesMock = () => (
  <div className="space-y-3">
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 flex items-center justify-between">
      <p className="text-[11px] font-pmedium text-slate-900">Your Company</p>
      <div className="flex gap-3 text-[10px] font-pmedium text-slate-500">
        <span className="text-[#2563EB]">Home</span>
        <span>Products</span>
        <span>About</span>
        <span>Gallery</span>
        <span>Contact</span>
      </div>
    </div>
    <p className="text-[10px] text-slate-500 text-center">
      Pages you enable here become links in the website's navigation bar.
    </p>
  </div>
);

const ProductsPageMock = () => (
  <div className="space-y-3">
    <HeroMock small />
    <ProductsMock />
  </div>
);

const SECTION_MOCKUPS = {
  pages: { title: "Website Navigation", node: <PagesMock /> },
  productsPage: { title: "Products Page", node: <ProductsPageMock /> },
  productDetails: { title: "Product Page", node: <ProductDetailsMock /> },
  heroBanner: { title: "Page Hero Banner", node: <HeroMock small /> },
  leadForm: { title: "Lead / Enquiry Form", node: <LeadFormMock /> },
  faq: { title: "FAQ Section", node: <FaqMock /> },
  inclusions: { title: "Inclusions Section", node: <InclusionsMock /> },
  founders: { title: "Founders Section", node: <FoundersMock /> },
  team: { title: "Team Section", node: <TeamMock /> },
  gallery: { title: "Gallery Section", node: <GalleryMock /> },
  partners: { title: "Partners Section", node: <PartnersMock /> },
  applyForm: { title: "Careers Application Form", node: <ApplyFormMock /> },
  contactPerson: { title: "Contact Person Card", node: <ContactPersonMock /> },
  hero: { title: "Home Hero Section", node: <HeroMock /> },
  about: { title: "About Section", node: <AboutMock /> },
  products: { title: "Products Section", node: <ProductsMock /> },
  testimonials: { title: "Testimonials Section", node: <TestimonialsMock /> },
  logoCarousel: { title: "Logo Carousel Section", node: <LogoCarouselMock /> },
  contact: { title: "Contact Section", node: <ContactMock /> },
  footer: { title: "Footer Section", node: <FooterMock /> },
};

const SectionPreviewInfo = ({ section }) => {
  const [open, setOpen] = useState(false);
  const mock = SECTION_MOCKUPS[section];
  if (!mock) return null;

  return (
    <>
      <button
        type="button"
        title="See how this section looks on the website"
        onClick={() => setOpen(true)}
        className="text-slate-400 hover:text-[#2563EB] transition-colors align-middle"
      >
        <Info size={14} />
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[1400] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <div
              className="bg-white w-full max-w-2xl max-h-[85vh] rounded-[22px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-primary font-pmedium">{mock.title}</h2>
                  <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mt-1">
                    Preview with sample data
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
              <div className="p-4 sm:p-5 overflow-y-auto bg-slate-50/50">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">{mock.node}</div>
                <p className="mt-3 text-center text-[10px] font-pmedium text-slate-400">
                  This is sample data — your website will use the content you enter in this section.
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default SectionPreviewInfo;
