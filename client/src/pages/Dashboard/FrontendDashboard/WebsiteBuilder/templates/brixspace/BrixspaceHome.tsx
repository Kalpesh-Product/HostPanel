import React, { useState } from "react";
import { motion } from "../motion";
import { useBrixspace } from "./BrixspaceContext";
import {
  BxIcon,
  BxImage,
  BxReveal,
  BxRoomCard,
  BxSectionHead,
} from "./BrixspaceUI";

const FACILITIES = [
  [
    "Comfortable lounge",
    "A relaxed place for arrivals, breaks and conversations between sessions.",
  ],
  [
    "Meeting-ready technology",
    "Fast Wi-Fi, display screens and dependable video calls without setup stress.",
  ],
  [
    "Hospitality on hand",
    "Coffee, refreshments and an on-site team ready before your guests arrive.",
  ],
  [
    "Flexible room layouts",
    "Boardroom, classroom or workshop layouts shaped around the work you are doing.",
  ],
];

const MENU_FACILITIES = [
  [
    "Fresh from the kitchen",
    "Seasonal ingredients, careful preparation and plates made to order.",
  ],
  [
    "Coffee made properly",
    "Quality beans, balanced extraction and every cup served exactly as it should be.",
  ],
  [
    "A table for every mood",
    "Comfortable corners for quick breakfasts, long lunches and unhurried conversations.",
  ],
  [
    "Warm hospitality",
    "A welcoming team that notices the details from your first order to the final sip.",
  ],
];

export const BrixspaceHome: React.FC = () => {
  const { t, draft, primary, profile, kind, c, photo, openLead } =
    useBrixspace();
  const [facility, setFacility] = useState(0);
  const items = primary?.items || [];
  const gallery = t.galleryItems || [];
  const hero = photo(
    "home.hero.image",
    t.homeHeroImage || primary?.heroImage || gallery[0],
  );
  const review = t.testimonials?.[0];
  const reviewText =
    review?.quote ||
    review?.review ||
    review?.testimonial ||
    review?.testimony ||
    review?.text;
  const isMenu = kind === "menu";
  const facilities = isMenu ? MENU_FACILITIES : FACILITIES;
  const companyName = draft.companyName || (isMenu ? "Our cafe" : "Brix Rooms");
  return (
    <>
      <section className="bx-hero">
        <div className="bx-shell">
          <motion.div
            className="bx-hero-media"
            initial={{ clipPath: "inset(0 0 100% 0 round 28px)" }}
            animate={{ clipPath: "inset(0 0 0% 0 round 28px)" }}
            transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <BxImage
              src={hero}
              alt={isMenu ? "Cafe interior" : "Meeting room community"}
            />
            <div className="bx-hero-shade" />
            <motion.div
              className="bx-hero-copy"
              initial={{ opacity: 0, y: 44 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.85 }}
            >
              <p className="bx-kicker">
                {c(
                  "home.hero.eyebrow",
                  isMenu
                    ? "Coffee, plates and good company"
                    : "Growth-sparking spaces",
                )}
              </p>
              <h1>
                {c(
                  "home.hero.title",
                  draft.title ||
                    (isMenu
                      ? "Made Fresh, Shared Slowly"
                      : "Connect, Collaborate, Grow Together"),
                )}
              </h1>
              <p>
                {c(
                  "home.hero.body",
                  draft.subTitle ||
                    (isMenu
                      ? "A neighbourhood cafe for thoughtful coffee, fresh food and time well spent together."
                      : "Meeting rooms made for useful conversations, clear decisions and teams moving forward."),
                )}
              </p>
              <div>
                <button
                  type="button"
                  className="bx-primary"
                  onClick={() => t.goToSection("products")}
                >
                  {isMenu
                    ? "View Menu Items"
                    : `Explore ${profile.labels.listing}`}{" "}
                  {BxIcon.arrow()}
                </button>
                <button
                  type="button"
                  className="bx-play"
                  onClick={() => t.goToSection("gallery")}
                >
                  {BxIcon.play()} Take a look
                </button>
              </div>
            </motion.div>
            <motion.aside
              className="bx-hero-float"
              initial={{ opacity: 0, x: 45 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.65, duration: 0.7 }}
            >
              <BxImage
                src={gallery[2] || items[0]?.image || hero}
                alt={isMenu ? "Cafe favourite" : "Collaborative room"}
              />
              <span>
                {isMenu ? (
                  <>
                    Made fresh
                    <br />
                    every day
                  </>
                ) : (
                  <>
                    Collaborate
                    <br />
                    and grow
                  </>
                )}
              </span>
            </motion.aside>
            <div className="bx-hero-proof">
              <strong>100+</strong>
              <span>
                {isMenu ? (
                  <>
                    happy guests
                    <br />
                    served every week
                  </>
                ) : (
                  <>
                    teams meeting
                    <br />
                    better every month
                  </>
                )}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bx-intro bx-pad">
        <div className="bx-shell bx-intro-grid">
          <BxReveal>
            <p className="bx-kicker">About us</p>
            <h2>
              {c(
                "home.about.title",
                isMenu
                  ? "Good days begin around a welcoming table."
                  : "We build great work through better connections.",
              )}
            </h2>
          </BxReveal>
          <BxReveal delay={0.08}>
            <p>
              {c(
                "home.about.body",
                draft.aboutPageStory ||
                  (isMenu
                    ? "From the first morning coffee to a late lunch with friends, everything is prepared with care and served without rush."
                    : "From a two-person interview to a thirty-person workshop, every room is prepared around the people and purpose inside it."),
              )}
            </p>
            <button
              type="button"
              className="bx-text-link"
              onClick={() => t.goToSection("about")}
            >
              Meet {companyName} {BxIcon.arrow()}
            </button>
          </BxReveal>
        </div>
      </section>

      {items.length && primary ? (
        <section className="bx-spaces bx-pad">
          <div className="bx-shell">
            <BxSectionHead
              eyebrow={isMenu ? "Menu highlights" : "Space options"}
              title={c(
                "home.rooms.title",
                isMenu
                  ? "A favourite for every appetite."
                  : "The ideal room, solo or with a team.",
              )}
              body={c(
                "home.rooms.body",
                isMenu
                  ? "Explore fresh plates, cafe classics and drinks made for every part of your day."
                  : "Compare capacities, facilities and rates, then reserve the setting that fits your agenda.",
              )}
              action={
                <button
                  type="button"
                  className="bx-text-link"
                  onClick={() => t.goToSection("products")}
                >
                  {isMenu
                    ? "View all menu items"
                    : `View all ${profile.labels.items}`}{" "}
                  {BxIcon.arrow()}
                </button>
              }
            />
            <div
              className={`bx-room-grid bx-room-count-${Math.min(items.length, 6)}`}
            >
              {items.slice(0, 6).map((item, index) => (
                <BxRoomCard
                  key={item.key}
                  service={primary}
                  item={item}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bx-facilities bx-pad">
        <div className="bx-shell">
          <BxSectionHead
            eyebrow={isMenu ? "The experience" : "Our facilities"}
            title={c(
              "home.facilities.title",
              isMenu
                ? "Every detail makes the table feel warmer."
                : "Every corner helps your meeting flow.",
            )}
            body={
              isMenu
                ? "Fresh ingredients, thoughtful drinks and genuine hospitality are part of every visit."
                : "Useful technology, genuine comfort and thoughtful support are built into the experience."
            }
          />
          <div className="bx-facility-stage">
            <div className="bx-facility-tabs">
              {facilities.map(([title, body], index) => (
                <button
                  type="button"
                  key={title}
                  className={facility === index ? "active" : ""}
                  onMouseEnter={() => setFacility(index)}
                  onClick={() => setFacility(index)}
                >
                  <span>0{index + 1}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                  {BxIcon.arrow()}
                </button>
              ))}
            </div>
            <motion.div
              className="bx-facility-image"
              key={facility}
              initial={{ opacity: 0.35, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45 }}
            >
              <BxImage
                src={gallery[facility + 3] || items[facility]?.image || hero}
                alt={facilities[facility][0]}
              />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bx-location">
        <div className="bx-shell bx-location-grid">
          <BxReveal>
            <p className="bx-kicker">Our location</p>
            <h2>
              {c(
                "home.location.title",
                isMenu
                  ? "Your next favourite table is waiting."
                  : "Your next great idea starts in the right room.",
              )}
            </h2>
            <p>{t.contactAddress}</p>
            <button
              type="button"
              className="bx-primary"
              onClick={() => t.goToSection("contact")}
            >
              Plan your visit {BxIcon.arrow()}
            </button>
          </BxReveal>
          <div className="bx-location-list">
            {(isMenu
              ? ["Sip", "Taste", "Share", "Pause", "Return"]
              : ["Meet", "Think", "Shape", "Decide", "Grow"]
            ).map((word, index) => (
              <BxReveal key={word} delay={index * 0.05}>
                <span>0{index + 1}</span>
                <strong>{word}</strong>
                <i>{BxIcon.arrow()}</i>
              </BxReveal>
            ))}
          </div>
          <div className="bx-location-images">
            <BxImage
              src={gallery[7] || hero}
              alt={isMenu ? "Cafe exterior" : "Meeting room exterior"}
            />
            <BxImage
              src={gallery[8] || gallery[1] || hero}
              alt={isMenu ? "Cafe interior" : "Meeting room interior"}
            />
          </div>
        </div>
      </section>

      <section className="bx-story bx-pad">
        <div className="bx-shell">
          <BxSectionHead
            eyebrow="Why choose us"
            title={c(
              "home.why.title",
              isMenu
                ? "Where familiar flavours meet fresh ideas."
                : "Where thoughtful teams come to meet.",
            )}
            body={
              isMenu
                ? "Honest ingredients, relaxed service and people who care about every plate."
                : "Calm rooms, dependable technology and people who notice the details before you need to ask."
            }
          />
          <div className="bx-story-grid">
            <BxReveal>
              <BxImage
                src={gallery[9] || hero}
                alt={isMenu ? "Fresh cafe food" : "Team collaborating"}
              />
            </BxReveal>
            <BxReveal delay={0.08}>
              <div className="bx-story-card">
                <strong>96%</strong>
                <p>
                  {isMenu
                    ? "of guests say they would return for another plate and another cup."
                    : "of guests say the room helped their meeting run more smoothly."}
                </p>
                <button
                  type="button"
                  onClick={() => primary?.leadEnabled && openLead(primary)}
                >
                  {profile.labels.cta} {BxIcon.arrow()}
                </button>
              </div>
            </BxReveal>
            <BxReveal delay={0.14}>
              <BxImage
                src={gallery[10] || gallery[4] || hero}
                alt={isMenu ? "Welcoming cafe table" : "Bright meeting space"}
              />
            </BxReveal>
          </div>
        </div>
      </section>

      <section className="bx-testimonials bx-pad">
        <div className="bx-shell">
          <BxSectionHead
            eyebrow="Testimonials"
            title={c(
              "home.testimonials.title",
              isMenu
                ? "Good food makes better stories."
                : "Good rooms make better stories.",
            )}
          />
          <div className="bx-testimonial-grid">
            <BxImage
              src={gallery[11] || gallery[5] || hero}
              alt={isMenu ? "Cafe guests" : "Member community"}
            />
            {review ? (
              <article>
                <span>“</span>
                <blockquote>{reviewText}</blockquote>
                <strong>
                  {review.name ||
                    review.reviewerName ||
                    (isMenu ? "Cafe guest" : "Meeting guest")}
                </strong>
                <p>{review.role || (isMenu ? "Regular guest" : "Team lead")}</p>
              </article>
            ) : null}
            <article className="bx-green-card">
              <span>100+</span>
              <h3>
                {isMenu
                  ? "Made for the neighbourhood"
                  : "Community-driven meetings"}
              </h3>
              <p>
                {isMenu
                  ? "Morning regulars, lunch catch-ups and new guests finding their favourite table."
                  : "Independent teams, growing companies and facilitators choosing a better place to gather."}
              </p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
};
