import React, { useState } from "react";
import { motion } from "../motion";
import { useWorpace } from "./WorpaceContext";
import {
  Icon,
  Placeholder,
  Reveal,
  SectionLabel,
  SpaceCard,
} from "./WorpaceUI";
import { WorpaceFaq } from "./WorpacePages";

const BENEFITS = [
  [
    "Flexible Membership Options",
    "Choose daily, monthly or team access without a rigid long-term commitment.",
  ],
  [
    "Fully Equipped Workspaces",
    "Fast Wi-Fi, ergonomic furniture and meeting technology are ready when you arrive.",
  ],
  [
    "24/7 Secure Access",
    "Work on your own schedule with controlled access and on-site support.",
  ],
  [
    "Community Networking Events",
    "Meet founders, freelancers and teams through practical community sessions.",
  ],
];

const Hero: React.FC = () => {
  const { t, draft, primary, openLead, c } = useWorpace();
  const hero = t.heroImages?.[0] || primary?.heroImage || t.galleryItems?.[0];
  const [date, setDate] = useState("");
  const [interest, setInterest] = useState("");
  const [people, setPeople] = useState("");
  const startReservation = () => {
    if (!primary) return;
    openLead(primary, null, {
      form: { startDate: date, people },
      extras: { roomType: interest },
    });
  };
  return (
    <section className="wp-hero">
      <div className="wp-shell">
        <motion.h1
          initial={{ opacity: 0, y: 44 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {draft?.title || c("home.hero.title", "CREATIVE WORKSPACE")}
        </motion.h1>
        <div className="wp-hero-meta">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="wp-hero-thumb">
              {t.heroImages?.[1] ? (
                <img src={t.heroImages[1]} alt="Collaborative workspace" />
              ) : (
                <Placeholder />
              )}
            </div>
            <span className="wp-icon-box">↗</span>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {draft?.subTitle ||
              "A calm, design-led place to focus, collaborate and grow your next idea."}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.48 }}
          >
            <strong>{c("home.hero.side", "Join the new work era")}</strong>
            <button
              type="button"
              className="wp-cta wp-cta-light"
              onClick={() => t.goToSection("products")}
            >
              {draft?.CTAButtonText || "Get Started"} {Icon.arrow()}
            </button>
          </motion.div>
        </div>
        <motion.div
          className="wp-hero-photo"
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: 1.15, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {hero ? (
            <motion.img
              src={hero}
              alt="Modern co-working space"
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 1.5,
                delay: 0.25,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          ) : (
            <Placeholder />
          )}
          <div className="wp-reserve">
            <p>Best desk workspace</p>
            <h2>{c("home.reserve.title", "Reserve your office space")}</h2>
            <div className="wp-reserve-fields">
              <label>
                <small>Date</small>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setDate(event.target.value)}
                  aria-label="Preferred start date"
                />
              </label>
              <label>
                <small>Interested in</small>
                <select
                  value={interest}
                  onChange={(event) => setInterest(event.target.value)}
                  aria-label="Interested in"
                >
                  <option value="">Not sure yet</option>
                  {(primary?.items || []).map((item) => (
                    <option key={item.key} value={item.title}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <small>People</small>
                <input
                  type="number"
                  value={people}
                  min="1"
                  onChange={(event) => setPeople(event.target.value)}
                  placeholder="Team size"
                  aria-label="Team size"
                />
              </label>
              <button
                type="button"
                onClick={startReservation}
                disabled={!primary}
              >
                Get started with us {Icon.arrow()}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const People: React.FC = () => {
  const { t, c } = useWorpace();
  const faces =
    t.founders
      ?.map((x: any) => (typeof x.image === "string" ? x.image : x.image?.url))
      .filter(Boolean)
      .slice(0, 4) || [];
  return (
    <section className="wp-people">
      <div className="wp-shell wp-people-grid">
        <Reveal>
          <h2>{c("home.people.title", "The people behind the work")}</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <SectionLabel>
            {c("home.people.label", "Workspace today")}
          </SectionLabel>
          <p>
            {c(
              "home.people.body",
              "A diverse community of independent professionals and growing teams who value useful connections as much as quiet focus.",
            )}
          </p>
          <div className="wp-face-row">
            {faces.map((src: string, index: number) => (
              <img src={src} alt="" key={src} />
            ))}
            <span>
              500+<small>members</small>
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

const Spaces: React.FC = () => {
  const { services, t, c } = useWorpace();
  const items = services
    .flatMap((service) => service.items.map((item) => ({ service, item })))
    .slice(0, 4);
  return (
    <section className="wp-spaces">
      <div className="wp-shell">
        <div className="wp-section-head">
          <div>
            <SectionLabel>
              {c("home.spaces.label", "Workspace today")}
            </SectionLabel>
            <h2>{c("home.spaces.title", "Workspace options that fit you")}</h2>
          </div>
          <button
            type="button"
            className="wp-text-link"
            onClick={() => t.goToSection("products")}
          >
            Explore all spaces {Icon.arrow()}
          </button>
        </div>
        {items.length ? (
          <div className={`wp-space-grid wp-count-${items.length}`}>
            {items.map(({ service, item }, index) => (
              <Reveal key={item.key} delay={index * 0.07}>
                <SpaceCard service={service} item={item} index={index} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="wp-empty">
            Add coworking spaces in the website builder to show them here.
          </div>
        )}
      </div>
    </section>
  );
};

const Why: React.FC = () => {
  const { t, c } = useWorpace();
  const [active, setActive] = useState(0);
  const image = t.aboutIntroImage || t.galleryItems?.[1] || t.heroImages?.[1];
  return (
    <section className="wp-why">
      <div className="wp-shell wp-why-grid">
        <div>
          <SectionLabel>{c("home.why.label", "Why choose")}</SectionLabel>
          <h2>{c("home.why.title", "Where productivity meets comfort")}</h2>
          <div className="wp-accordion">
            {BENEFITS.map(([title, body], index) => (
              <div key={title} className={active === index ? "is-open" : ""}>
                <button type="button" onClick={() => setActive(index)}>
                  <span>{title}</span>
                  {active === index ? "−" : "+"}
                </button>
                {active === index ? (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                  >
                    {body}
                  </motion.p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <Reveal className="wp-why-photo">
          {image ? <img src={image} alt="Meeting room" /> : <Placeholder />}
          <div className="wp-stats">
            {[
              ["500+", "Happy members"],
              ["12+", "Years experience"],
              ["35+", "Company partners"],
              ["200+", "Successful events"],
            ].map(([n, l]) => (
              <div key={l}>
                <strong>{n}</strong>
                <span>{l}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

const Difference: React.FC = () => {
  const { t, c } = useWorpace();
  const image = t.galleryItems?.[2] || t.heroImages?.[2];
  return (
    <section className="wp-difference">
      <div className="wp-shell">
        <div className="wp-difference-head">
          <SectionLabel>
            {c("home.difference.label", "Workspace today")}
          </SectionLabel>
          <h2>
            {c("home.difference.title", "Discover the Worpace difference")}
          </h2>
        </div>
        <div className="wp-difference-grid">
          <Reveal className="wp-difference-photo">
            {image ? (
              <img src={image} alt="Light-filled office" />
            ) : (
              <Placeholder />
            )}
          </Reveal>
          <Reveal delay={0.08}>
            <div className="wp-progress">
              <div>
                <span>Prime city locations</span>
                <strong>90%</strong>
                <i>
                  <motion.b
                    initial={{ width: 0 }}
                    whileInView={{ width: "90%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
                  />
                </i>
              </div>
              <div>
                <span>24/7 secure access</span>
                <strong>80%</strong>
                <i>
                  <motion.b
                    initial={{ width: 0 }}
                    whileInView={{ width: "80%" }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 1.05,
                      delay: 0.12,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                </i>
              </div>
            </div>
            <p>
              {c(
                "home.difference.body",
                "Thoughtful locations, reliable facilities and a team that keeps every workday running smoothly.",
              )}
            </p>
            <button
              type="button"
              className="wp-cta"
              onClick={() => t.goToSection("about")}
            >
              About us {Icon.arrow()}
            </button>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

const Gallery: React.FC = () => {
  const { t } = useWorpace();
  const items = t.galleryItems.slice(0, 5);
  if (!items.length) return null;
  return (
    <section className="wp-gallery-rail">
      <div className="wp-gallery-track">
        {[...items, ...items].map((src: string, index: number) => (
          <button
            type="button"
            key={index}
            onClick={() => t.openGalleryViewer(index % items.length)}
          >
            <img src={src} alt="Workspace" />
            <span>{String((index % items.length) + 1).padStart(2, "0")}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export const WorpaceHome: React.FC = () => {
  const { draft } = useWorpace();
  return (
    <>
      <Hero />
      <People />
      <Spaces />
      <Why />
      <Difference />
      <WorpaceFaq faqs={draft?.faqs} />
      <Gallery />
    </>
  );
};
