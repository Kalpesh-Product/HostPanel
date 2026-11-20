import React, { useState } from "react";
import { motion } from "../motion";
import { useTpl } from "../shared/TplContext";
import { Icon } from "../shared/TplUI";
import { LeadFormPanel } from "../shared/TplLead";
import { MessageForm } from "../shared/TplForms";
import {
  OrchardContactItems,
  OrchardHeading,
  OrchardPhoto,
  OrchardPlanCard,
  OrchardReviews,
  OrchardTextLink,
} from "./OrchardUI";

const AMENITY_KEYS = [1, 2, 3, 4, 5, 6];
const SPACE_KEYS = [1, 2, 3];

export const OrchardHome: React.FC = () => {
  const { t, draft, primary, rating, openLead, c, photo } = useTpl();
  const [amenity, setAmenity] = useState(0);
  const [space, setSpace] = useState(0);

  const hero = photo(
    "home.hero.image",
    t.heroImages?.[0] || primary?.heroImage || t.galleryItems?.[0] || "",
  );
  const gallery: string[] = t.galleryItems || [];
  const rooms = primary?.items || [];
  const address = t.contactAddress || draft?.address || "";
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  const book = () =>
    primary ? openLead(primary) : t.goToSection("contact");

  const amenityImages = SPACE_KEYS.map((n) =>
    photo(`home.amenities.image${n}`, gallery[2 + n] || hero),
  );
  const amenityTabs = SPACE_KEYS.map((n) =>
    c(`home.amenities.tab${n}`, ["Resident lounge", "Garden kitchen", "Rooftop deck"][n - 1]),
  );
  const amenities = AMENITY_KEYS.map((n) =>
    c(
      `home.amenities.item${n}`,
      [
        "Fast, reliable Wi-Fi throughout",
        "Fully equipped shared kitchen",
        "Quiet study and work nooks",
        "Laundry and housekeeping",
        "24-hour secure access",
        "Weekly community dinners",
      ][n - 1],
    ),
  );

  const featureRows = AMENITY_KEYS.map((n) => ({
    title: c(
      `home.features.${n}.title`,
      [
        "Considered interiors",
        "Space to focus",
        "Kitchens that bring people together",
        "Restful by design",
        "Details that stay with you",
        "A neighbourhood to explore",
      ][n - 1],
    ),
    body: c(
      `home.features.${n}.body`,
      [
        "Warm materials, honest finishes and furniture chosen for real life, not just for photographs.",
        "Quiet corners, good light and fast connections make it easy to settle into your own rhythm.",
        "Cook alone or cook together—our shared kitchens are the easiest place to meet someone new.",
        "Quality beds, blackout curtains and thoughtful layouts mean a proper night's sleep, every night.",
        "From the reading lamps to the lockable storage, the small things have been thought through.",
        "Cafés, parks and local landmarks are all within an easy walk of the front door.",
      ][n - 1],
    ),
  }));

  const spaceImages = SPACE_KEYS.map((n) =>
    photo(`home.spaces.image${n}`, gallery[5 + n] || hero),
  );
  const spaceTabs = SPACE_KEYS.map((n) =>
    c(`home.spaces.tab${n}`, ["The lounge", "The garden", "The rooftop"][n - 1]),
  );

  const stats = [
    { value: "05", label: c("home.neighbourhood.stat1", "Minutes to the metro") },
    { value: "24/7", label: c("home.neighbourhood.stat2", "Secure access") },
    { value: "12", label: c("home.neighbourhood.stat3", "Local cafés nearby") },
    { value: "01", label: c("home.neighbourhood.stat4", "Rooftop garden") },
    {
      value: rating.count ? rating.avg.toFixed(1) : "4.9",
      label: c("home.neighbourhood.stat5", "Guest rating"),
    },
  ];

  const neighbourhoodCards = SPACE_KEYS.map((n) => ({
    title: c(
      `home.neighbourhood.card${n}.title`,
      ["The green quarter", "Markets & makers", "After dark"][n - 1],
    ),
    text: c(
      `home.neighbourhood.card${n}.text`,
      [
        "Tree-lined streets, a Sunday farmers' market and a park made for slow mornings.",
        "Independent bookshops, coffee roasters and small studios around every corner.",
        "Neighbourhood bars and late kitchens, all an easy walk from home.",
      ][n - 1],
    ),
    image: photo(
      `home.neighbourhood.card${n}.image`,
      gallery[8 + n] || gallery[0] || hero,
    ),
  }));

  return (
    <>
      <section className="ol-hero">
        <div className="ol-shell ol-hero-frame" aria-hidden="true">
          <motion.img
            src={hero}
            alt=""
            className="ol-hero-media"
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          />
          <div className="ol-hero-shade" />
        </div>
        <div className="ol-shell ol-hero-content">
          <motion.p
            className="ol-hero-kicker"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
          >
            {c("home.hero.eyebrow", "A new way to stay")}
          </motion.p>
          <motion.h1
            className="ol-hero-title"
            initial={{ opacity: 0, y: 46 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {c("home.hero.title", draft?.title || "Designed for distinction.")}
          </motion.h1>
          <motion.p
            className="ol-hero-copy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.7 }}
          >
            {c(
              "home.hero.sub",
              draft?.subTitle ||
                "Thoughtful rooms, generous shared spaces and a neighbourhood that feels like yours from day one.",
            )}
          </motion.p>
          <motion.div
            className="ol-hero-actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.7 }}
          >
            <button type="button" className="ol-btn" onClick={book}>
              {c("home.hero.cta", draft?.CTAButtonText || "Book your stay")}
            </button>
            <button
              type="button"
              className="ol-btn ol-btn-light"
              onClick={() =>
                document.getElementById("ol-welcome")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            >
              {c("home.hero.secondaryCta", "Explore the house")}
            </button>
          </motion.div>
        </div>
        <button
          type="button"
          className="ol-down"
          aria-label="Scroll to welcome section"
          onClick={() =>
            document.getElementById("ol-welcome")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
        >
          {Icon.arrow(18)}
        </button>
      </section>

      <section id="ol-welcome" className="ol-section ol-section-soft">
        <div className="ol-shell ol-welcome-grid">
          <OrchardPhoto
            src={photo("home.welcome.image1", gallery[1] || hero)}
            alt="Welcome to the house"
            className="ol-welcome-photo"
          />
          <div>
            <OrchardHeading
              eyebrow={c("home.welcome.eyebrow", "Welcome to Orchard")}
              title={c("home.welcome.title", "A place to land, and a place to belong.")}
              sub={c(
                "home.welcome.sub",
                "We have brought together the comfort of a well-run home and the energy of a good hostel—without the noise, the queues or the compromise.",
              )}
              small
            />
            <p className="ol-lead">
              {t.aboutIntroBlocks?.[0] ||
                draft?.about?.[0]?.text ||
                c(
                  "home.welcome.body",
                  "Every room is considered, every shared space has a purpose, and the whole house is run by people who actually live nearby.",
                )}
            </p>
            <div className="mt-8">
              <OrchardTextLink onClick={() => t.goToSection("about")}>
                {c("home.welcome.link", "Meet the house")}
              </OrchardTextLink>
            </div>
            <OrchardPhoto
              src={photo("home.welcome.image2", gallery[2] || primary?.cardImage || hero)}
              alt="A quiet corner of the house"
              className="ol-welcome-photo-small"
            />
          </div>
        </div>
      </section>

      <section className="ol-section">
        <div className="ol-shell ol-amenity-grid">
          <div>
            <OrchardHeading
              eyebrow={c("home.amenities.eyebrow", "Everything in its place")}
              title={c("home.amenities.title", "Amenities, thoughtfully done.")}
              sub={c(
                "home.amenities.sub",
                "The useful things are already here, so your stay can be as social or as quiet as you like.",
              )}
              small
            />
            <div className="ol-amenity-tabs" role="tablist" aria-label="Amenity spaces">
              {amenityTabs.map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={amenity === index}
                  className={`ol-amenity-tab ${amenity === index ? "is-active" : ""}`.trim()}
                  onClick={() => setAmenity(index)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="ol-amenity-list">
              {amenities.map((item) => (
                <div key={item} className="ol-amenity-item">
                  {Icon.check(16)}
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ol-amenity-stage">
            <img src={amenityImages[amenity]} alt={amenityTabs[amenity]} loading="lazy" />
            <span className="ol-amenity-caption">{amenityTabs[amenity]}</span>
          </div>
        </div>
      </section>

      {rooms.length ? (
        <section className="ol-section ol-section-soft">
          <div className="ol-shell">
            <OrchardHeading
              eyebrow={c("home.plans.eyebrow", "Find your room")}
              title={c("home.plans.title", "Floor plans for every rhythm.")}
              sub={c(
                "home.plans.sub",
                "Compare the details, then let us know which one feels like yours.",
              )}
              action={
                primary ? (
                  <OrchardTextLink
                    onClick={() => t.goToProductPage(primary.slug)}
                  >
                    {c("home.plans.link", "View all rooms")}
                  </OrchardTextLink>
                ) : undefined
              }
            />
            <div className="ol-plans-grid">
              {rooms.slice(0, 3).map((item, index) => (
                <OrchardPlanCard
                  key={item.key}
                  service={primary!}
                  item={item}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="ol-section">
        <div className="ol-shell">
          <OrchardHeading
            eyebrow={c("home.features.eyebrow", "Inside every stay")}
            title={c("home.features.title", "The details make the difference.")}
            sub={c(
              "home.features.sub",
              "Good design should make everyday life easier. Here is what that looks like in practice.",
            )}
          />
          <div className="ol-feature-grid">
            {featureRows.map((feature, index) => (
              <article key={feature.title} className="ol-feature">
                <span className="ol-feature-icon">{Icon.check(16)}</span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
                <span className="ol-feature-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ol-banner">
        <div className="ol-shell ol-banner-frame" aria-hidden="true">
          <img src={photo("home.banner.image", gallery[6] || hero)} alt="" loading="lazy" />
          <div className="ol-banner-shade" />
        </div>
        <div className="ol-shell ol-banner-content">
          <OrchardEyebrowInverted>
            {c("home.banner.eyebrow", "Live well, stay awhile")}
          </OrchardEyebrowInverted>
          <h2>{c("home.banner.title", "More than a place to stay.")}</h2>
          <p>
            {c(
              "home.banner.sub",
              "A considered home, a good neighbourhood and the freedom to make the stay your own.",
            )}
          </p>
        </div>
      </section>

      <section className="ol-section">
        <div className="ol-shell">
          <OrchardHeading
            eyebrow={c("home.spaces.eyebrow", "Around the house")}
            title={c("home.spaces.title", "Spaces made for living.")}
            sub={c(
              "home.spaces.sub",
              "Move from a quiet morning coffee to an easy evening with people you just met.",
            )}
          />
          <div className="ol-space-tabs" role="tablist" aria-label="Shared spaces">
            {spaceTabs.map((tab, index) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={space === index}
                className={`ol-space-tab ${space === index ? "is-active" : ""}`.trim()}
                onClick={() => setSpace(index)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="ol-space-stage">
            <img src={spaceImages[space]} alt={spaceTabs[space]} loading="lazy" />
            <span className="ol-space-label">{spaceTabs[space]}</span>
            <button
              type="button"
              className="ol-space-arrow ol-space-prev"
              aria-label="Previous space"
              onClick={() =>
                setSpace((current) =>
                  current === 0 ? spaceTabs.length - 1 : current - 1,
                )
              }
            >
              ←
            </button>
            <button
              type="button"
              className="ol-space-arrow ol-space-next"
              aria-label="Next space"
              onClick={() => setSpace((current) => (current + 1) % spaceTabs.length)}
            >
              →
            </button>
          </div>
        </div>
      </section>

      {t.testimonials?.length ? (
        <section className="ol-section ol-section-soft">
          <div className="ol-shell">
            <OrchardHeading
              eyebrow={c("home.reviews.eyebrow", "Guest notes")}
              title={c("home.reviews.title", "What people say after they leave.")}
              sub={c(
                "home.reviews.sub",
                "The nicest part of running a house like this is hearing from the people who stayed.",
              )}
              small
            />
            <OrchardReviews limit={2} />
          </div>
        </section>
      ) : null}

      <section className="ol-section ol-section-soft">
        <div className="ol-shell">
          <OrchardHeading
            eyebrow={c("home.neighbourhood.eyebrow", "The neighbourhood")}
            title={c("home.neighbourhood.title", "A good address changes everything.")}
            sub={c(
              "home.neighbourhood.sub",
              "Step outside and you are in the middle of the city's best little streets.",
            )}
          />
          <div className="ol-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="ol-stat">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
          <div className="ol-neighborhood-grid">
            <OrchardPhoto
              src={photo("home.neighbourhood.image", gallery[9] || hero)}
              alt="The neighbourhood"
              className="ol-neighborhood-hero"
            />
            <div>
              {neighbourhoodCards.map((card) => (
                <article key={card.title} className="ol-neighborhood-card">
                  <img src={card.image} alt={card.title} loading="lazy" />
                  <div>
                    <h3>{card.title}</h3>
                    <p>{card.text}</p>
                  </div>
                </article>
              ))}
              <div className="mt-6">
                <OrchardTextLink onClick={() => window.open(mapsLink, "_blank", "noopener,noreferrer")}>
                  {c("home.neighbourhood.link", "Explore the area")}
                </OrchardTextLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ol-section">
        <div className="ol-shell ol-tour-grid">
          <div>
            <OrchardHeading
              eyebrow={c("home.tour.eyebrow", "Come see it for yourself")}
              title={c("home.tour.title", "Schedule a tour.")}
              sub={c(
                "home.tour.sub",
                "Tell us when you would like to visit and we will show you around, answer the small questions and help you settle in.",
              )}
              small
            />
            <OrchardContactItems />
            <p className="ol-tour-note">
              <strong>{c("home.tour.noteLabel", "Prefer to message us?")}</strong>{" "}
              {c(
                "home.tour.note",
                "Send a note and the team will get back to you the same day.",
              )}
            </p>
          </div>
          <div className="ol-tour-panel">
            {primary?.leadEnabled ? (
              <LeadFormPanel service={primary} />
            ) : (
              <MessageForm
                inquiryType="Tour"
                submitLabel={c("home.tour.submit", "Request a tour")}
                success="Thanks — we will be in touch shortly."
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
};

/** The banner sits on photography, so it uses the same small caps without the muted colour. */
const OrchardEyebrowInverted: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <p className="ol-eyebrow ol-eyebrow-inverted">{children}</p>;
