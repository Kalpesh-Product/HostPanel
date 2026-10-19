import React from "react";
import { motion } from "../motion";
import { priceWithUnit } from "../templateKit";
import { useTpl } from "../shared/TplContext";
import {
  ChArrow,
  ChLabel,
  ChLifePhoto,
  ChPhoto,
  ChReveal,
} from "./CaliHostelUI";

export const CaliHostelHome: React.FC = () => {
  const { t, draft, primary, services, openLead, goToItem, c, photo } =
    useTpl();
  const hero = photo(
    "home.hero.image",
    t.heroImages?.[0] || primary?.heroImage || t.galleryItems?.[0] || "",
  );
  const gallery: string[] = t.galleryItems || [];
  const rooms = primary?.items || [];
  const book = () => (primary ? openLead(primary) : t.goToSection("contact"));
  const address = t.contactAddress || draft?.address || "";
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const flowRows = [gallery.slice(0, 7), gallery.slice(7, 14)].filter(
    (row) => row.length,
  );
  const facts = [
    ["04", "Room styles"],
    ["24/7", "Host on site"],
    ["01", "Shared kitchen"],
    ["∞", "Local stories"],
  ];
  return (
    <>
      <section className="ch-hero">
        <motion.img
          src={hero}
          alt=""
          className="ch-hero-image"
          initial={{ scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="ch-hero-shade" />
        <div className="ch-hero-copy">
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
          >
            {c("home.hero.eyebrow", "A hostel for curious people")}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            {draft?.title || "Come for the coast. Stay for the people."}
          </motion.h1>
          <motion.div
            className="ch-hero-bottom"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.7 }}
          >
            <p>
              {draft?.subTitle ||
                "Social rooms, deep sleep and good stories in the middle of everything."}
            </p>
            <button type="button" onClick={book}>
              {draft?.buttonText || "Find your bed"}
              <ChArrow />
            </button>
          </motion.div>
        </div>
        <div className="ch-scroll-note">
          <span /> Scroll to meet the house
        </div>
      </section>

      <section className="ch-ticker" aria-label="Hostel highlights">
        <div>
          <span>SLEEP EASY</span>
          <i>✦</i>
          <span>MEET PEOPLE</span>
          <i>✦</i>
          <span>WANDER FAR</span>
          <i>✦</i>
          <span>COME BACK LATE</span>
          <i>✦</i>
        </div>
      </section>

      <section className="ch-intro ch-dark">
        <div className="ch-shell ch-intro-grid">
          <ChReveal>
            <ChLabel>{c("home.story.eyebrow", "More than a room")}</ChLabel>
            <h2>{c("home.story.title", "A soft landing for big days out.")}</h2>
          </ChReveal>
          <ChReveal delay={0.08} className="ch-intro-copy">
            <p>
              {t.aboutIntroBlocks?.[0] ||
                "Marea House is a lively, design-led hostel where solo travellers, weekend friends and slow explorers share the same table."}
            </p>
            <button
              type="button"
              className="ch-text-link"
              onClick={() => t.goToSection("about")}
            >
              {c("home.story.link", "Meet the house")}
              <ChArrow />
            </button>
          </ChReveal>
        </div>
        <div className="ch-shell ch-cinema">
          <ChReveal className="ch-cinema-a">
            <ChPhoto
              src={photo("home.story.image1", gallery[1] || hero)}
              alt="Guests relaxing at the hostel"
            />
          </ChReveal>
          <ChReveal className="ch-cinema-b" delay={0.12}>
            <ChPhoto
              src={photo("home.story.image2", gallery[2] || primary?.cardImage)}
              alt="Hostel common area"
            />
          </ChReveal>
          <ChReveal className="ch-cinema-c" delay={0.2}>
            <ChPhoto
              src={photo("home.story.image3", gallery[3] || hero)}
              alt="Local adventure"
            />
          </ChReveal>
        </div>
      </section>

      {flowRows.length ? (
        <section className="ch-flow ch-dark">
          <ChReveal className="ch-shell ch-flow-intro">
            <ChLabel>{c("home.motion.eyebrow", "The house in motion")}</ChLabel>
            <h2>{c("home.motion.title", "Arrive solo. Move together.")}</h2>
          </ChReveal>
          <div className="ch-flow-rails">
            {flowRows.map((row, rowIndex) => (
              <div className="ch-flow-window" key={rowIndex}>
                <div
                  className={`ch-flow-track ${rowIndex % 2 ? "is-reverse" : ""}`}
                >
                  {[0, 1].map((copy) => (
                    <div
                      className="ch-flow-set"
                      aria-hidden={copy === 1}
                      key={copy}
                    >
                      {row.map((src, index) => {
                        const galleryIndex = rowIndex * 7 + index;
                        return (
                          <button
                            type="button"
                            key={`${copy}-${src}-${index}`}
                            onClick={() => t.openGalleryViewer(galleryIndex)}
                          >
                            <img
                              src={src}
                              alt={
                                copy ? "" : `Hostel life ${galleryIndex + 1}`
                              }
                              loading="lazy"
                            />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="ch-rooms">
        <div className="ch-shell">
          <ChReveal className="ch-section-heading">
            <div>
              <ChLabel>{c("home.rooms.eyebrow", "Choose your base")}</ChLabel>
              <h2>{c("home.rooms.title", "Sleep your way.")}</h2>
            </div>
            <p>
              {c(
                "home.rooms.sub",
                "Bunk with new friends, settle into a female-only dorm, or take a private room for a quieter night.",
              )}
            </p>
          </ChReveal>
          <div className="ch-room-list">
            {rooms.slice(0, 4).map((room, index) => (
              <ChReveal key={room.key} delay={Math.min(index * 0.05, 0.15)}>
                <button
                  type="button"
                  className="ch-room-row"
                  onClick={() => primary && goToItem(primary, room)}
                >
                  <span className="ch-room-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <ChPhoto src={room.image} alt={room.title} />
                  <span className="ch-room-info">
                    <strong>{room.title}</strong>
                    <small>
                      {room.chips.slice(0, 3).join(" · ") || room.description}
                    </small>
                  </span>
                  <span className="ch-room-price">
                    {priceWithUnit(room.price, room.priceUnit) || "Ask us"}
                  </span>
                  <ChArrow />
                </button>
              </ChReveal>
            ))}
          </div>
          {primary ? (
            <button
              type="button"
              className="ch-pill-link"
              onClick={() => t.goToProductPage(primary.slug)}
            >
              See every room <ChArrow />
            </button>
          ) : null}
        </div>
      </section>

      <section className="ch-life ch-dark">
        <div className="ch-life-sticky">
          <ChLabel>{c("home.life.eyebrow", "Life at Marea")}</ChLabel>
          <h2>{c("home.life.title", "A bed. A table. A city waiting.")}</h2>
          <p>
            {c(
              "home.life.sub",
              "The best hostel moments happen between plans—over breakfast, on the roof, or halfway through a story with someone you just met.",
            )}
          </p>
        </div>
        <div className="ch-life-scenes">
          {[
            ["01", "Wake up rested", gallery[4] || hero],
            ["02", "Share the long table", gallery[5] || hero],
            ["03", "Follow the local trail", gallery[6] || hero],
          ].map(([n, title, src], index) => (
            <ChReveal key={n} className={`ch-life-scene scene-${index + 1}`}>
              <ChLifePhoto src={src} alt={title} index={index} />
              <div>
                <span>{n}</span>
                <h3>{title}</h3>
              </div>
            </ChReveal>
          ))}
        </div>
      </section>

      <section className="ch-facts">
        <div className="ch-shell">
          <ChReveal>
            <ChLabel>{c("home.facts.eyebrow", "House essentials")}</ChLabel>
            <h2>
              {c("home.facts.title", "Everything you need. Nothing you don’t.")}
            </h2>
          </ChReveal>
          <div className="ch-fact-grid">
            {facts.map(([value, label]) => (
              <ChReveal key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </ChReveal>
            ))}
          </div>
        </div>
      </section>

      {gallery.length ? (
        <section className="ch-gallery-preview">
          <div className="ch-shell">
            <ChReveal className="ch-section-heading">
              <div>
                <ChLabel>
                  {c("home.gallery.eyebrow", "The camera roll")}
                </ChLabel>
                <h2>
                  {c(
                    "home.gallery.title",
                    "This is what a good stay looks like.",
                  )}
                </h2>
              </div>
              <button
                type="button"
                className="ch-text-link"
                onClick={() => t.goToSection("gallery")}
              >
                Open gallery <ChArrow />
              </button>
            </ChReveal>
          </div>
          <div className="ch-gallery-track">
            {gallery.slice(0, 6).map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                onClick={() => t.openGalleryViewer(index)}
                className={index % 3 === 1 ? "is-tall" : ""}
              >
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="ch-map-story">
        <div className="ch-shell ch-map-heading">
          <ChReveal>
            <ChLabel>
              {c("home.location.eyebrow", "Right in the rhythm")}
            </ChLabel>
            <h2>
              {c(
                "home.location.title",
                "Close to the beach. Closer to the good stuff.",
              )}
            </h2>
          </ChReveal>
          <ChReveal delay={0.08} className="ch-map-meta">
            <p>{address}</p>
            <div>
              <a
                className="ch-pill-link"
                href={mapsLink}
                target="_blank"
                rel="noreferrer"
              >
                Open in maps <ChArrow />
              </a>
              <button
                type="button"
                className="ch-text-link"
                onClick={() => t.goToSection("contact")}
              >
                Plan your arrival
              </button>
            </div>
          </ChReveal>
        </div>
        <ChReveal delay={0.12} className="ch-shell ch-map-frame">
          {draft?.mapUrl ? (
            <iframe title="Map" src={draft.mapUrl} loading="lazy" />
          ) : (
            <ChPhoto src={gallery[7] || hero} alt="Neighbourhood" />
          )}
        </ChReveal>
      </section>

      <section className="ch-final-cta">
        <ChPhoto src={gallery[8] || hero} alt="Hostel guests together" />
        <div className="ch-final-overlay" />
        <ChReveal className="ch-final-copy">
          <ChLabel>{c("home.cta.eyebrow", "Your bunk is waiting")}</ChLabel>
          <h2>
            {c(
              "home.cta.title",
              "Check in as a guest. Leave with a group chat.",
            )}
          </h2>
          <button type="button" onClick={book}>
            Book the stay <ChArrow />
          </button>
        </ChReveal>
      </section>
    </>
  );
};
