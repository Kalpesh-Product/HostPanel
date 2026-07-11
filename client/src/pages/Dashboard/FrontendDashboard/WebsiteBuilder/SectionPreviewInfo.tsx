// @ts-nocheck
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Aperture, Boxes, CircleDot, Diamond, Hexagon, Info, Orbit, X } from "lucide-react";
import { FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa";

// Small "i" button shown next to a form-section heading. Opens a modal that
// renders a miniature mockup of how that section appears on the published
// website (same layout/design as PageDemo.tsx), filled with sample data.

const POPPINS = "font-['Poppins',ui-sans-serif,system-ui,sans-serif]";

// Sample imagery (royalty-free Unsplash) standing in for the user's uploads.
const IMG = {
  hero1: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=60",
  hero2: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=60",
  hero3: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=60",
  desk: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=60",
  meeting: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=600&q=60",
  team: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=60",
  cafe: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=60",
  laptops: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=60",
  lounge: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=60",
  person1: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=60",
  person2: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=60",
  person3: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=60",
  person4: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=60",
};

// Section heading with lines on both sides — same as the website's LinedHeading.
const LinedHeading = ({ title }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1 border-t border-[#111827]" />
    <h2 className={`shrink-0 text-center text-[13px] font-semibold uppercase tracking-[0.15em] text-[#111827] ${POPPINS}`}>
      {title}
    </h2>
    <div className="flex-1 border-t border-[#111827]" />
  </div>
);

// Rounded white-outline CTA used over hero images (IMAGE_ACTION_BUTTON on the site).
const HeroCta = ({ label = "CLICK HERE" }) => (
  <span className={`rounded-full border-2 border-white/90 bg-black/60 px-5 py-1.5 text-[9px] font-pmedium uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur-[2px] ${POPPINS}`}>
    {label}
  </span>
);

// Hero: full-bleed image, dark overlay, bottom-centered title/subtitle/CTA.
// carousel=true auto-advances through slides exactly like the real hero.
const HeroMock = ({ carousel = false, small = false, title = "Your Company Name" }) => {
  const slides = carousel ? [IMG.hero1, IMG.hero2, IMG.hero3] : [IMG.hero1];
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!carousel) return;
    const timer = window.setInterval(() => setIndex((prev) => (prev + 1) % slides.length), 2200);
    return () => window.clearInterval(timer);
  }, [carousel, slides.length]);

  return (
    <div className={`relative overflow-hidden rounded-lg bg-[#242424] ${small ? "h-36" : "h-56"}`}>
      <div
        className="flex h-full w-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((src, idx) => (
          <img key={idx} src={src} alt="Hero" className="h-full min-w-full object-cover opacity-65" />
        ))}
      </div>
      <div className="absolute inset-0 bg-black/40">
        <div className="flex h-full flex-col items-center justify-end gap-1.5 px-4 pb-5 text-center text-white">
          <p className={`text-[17px] font-bold leading-tight ${POPPINS}`}>{title}</p>
          {!small && (
            <p className={`max-w-xs text-[10px] leading-relaxed ${POPPINS}`}>
              Your tagline appears here, right below the main heading.
            </p>
          )}
          <div className="mt-1"><HeroCta label="GET IN TOUCH" /></div>
        </div>
      </div>
      {carousel && (
        <>
          <span className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-2 py-0.5 text-sm text-white">{"<"}</span>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-2 py-0.5 text-sm text-white">{">"}</span>
        </>
      )}
    </div>
  );
};

// About: black band with yellow Poppins heading and white paragraphs.
const AboutMock = () => (
  <div className="rounded-lg bg-black px-4 py-6 text-center text-white">
    <p className={`text-[16px] font-semibold text-[#f7e53f] ${POPPINS}`}>About Our Vision</p>
    <div className="mx-auto mt-3 max-w-md space-y-2">
      <p className={`text-[10px] leading-[1.7] ${POPPINS}`}>
        The About text you write shows here in white on the black band — introduce
        who you are, what you do and why visitors should choose you.
      </p>
      <p className={`text-[10px] leading-[1.7] ${POPPINS}`}>
        Each paragraph you add renders below the previous one.
      </p>
    </div>
  </div>
);

// Products: lined heading + cards with photo on top and dark panel below.
const ProductsMock = () => (
  <div className="space-y-4">
    <LinedHeading title="Our Products" />
    <div className="grid grid-cols-3 gap-3">
      {[
        ["Coworking", IMG.desk],
        ["Meeting Rooms", IMG.meeting],
        ["Cafe", IMG.cafe],
      ].map(([name, src]) => (
        <article key={name} className="flex flex-col overflow-hidden rounded-xl shadow-md">
          <img src={src} alt={name} className="h-20 w-full object-cover" />
          <div className="flex flex-1 flex-col items-center gap-1.5 bg-[#1a1a1a] px-2 py-3 text-center">
            <p className={`text-[10px] font-pmedium uppercase tracking-wide text-white ${POPPINS}`}>{name}</p>
            <p className={`text-[8px] leading-relaxed text-white/75 ${POPPINS}`}>Short card subtext</p>
            <span className={`mt-1 rounded-full border border-white/60 px-3 py-1 text-[7px] font-pmedium uppercase tracking-widest text-white ${POPPINS}`}>
              Explore
            </span>
          </div>
        </article>
      ))}
    </div>
  </div>
);

// Inclusions: stroke icons + tiny uppercase labels (same icon style as the site).
// Only ENABLED inclusions render on the website — disabled ones are hidden.
const IconSvg = ({ children }) => (
  <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const INCLUSION_SAMPLES = [
  ["Workspace", <IconSvg key="w"><rect x="6" y="10" width="28" height="18" rx="2" /><path d="M14 28v4M26 28v4M10 32h20" /><rect x="12" y="15" width="8" height="6" rx="1" /></IconSvg>],
  ["Fast Internet", <IconSvg key="f"><path d="M6 20a20 20 0 0 1 28 0M10 24a14 14 0 0 1 20 0M14 28a8 8 0 0 1 12 0" /><circle cx="20" cy="32" r="2" fill="currentColor" stroke="none" /></IconSvg>],
  ["Tea & Coffee", <IconSvg key="t"><path d="M10 14h16v12a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6V14z" /><path d="M26 16h2a3 3 0 0 1 0 6h-2" /><path d="M14 10c0-2 2-2 2-4M19 10c0-2 2-2 2-4" /></IconSvg>],
  ["Meeting Rooms", <IconSvg key="m"><rect x="6" y="12" width="28" height="18" rx="2" /><path d="M14 21h12M14 25h8" /><circle cx="12" cy="8" r="2" /><circle cx="20" cy="8" r="2" /><circle cx="28" cy="8" r="2" /></IconSvg>],
  ["Air Condition", <IconSvg key="a"><rect x="6" y="10" width="28" height="12" rx="2" /><path d="M14 28c0-2 2-4 6-4s6 2 6 4M20 22v4" /><circle cx="20" cy="16" r="2" /></IconSvg>],
  ["Housekeeping", <IconSvg key="h"><path d="M12 32V20l8-10 8 10v12" /><path d="M16 32v-8h8v8" /><path d="M8 20h24" /></IconSvg>],
];

const InclusionsMock = () => (
  <div className="space-y-4">
    <LinedHeading title="Inclusions" />
    <div className="grid grid-cols-6 gap-3">
      {INCLUSION_SAMPLES.map(([label, icon]) => (
        <div key={label} className="flex flex-col items-center gap-1.5 text-center text-[#111827]">
          {icon}
          <span className={`text-[7px] font-pmedium uppercase tracking-wider ${POPPINS}`}>{label}</span>
        </div>
      ))}
    </div>
    <p className={`text-center text-[9px] text-slate-400 ${POPPINS}`}>
      Only inclusions you enable are shown — disabled ones don't appear on the website.
    </p>
  </div>
);

// FAQ: numbered accordion matching the site's FaqAccordion (first item open).
const FaqMock = () => (
  <div className="space-y-3">
    <LinedHeading title="Frequently Asked Questions" />
    <div className="flex flex-col gap-2">
      {["What are your working hours?", "Do you offer day passes?", "Is parking available?"].map((q, idx) => (
        <div key={q} className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="flex items-center gap-2">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[9px] font-bold text-white ${POPPINS}`}>{idx + 1}</span>
              <span className={`text-[10px] font-semibold text-[#111827] ${POPPINS}`}>{q}</span>
            </span>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[12px] text-slate-500">
              {idx === 0 ? "-" : "+"}
            </span>
          </div>
          {idx === 0 && (
            <div className="border-t border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className={`text-[9px] leading-relaxed text-[#374151] ${POPPINS}`}>
                The answer you enter appears here when a visitor expands the question.
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

// Gallery: image grid + gray SHOW MORE pill, like the home gallery preview.
const GalleryMock = () => (
  <div className="space-y-4">
    <LinedHeading title="Gallery" />
    <div className="grid grid-cols-3 gap-1.5">
      {[IMG.desk, IMG.meeting, IMG.team, IMG.laptops, IMG.lounge, IMG.cafe].map((src, idx) => (
        <img key={idx} src={src} alt={`Gallery ${idx + 1}`} className="h-16 w-full rounded-lg object-cover" />
      ))}
    </div>
    <div className="flex justify-center">
      <span className={`rounded-full bg-[#6f6f6f] px-6 py-1.5 text-[8px] font-semibold uppercase text-white ${POPPINS}`}>Show More</span>
    </div>
  </div>
);

// Testimonials: name, black stars, review text and pagination dots.
const TestimonialsMock = () => (
  <div className="space-y-4">
    <LinedHeading title="Testimonials" />
    <div className="grid grid-cols-2 gap-4">
      {[
        ["Aarav Shah", "Great workspace, super friendly staff and really fast internet. The meeting rooms are excellent."],
        ["Priya Nair", "Loved the community events and the coffee. Booking a desk was completely effortless."],
      ].map(([name, text]) => (
        <article key={name} className="flex flex-col">
          <p className={`text-[12px] font-semibold text-[#111827] ${POPPINS}`}>{name}</p>
          <p className="mt-0.5 text-[10px] text-black">★★★★★</p>
          <p className={`mt-1.5 text-[9px] leading-relaxed text-[#374151] ${POPPINS}`}>"{text}"</p>
        </article>
      ))}
    </div>
    <div className="flex justify-center gap-1.5">
      <span className="h-1.5 w-5 rounded-full bg-[#111827]" />
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
    </div>
    <div className="text-center">
      <span className={`rounded-full border border-slate-500 px-4 py-1.5 text-[8px] font-pmedium uppercase tracking-wide text-slate-700 ${POPPINS}`}>
        Write a Review
      </span>
    </div>
  </div>
);

// Logo carousel: logos slide sideways and auto-advance like the real site.
const LOGO_MARKS = [Aperture, Boxes, CircleDot, Diamond, Hexagon, Orbit];
const LogoCarouselMock = () => {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setOffset((prev) => (prev + 1) % LOGO_MARKS.length), 2000);
    return () => window.clearInterval(timer);
  }, []);
  const visible = Array.from({ length: 4 }).map((_, i) => LOGO_MARKS[(offset + i) % LOGO_MARKS.length]);
  return (
    <div className="space-y-4">
      <LinedHeading title="Trusted by" />
      <div className="overflow-hidden">
        <div className="flex items-center justify-center gap-6 transition-all duration-700">
          {visible.map((LogoMark, idx) => (
            <div key={`${offset}-${idx}`} className="flex h-10 w-24 shrink-0 items-center justify-center">
              <LogoMark size={30} strokeWidth={1.7} className="text-slate-400" />
            </div>
          ))}
        </div>
      </div>
      <p className={`text-center text-[9px] text-slate-400 ${POPPINS}`}>
        Uploaded logos rotate automatically in this carousel.
      </p>
    </div>
  );
};

// Contact: map block (left) + contact card (right), matching the 7/5 grid.
const ContactMock = () => (
  <div className="space-y-4">
    <LinedHeading title="Contact" />
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-7 flex h-32 items-center justify-center rounded bg-slate-300">
        <span className={`text-[9px] font-semibold uppercase tracking-widest text-slate-500 ${POPPINS}`}>Google Map</span>
      </div>
      <div className={`col-span-5 space-y-1.5 rounded border border-slate-200 p-3 text-[9px] text-[#374151] ${POPPINS}`}>
        <p className="text-[11px] font-semibold text-[#111827]">Your Company Name</p>
        <p>123 Business Street, Panaji, Goa 403001</p>
        <p>+91 98765 43210</p>
        <p>hello@yourcompany.com</p>
        <p>Mon – Sat, 9:00 AM – 7:00 PM</p>
      </div>
    </div>
  </div>
);

// Contact person card shown on the contact page.
const ContactPersonMock = () => (
  <div className="mx-auto flex w-fit items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
    <img src={IMG.person1} alt="Contact person" className="h-12 w-12 rounded-full object-cover" />
    <div className={POPPINS}>
      <p className="text-[11px] font-semibold text-[#111827]">Rahul Sharma</p>
      <p className="text-[9px] text-[#374151]">Community Manager</p>
      <p className="mt-0.5 text-[9px] text-[#374151]">+91 98765 43210 · rahul@yourcompany.com</p>
    </div>
  </div>
);

// Footer: white footer with company block, Quick Links, Products, Contact Us.
const FooterMock = () => (
  <div className={`rounded-lg border-t border-slate-300 bg-white p-4 ${POPPINS}`}>
    <div className="grid grid-cols-[1.35fr_1fr_1fr_1fr] gap-4 text-left">
      <div>
        <p className="text-[11px] font-pmedium text-[#111827]">Your Company Name</p>
        <p className="mt-1 text-[8px] leading-relaxed text-[#374151]">123 Business Street, Panaji, Goa 403001</p>
        <div className="mt-2 flex items-center gap-1.5">
          {[FaFacebookF, FaInstagram, FaLinkedinIn].map((Icon, idx) => (
            <span key={idx} className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[#111827]">
              <Icon size={8} />
            </span>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[9px] font-semibold text-[#111827]">Quick Links</p>
        <div className="mt-1 space-y-0.5 text-[8px] text-[#374151]">
          <p>Home</p><p>About</p><p>Gallery</p><p>Contact</p>
        </div>
      </div>
      <div>
        <p className="text-[9px] font-semibold text-[#111827]">Products</p>
        <div className="mt-1 space-y-0.5 text-[8px] text-[#374151]">
          <p>Coworking</p><p>Meeting Rooms</p><p>Cafe</p>
        </div>
      </div>
      <div>
        <p className="text-[9px] font-semibold text-[#111827]">Contact Us</p>
        <div className="mt-1 space-y-0.5 text-[8px] text-[#374151]">
          <p>+91 98765 43210</p><p>hello@yourcompany.com</p>
        </div>
      </div>
    </div>
    <p className="mt-3 border-t border-slate-200 pt-2 text-center text-[8px] text-[#374151]">
      © 2026 Your Company Name. All rights reserved.
    </p>
  </div>
);

// Founders: black about-page band with yellow heading and photo cards.
const FoundersMock = () => (
  <div className="rounded-lg bg-black px-4 py-5 text-white">
    <p className={`text-center text-[14px] font-semibold text-[#f7e53f] ${POPPINS}`}>Our Founders</p>
    <div className="mt-3 grid grid-cols-2 gap-3">
      {[
        ["Anita Desai", "Co-Founder & CEO", IMG.person2],
        ["Vikram Mehta", "Co-Founder & COO", IMG.person1],
      ].map(([name, role, src]) => (
        <div key={name} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <img src={src} alt={name} className="mx-auto h-14 w-14 rounded-full object-cover" />
          <p className={`mt-2 text-[10px] font-semibold ${POPPINS}`}>{name}</p>
          <p className={`text-[8px] uppercase tracking-widest text-white/70 ${POPPINS}`}>{role}</p>
        </div>
      ))}
    </div>
  </div>
);

// Team: photo cards on the black about-page band.
const TeamMock = () => (
  <div className="rounded-lg bg-black px-4 py-5 text-white">
    <p className={`text-center text-[14px] font-semibold text-[#f7e53f] ${POPPINS}`}>Our Team</p>
    <div className="mt-3 grid grid-cols-4 gap-2">
      {[
        ["Rohit", IMG.person1],
        ["Sneha", IMG.person2],
        ["Karan", IMG.person4],
        ["Meera", IMG.person3],
      ].map(([name, src]) => (
        <div key={name} className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
          <img src={src} alt={name} className="mx-auto h-10 w-10 rounded-full object-cover" />
          <p className={`mt-1.5 text-[8px] font-semibold ${POPPINS}`}>{name}</p>
        </div>
      ))}
    </div>
  </div>
);

// Partners: lined heading + static logo row (gallery-page partner strip).
const PartnersMock = () => (
  <div className="space-y-4">
    <LinedHeading title="Our Partners" />
    <div className="flex items-center justify-center gap-6">
      {LOGO_MARKS.slice(0, 4).map((LogoMark, idx) => (
        <LogoMark key={idx} size={28} strokeWidth={1.7} className="text-slate-400" />
      ))}
    </div>
  </div>
);

// Careers application form.
const ApplyFormMock = () => (
  <div className="mx-auto max-w-xs space-y-2">
    <LinedHeading title="Apply Now" />
    {["Full Name", "Email", "Phone", "Upload Resume"].map((label) => (
      <div key={label}>
        <p className={`text-[8px] font-semibold uppercase tracking-widest text-[#374151] ${POPPINS}`}>{label}</p>
        <div className={`mt-0.5 rounded border border-slate-300 bg-white px-2 py-1.5 text-[9px] text-slate-400 ${POPPINS}`}>
          {label === "Upload Resume" ? "Choose file..." : `Enter ${label.toLowerCase()}`}
        </div>
      </div>
    ))}
    <div className="pt-1 text-center">
      <span className={`rounded-full bg-[#111827] px-6 py-1.5 text-[8px] font-pmedium uppercase tracking-widest text-white ${POPPINS}`}>
        Submit Application
      </span>
    </div>
  </div>
);

// Product-page enquiry / lead form.
const LeadFormMock = () => (
  <div className={`mx-auto max-w-xs space-y-2 rounded-xl border border-slate-300 bg-white p-3 shadow-sm ${POPPINS}`}>
    <p className="text-center text-[11px] font-semibold text-[#111827]">Enquire Now</p>
    {["Name", "Phone", "Email"].map((label) => (
      <div key={label} className="rounded border border-slate-300 bg-slate-50 px-2 py-1.5 text-[9px] text-slate-400">{label}</div>
    ))}
    <div className="pt-1 text-center">
      <span className="rounded-full bg-[#111827] px-6 py-1.5 text-[8px] font-pmedium uppercase tracking-widest text-white">Send Enquiry</span>
    </div>
    <p className="text-center text-[8px] text-slate-400">Submissions land in your Leads module.</p>
  </div>
);

// Navigation bar: company name left, page links right.
const PagesMock = () => (
  <div className="space-y-3">
    <div className={`flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm ${POPPINS}`}>
      <p className="text-[11px] font-semibold text-[#111827]">Your Company</p>
      <div className="flex gap-3 text-[9px] font-medium text-[#374151]">
        <span className="font-semibold text-black">Home</span>
        <span>Products</span>
        <span>About</span>
        <span>Gallery</span>
        <span>Contact</span>
        <span>Login</span>
      </div>
    </div>
    <p className={`text-center text-[9px] text-slate-400 ${POPPINS}`}>
      Pages you enable become links in the website's navigation bar.
    </p>
  </div>
);

// Product page: hero banner, description, inclusions and enquiry CTA.
const ProductDetailsMock = () => (
  <div className="space-y-4">
    <HeroMock small title="Coworking" />
    <p className={`text-[9px] leading-relaxed text-[#374151] ${POPPINS}`}>
      The product description you write appears here, followed by the product's
      own inclusions, gallery, FAQs and the enquiry form.
    </p>
    <InclusionsMock />
    <div className="text-center">
      <span className={`rounded-full bg-[#111827] px-6 py-1.5 text-[8px] font-pmedium uppercase tracking-widest text-white ${POPPINS}`}>Enquire Now</span>
    </div>
  </div>
);

// Products page: hero banner + product card grid.
const ProductsPageMock = () => (
  <div className="space-y-4">
    <HeroMock small title="Our Products" />
    <ProductsMock />
  </div>
);

const SECTION_MOCKUPS = {
  pages: { title: "Website Navigation", node: <PagesMock /> },
  productsPage: { title: "Products Page", node: <ProductsPageMock /> },
  productDetails: { title: "Product Page", node: <ProductDetailsMock /> },
  heroBanner: { title: "Page Hero Banner", node: <HeroMock small title="Page Title" /> },
  leadForm: { title: "Lead / Enquiry Form", node: <LeadFormMock /> },
  faq: { title: "FAQ Section", node: <FaqMock /> },
  inclusions: { title: "Inclusions Section", node: <InclusionsMock /> },
  founders: { title: "Founders Section", node: <FoundersMock /> },
  team: { title: "Team Section", node: <TeamMock /> },
  gallery: { title: "Gallery Section", node: <GalleryMock /> },
  partners: { title: "Partners Section", node: <PartnersMock /> },
  applyForm: { title: "Careers Application Form", node: <ApplyFormMock /> },
  contactPerson: { title: "Contact Person Card", node: <ContactPersonMock /> },
  hero: { title: "Home Hero Section", node: <HeroMock carousel /> },
  about: { title: "About Section", node: <AboutMock /> },
  products: { title: "Products Section", node: <ProductsMock /> },
  testimonials: { title: "Testimonials Section", node: <TestimonialsMock /> },
  logoCarousel: { title: "Trusted By Section", node: <LogoCarouselMock /> },
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
                    How it looks on your website
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
                  Shown with sample images and text — your website uses the content you enter in this section.
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
