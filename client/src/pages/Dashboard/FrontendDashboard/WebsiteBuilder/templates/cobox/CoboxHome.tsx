import React, { useRef, useState } from "react";
import { motion } from "../motion";
import { priceWithUnit } from "../templateKit";
import type { Service, ServiceItem } from "../serviceAdapter";
import { LeadFormPanel } from "../shared/TplLead";
import { MessageForm } from "../shared/TplForms";
import { useCobox } from "./CoboxContext";
import {
  CCtaButton,
  CEyebrow,
  CIcon,
  CPlaceholder,
  CReveal,
  CStars,
} from "./CoboxUI";

const FACE_POOL = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&crop=faces&w=120&h=120&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&crop=faces&w=120&h=120&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&crop=faces&w=120&h=120&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&crop=faces&w=120&h=120&q=80",
];

const srcOf = (value: any): string =>
  typeof value === "string" ? value : String(value?.url || value?.src || "");

const PeopleStack: React.FC<{ images?: string[]; more?: number }> = ({
  images = [],
  more,
}) => (
  <span className="cbx-people-stack">
    {(images.length ? images.slice(0, 4) : FACE_POOL.slice(0, 3)).map(
      (image, index) =>
        image ? <img key={image + index} src={image} alt="" /> : null
    )}
    {more ? <span>+{more}</span> : null}
  </span>
);

const Hero: React.FC = () => {
  const { t, draft, services, primary, rating, c } = useCobox();
  const hero =
    t.heroImages?.[0] || primary?.heroImage || t.galleryItems?.[0] || "";
  const avatars = (t.testimonials || [])
    .map((item: any) => srcOf(item.image))
    .filter(Boolean)
    .slice(0, 3);
  const marquee =
    services.length > 0
      ? services.map((service) => service.name)
      : ["Flexible desks", "Private offices", "Meeting rooms", "Day passes"];
  return (
    <section className="cbx-hero">
      {hero ? <img className="cbx-hero-bg" src={hero} alt="" /> : null}
      <span className="cbx-hero-shade" aria-hidden="true" />
      <div className="cbx-hero-grid">
        <div className="cbx-hero-copy">
          <motion.div
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <CEyebrow light>
              {c("home.hero.eyebrow", "Your space to create")}
            </CEyebrow>
            <h1>
              {draft?.title ||
                c(
                  "home.hero.title",
                  "Flexible co-working spaces tailored to your needs"
                )}
            </h1>
            <p>
              {draft?.subTitle ||
                c(
                  "home.hero.body",
                  "Discover modern, inspiring and fully equipped workspaces designed to fuel creativity, collaboration and growth."
                )}
            </p>
            <div className="cbx-hero-actions">
              <CCtaButton
                onClick={() =>
                  primary ? t.goToProductPage(primary.slug) : t.goToSection("products")
                }
              >
                {draft?.CTAButtonText || "Book a trial visit"}
              </CCtaButton>
              <div className="cbx-people">
                <PeopleStack images={avatars} />
                <span>
                  <b>95%</b> — client satisfaction rate
                </span>
              </div>
            </div>
          </motion.div>
        </div>
        <motion.aside
          className="cbx-hero-side"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="cbx-hero-rating">
            <div className="cbx-hero-rating-head">
              <span>Google rating</span>
              <b>{(rating.avg || 5).toFixed(1)}</b>
            </div>
            <CStars value={Math.round(rating.avg || 5)} />
            <p>
              “
              {c(
                "home.hero.quote",
                "A perfect balance of comfort and productivity."
              )}
              ”
            </p>
          </div>
          <div className="cbx-hero-clients">
            <p>
              <b>1,000+</b> trusted clients worldwide
            </p>
            <div className="cbx-marquee" aria-hidden="true">
              <div className="cbx-marquee-track">
                {[...marquee, ...marquee].map((name, index) => (
                  <span key={`${name}-${index}`}>{name}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
  );
};

const About: React.FC = () => {
  const { t, draft, services, c, photo } = useCobox();
  const images = (draft?.aboutPageImages || []).map(srcOf).filter(Boolean);
  const fallback = t.galleryItems || [];
  const avatars = (t.testimonials || [])
    .map((item: any) => srcOf(item.image))
    .filter(Boolean)
    .slice(0, 4);
  const cardImage =
    photo("home.about.image", images[0] || fallback[2] || fallback[0]) || "";
  const accentImage =
    photo("home.about.accentImage", images[1] || fallback[3] || fallback[1]) || "";
  const spaces = services.reduce((total, service) => total + service.items.length, 0);
  return (
    <section className="cbx-section cbx-about">
      <div className="cbx-shell">
        <div className="cbx-head center">
          <CEyebrow>{c("home.about.eyebrow", "About us")}</CEyebrow>
          <h2>
            {c("home.about.title.lead", "Transforming everyday")}{" "}
            {cardImage ? (
              <span className="cbx-inline-photo">
                <img src={cardImage} alt="" />
              </span>
            ) : null}{" "}
            {c("home.about.title.mid", "work into extraordinary")}{" "}
            {avatars.length ? (
              <span className="cbx-inline-avatars">
                {avatars.map((image) => (
                  <img key={image} src={image} alt="" />
                ))}
              </span>
            ) : null}{" "}
            {c(
              "home.about.title.tail",
              "opportunities through inspiring office spaces"
            )}
          </h2>
        </div>

        <div className="cbx-about-grid">
          <CReveal>
            <article className="cbx-about-card is-light">
              <div>
                <h3>
                  {c(
                    "home.about.card1.title",
                    "Driven professionals committed to building inspiring workspaces that help businesses succeed"
                  )}
                </h3>
                <CCtaButton
                  className="mt-6"
                  variant="ghost"
                  onClick={() => t.goToSection("contact")}
                >
                  Contact us
                </CCtaButton>
              </div>
              <div>
                <div
                  style={{
                    borderTop: "1px solid var(--cbx-line)",
                    paddingTop: 22,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <PeopleStack images={avatars} />
                  <p style={{ fontSize: 13 }}>
                    {c("home.about.team", "Meet our workspace expert")}
                  </p>
                </div>
              </div>
            </article>
          </CReveal>

          <CReveal delay={0.06}>
            <article className="cbx-about-card is-plain">
              <h3>
                {c(
                  "home.about.card2.title",
                  "Innovative office solutions that combine comfort, productivity and scalability"
                )}
              </h3>
              <div className="cbx-about-media">
                {cardImage ? (
                  <img className="cbx-photo" src={cardImage} alt="Workspace" />
                ) : (
                  <CPlaceholder text="Workspace" />
                )}
              </div>
              <div className="cbx-about-float">
                <span className="cbx-about-icon">{CIcon.spark(20)}</span>
                <div>
                  <p>
                    {c(
                      "home.about.card2.body",
                      "Discover modern office solutions that boost comfort, productivity and scale with ease."
                    )}
                  </p>
                  <div className="cbx-chips">
                    {["Workspace", "Collaboration", "Modern"].map((chip) => (
                      <span key={chip}>{chip}</span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </CReveal>

          <CReveal delay={0.12}>
            <article className="cbx-about-card is-accent">
              <div>
                <h2>500+</h2>
                <h3>
                  {c("home.about.card3.title", "Flexible workspaces")}
                </h3>
                <p>
                  {c(
                    "home.about.card3.body",
                    "We've built lasting relationships with businesses of every size."
                  )}
                  {spaces ? ` ${spaces} spaces ready to book today.` : ""}
                </p>
                <div className="cbx-chips">
                  <span>Space</span>
                  <span>Agency</span>
                </div>
              </div>
              {accentImage ? (
                <div className="cbx-about-accent-img">
                  <img className="cbx-photo" src={accentImage} alt="" />
                </div>
              ) : null}
            </article>
          </CReveal>
        </div>

        <div className="cbx-stat-band">
          <h3 style={{ fontSize: 18, fontWeight: 400 }}>
            {c("home.about.stats.title", "A few more facts about us in numbers")}
          </h3>
          <div className="cbx-stat-grid">
            {[
              ["500+", "Happy clients"],
              ["95%", "Client retention"],
              ["50+", "Successful startups"],
              ["40+", "Flexible workspaces"],
            ].map(([value, label]) => (
              <div className="cbx-stat" key={label}>
                <h4>{value}</h4>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const Services: React.FC = () => {
  const { t, services, primary, c } = useCobox();
  const items = primary?.items || [];
  const cards =
    services.length > 1
      ? services.map((service, index) => ({
          key: service.key,
          title: service.heading,
          description: service.subText || service.heroSubHeading || "",
          onClick: () => t.goToProductPage(service.slug),
          active: index === 1,
        }))
      : items.slice(0, 6).map((item, index) => ({
          key: item.key,
          title: item.title,
          description: item.description,
          onClick: () => primary && t.goToProductItem(primary.slug, item.slug),
          active: index === 1,
        }));
  const icons = [CIcon.desk, CIcon.office, CIcon.users, CIcon.room, CIcon.wifi, CIcon.spark];
  return (
    <section className="cbx-section cbx-band cbx-services">
      <div className="cbx-shell">
        <div className="cbx-head center">
          <CEyebrow>{c("home.services.eyebrow", "Our services")}</CEyebrow>
          <h2>
            {c(
              "home.services.title",
              "Comprehensive services supporting growth and team productivity"
            )}
          </h2>
        </div>
        <div className="cbx-service-grid">
          {cards.map((card, index) => (
            <CReveal key={card.key} delay={index * 0.05}>
              <button
                type="button"
                className={`cbx-service-card ${card.active ? "is-active" : ""}`}
                onClick={card.onClick}
              >
                <span className="cbx-service-icon">{icons[index % icons.length](24)}</span>
                <span className="cbx-service-index">0{index + 1}</span>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <span className="cbx-text-link" style={{ marginTop: "auto" }}>
                  Read more {CIcon.arrow(15)}
                </span>
              </button>
            </CReveal>
          ))}
        </div>
        <p className="cbx-sec-foot">
          <span>Free</span>
          {c("home.services.foot", "Shaping smarter workplaces")} —{" "}
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              t.goToSection("contact");
            }}
          >
            Discover what we can do for you!
          </a>
        </p>
      </div>
    </section>
  );
};

const WhatWeDo: React.FC = () => {
  const { t, draft, c, photo } = useCobox();
  const fallback = t.galleryItems || [];
  const main =
    photo("home.do.image1", fallback[2] || fallback[0] || draft?.aboutIntroImage) || "";
  const sub = photo("home.do.image2", fallback[4] || fallback[1]) || "";
  const lines = [
    c("home.do.item1", "Provide flexible workspace solutions"),
    c("home.do.item2", "Create collaborative environments"),
    c("home.do.item3", "Offer modern business amenities"),
    c("home.do.item4", "Host networking and community events"),
  ];
  return (
    <section className="cbx-section cbx-do">
      <div className="cbx-shell cbx-do-grid">
        <CReveal className="cbx-do-collage">
          <div className="cbx-do-main">
            {main ? <img className="cbx-photo" src={main} alt="Our workspace" /> : <CPlaceholder />}
          </div>
          <div className="cbx-do-sub">
            {sub ? <img className="cbx-photo" src={sub} alt="Community" /> : <CPlaceholder />}
          </div>
          <div className="cbx-do-client">
            <h3>1.8k</h3>
            <p>
              {c(
                "home.do.client",
                "Our exceptional spaces and personalised service keep clients coming back."
              )}
            </p>
          </div>
        </CReveal>
        <CReveal delay={0.06}>
          <CEyebrow>{c("home.do.eyebrow", "What we do")}</CEyebrow>
          <h2>
            {c("home.do.title", "Flexible solutions designed around your needs")}
          </h2>
          <p style={{ marginTop: 18 }}>
            {c(
              "home.do.body",
              "Choosing the right workspace is about more than finding a desk. It's about creating an environment where you and your team can thrive."
            )}
          </p>
          <ul className="cbx-check-list">
            {lines.map((line) => (
              <li key={line}>
                <i>{CIcon.check(13)}</i>
                {line}
              </li>
            ))}
          </ul>
          <CCtaButton onClick={() => t.goToSection("contact")}>
            Schedule a free tour
          </CCtaButton>
        </CReveal>
      </div>
    </section>
  );
};

const VideoBand: React.FC = () => {
  const { t, c, photo } = useCobox();
  const image =
    photo("home.video.image", t.galleryItems?.[1] || t.heroImages?.[1]) || "";
  const list = [
    c("home.video.item1", "Take a virtual tour of our workspace"),
    c("home.video.item2", "Discover how our flexible plans work"),
    c("home.video.item3", "Experience our community in action"),
    c("home.video.item4", "Explore our exclusive amenities"),
  ];
  return (
    <section className="cbx-video">
      {image ? <img className="cbx-video-bg" src={image} alt="" /> : null}
      <div className="cbx-shell">
        <h2>
          {c(
            "home.video.title",
            "Experience our dynamic co-working culture through engaging video"
          )}
        </h2>
        <button
          type="button"
          className="cbx-play"
          aria-label="Play workspace video"
          onClick={() => t.openGalleryViewer(0)}
        >
          {CIcon.play(26)}
        </button>
        <div className="cbx-video-list">
          {list.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </div>
    </section>
  );
};

const Projects: React.FC = () => {
  const { t, services, c, photo } = useCobox();
  const gallery = t.galleryItems || [];
  const fromServices = services.slice(0, 2).map((service, index) => ({
    key: service.key,
    tag: service.profile.labels.tag,
    title: service.heroHeading || service.heading,
    image:
      service.heroImage ||
      photo(`home.project.image${index + 1}`, gallery[index + 4] || "") ||
      "",
    onClick: () => t.goToProductPage(service.slug),
  }));
  const cards = [...fromServices];
  gallery.slice(0, 2).forEach((image: string, index: number) => {
    if (cards.length >= 2) return;
    cards.push({
      key: image + index,
      tag: index === 0 ? "Enterprise" : "Innovation",
      title:
        index === 0
          ? "Designing a modern co-working hub for creative entrepreneurs"
          : "Transforming shared office spaces into collaborative communities",
      image,
      onClick: () => t.goToSection("gallery"),
    });
  });
  return (
    <section className="cbx-section cbx-projects">
      <div className="cbx-shell">
        <div className="cbx-head center">
          <CEyebrow>{c("home.projects.eyebrow", "Our project")}</CEyebrow>
          <h2>
            {c(
              "home.projects.title",
              "Explore our completed projects that redefine modern workspaces"
            )}
          </h2>
        </div>
        <div className="cbx-project-grid">
          {cards.map((card, index) => (
            <CReveal key={card.key} delay={index * 0.06}>
              <article className="cbx-project">
                <button
                  type="button"
                  className="cbx-project-media"
                  onClick={card.onClick}
                  aria-label={card.title}
                  style={{ width: "100%", display: "block" }}
                >
                  {card.image ? (
                    <img src={card.image} alt={card.title} />
                  ) : (
                    <CPlaceholder text={card.tag} />
                  )}
                  <span className="cbx-project-arrow">{CIcon.arrowUp(18)}</span>
                </button>
                <span className="cbx-project-tag">{card.tag}</span>
                <h3>
                  <button
                    type="button"
                    onClick={card.onClick}
                    style={{ textAlign: "left", color: "inherit" }}
                  >
                    {card.title}
                  </button>
                </h3>
              </article>
            </CReveal>
          ))}
        </div>
        <p className="cbx-sec-foot">
          {c("home.projects.foot", "Building better workspaces")} —{" "}
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              t.goToSection("contact");
            }}
          >
            Discover how we empower you!
          </a>
        </p>
      </div>
    </section>
  );
};

const Process: React.FC = () => {
  const { t, c } = useCobox();
  const avatars = (t.testimonials || [])
    .map((item: any) => srcOf(item.image))
    .filter(Boolean)
    .slice(0, 3);
  const steps = [
    {
      title: c("home.process.step1.title", "Choose your workspace"),
      body: c(
        "home.process.step1.body",
        "Every business is unique, and your workspace should be too. Choose from hot desks, private offices and team suites."
      ),
    },
    {
      title: c("home.process.step2.title", "Get set up instantly"),
      body: c(
        "home.process.step2.body",
        "Moving in should be effortless. High-speed internet, ergonomic furniture, meeting rooms and premium amenities are ready."
      ),
    },
    {
      title: c("home.process.step3.title", "Focus on your growth"),
      body: c(
        "home.process.step3.body",
        "Your workspace should empower your ambitions, not distract you. We handle facilities, services and support."
      ),
    },
  ];
  return (
    <section className="cbx-process cbx-dark">
      <div className="cbx-shell cbx-process-grid">
        <CReveal>
          <CEyebrow light>{c("home.process.eyebrow", "How it works")}</CEyebrow>
          <h2>
            {c(
              "home.process.title",
              "How our co-working solutions empower your success"
            )}
          </h2>
          <p>
            {c(
              "home.process.body",
              "Our numbers speak louder than words. With years of experience and a proven track record, we deliver flexible workspace solutions that work."
            )}
          </p>
          <div className="cbx-process-people">
            <PeopleStack images={avatars} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>
              Loved by teams of every size
            </span>
          </div>
          <div className="cbx-process-stats">
            {[
              ["500+", "Happy clients"],
              ["95%", "Client retention"],
              ["50+", "Flexible workspaces"],
            ].map(([value, label]) => (
              <div key={label}>
                <h4>{value}</h4>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </CReveal>
        <div>
          {steps.map((step, index) => (
            <CReveal key={step.title} delay={index * 0.06}>
              <article className="cbx-step">
                <span className="cbx-step-number">0{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </article>
            </CReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

const Pricing: React.FC = () => {
  const { t, services, primary, openLead, c } = useCobox();
  const sources: { service: Service; item: ServiceItem | null }[] =
    services.length > 1
      ? services.map((service) => ({ service, item: service.items[0] || null }))
      : primary
        ? primary.items.map((item) => ({ service: primary, item }))
        : [];
  const list = sources.slice(0, 4).map(({ service, item }) => ({
    key: item?.key || service?.key || "plan",
    title: services.length > 1 ? service?.name || "" : item?.title || "",
    features: (item?.features?.length
      ? item.features
      : ["Furnished workspace", "Fast Wi-Fi", "Community access", "Meeting-room credits"]
    ).slice(0, 4),
    price: item ? priceWithUnit(item.price, item.priceUnit) : "",
    service,
    item,
  }));
  return (
    <section className="cbx-section cbx-pricing">
      <div className="cbx-shell">
        <div className="cbx-head center">
          <CEyebrow>{c("home.pricing.eyebrow", "Pricing plan")}</CEyebrow>
          <h2>
            {c(
              "home.pricing.title",
              "Trusted by professionals, loved by teams everywhere"
            )}
          </h2>
        </div>
        {list.length ? (
          <div className="cbx-plan-grid">
            {list.map((plan, index) => (
              <CReveal key={plan.key} delay={index * 0.05}>
                <article className={`cbx-plan ${index === 1 ? "is-active" : ""}`}>
                  <div className="cbx-plan-head">
                    <i>{index === 1 ? CIcon.office(20) : CIcon.desk(20)}</i>
                    <h3>{plan.title}</h3>
                  </div>
                  <ul>
                    {plan.features.map((feature: string) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <div className="cbx-plan-foot">
                    <div className="cbx-plan-price">
                      {plan.price ? (
                        <span>{plan.price}</span>
                      ) : (
                        <span style={{ fontSize: 18 }}>On request</span>
                      )}
                    </div>
                    <p className="cbx-plan-note">
                      {c("home.pricing.note", "Flexible terms, no long lock-in")}
                    </p>
                    <CCtaButton
                      onClick={() =>
                        openLead(plan.service, plan.item || null)
                      }
                    >
                      Get started
                    </CCtaButton>
                  </div>
                </article>
              </CReveal>
            ))}
          </div>
        ) : (
          <div className="cbx-empty">
            Add your spaces in the website builder to show pricing plans here.
          </div>
        )}
      </div>
    </section>
  );
};

const WhyUs: React.FC = () => {
  const { t, c, photo } = useCobox();
  const image =
    photo("home.why.image", t.galleryItems?.[6] || t.galleryItems?.[0]) || "";
  return (
    <section className="cbx-section cbx-band cbx-why">
      <div className="cbx-shell cbx-why-grid">
        <CReveal>
          <CEyebrow>{c("home.why.eyebrow", "Why choose us")}</CEyebrow>
          <h2>
            {c(
              "home.why.title",
              "Your success begins inside our shared workspaces"
            )}
          </h2>
          <p style={{ marginTop: 18 }}>
            {c(
              "home.why.body",
              "Choosing the right workspace is about more than finding a desk. It's about creating an environment where you and your team can thrive."
            )}
          </p>
          <div className="cbx-why-list">
            {[
              [
                "1.8k",
                c("home.why.item1.title", "Happy clients"),
                c(
                  "home.why.item1.body",
                  "We've supported hundreds of professionals and startups."
                ),
              ],
              [
                "95%",
                c("home.why.item2.title", "Client retention rate"),
                c(
                  "home.why.item2.body",
                  "Our commitment to service excellence keeps businesses with us."
                ),
              ],
            ].map(([value, title, body]) => (
              <div className="cbx-why-item" key={title}>
                <i>{CIcon.spark(20)}</i>
                <h4>{value}</h4>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </CReveal>
        <CReveal delay={0.06}>
          <div className="cbx-why-media">
            {image ? <img className="cbx-photo" src={image} alt="" /> : <CPlaceholder />}
            <div className="cbx-why-float">
              <div>
                <p>{c("home.why.cta", "Fully equipped workspace")}</p>
                <h3>50+</h3>
              </div>
              <CCtaButton
                variant="ghost"
                onClick={() => t.goToSection("contact")}
              >
                Book a visit
              </CCtaButton>
            </div>
          </div>
        </CReveal>
      </div>
    </section>
  );
};

const CoreValues: React.FC = () => {
  const { t, draft, c, photo } = useCobox();
  const gallery = t.galleryItems || [];
  const first = photo("home.values.image1", gallery[3] || gallery[0]) || "";
  const second = photo("home.values.image2", gallery[7] || gallery[2]) || "";
  const review = (t.testimonials || [])[0];
  const avatars = (t.testimonials || [])
    .map((item: any) => srcOf(item.image))
    .filter(Boolean)
    .slice(0, 4);
  return (
    <section className="cbx-section cbx-values">
      <div className="cbx-shell">
        <div className="cbx-head center">
          <CEyebrow>{c("home.values.eyebrow", "Our core values")}</CEyebrow>
          <h2>
            {c(
              "home.values.title",
              "The core values that guide every workspace we design and deliver"
            )}
          </h2>
        </div>
        <div className="cbx-value-grid">
          <CReveal>
            <article className="cbx-value-card">
              <figure>
                {first ? <img src={first} alt="Collaboration" /> : <CPlaceholder />}
              </figure>
              <div className="cbx-value-body">
                <h3>{c("home.values.card1.title", "Collaboration")}</h3>
                <p>
                  {c(
                    "home.values.card1.body",
                    "Every professional works differently. That's why we offer workspaces and plans that adapt."
                  )}
                </p>
                <ul>
                  <li>{c("home.values.card1.item1", "Space designed to connect people")}</li>
                  <li>{c("home.values.card1.item2", "Workspaces and plans that adapt")}</li>
                </ul>
              </div>
            </article>
          </CReveal>

          <CReveal delay={0.06}>
            <article className="cbx-value-card">
              <div className="cbx-value-body">
                <div className="cbx-value-quote">
                  {srcOf(review?.image) ? (
                    <img src={srcOf(review.image)} alt="" />
                  ) : null}
                  <div>
                    <p>{review?.name || "Brooklyn Simmons"}</p>
                    <small>{review?.role || "Member"}</small>
                  </div>
                </div>
                <h3>{c("home.values.card2.title", "Innovation")}</h3>
                <p>
                  {c(
                    "home.values.card2.body",
                    "Every professional works differently. That's why we offer workspaces and plans that adapt."
                  )}
                </p>
                <div className="cbx-value-counts">
                  <div>
                    <h4>500+</h4>
                    <span>Projects completed</span>
                  </div>
                  <div>
                    <h4>250+</h4>
                    <span>Professionals working</span>
                  </div>
                </div>
              </div>
            </article>
          </CReveal>

          <CReveal delay={0.12}>
            <article className="cbx-value-card is-heading">
              <h3>
                {c("home.values.card3.lead", "Our commitment to")}{" "}
                {avatars.length ? (
                  <span className="cbx-inline-avatars">
                    {avatars.map((image) => (
                      <img key={image} src={image} alt="" />
                    ))}
                  </span>
                ) : null}{" "}
                {c("home.values.card3.mid", "creating")}{" "}
                {second ? (
                  <span className="cbx-inline-photo">
                    <img src={second} alt="" />
                  </span>
                ) : null}{" "}
                {c(
                  "home.values.card3.tail",
                  "exceptional work environments"
                )}
              </h3>
              <figure>
                {second ? (
                  <img className="cbx-photo" src={second} alt="" />
                ) : (
                  <CPlaceholder />
                )}
              </figure>
            </article>
          </CReveal>
        </div>
        <div className="cbx-value-foot">
          <PeopleStack images={avatars} />
          <p>
            {c(
              "home.values.foot",
              "Need a custom workspace? Let's build it together"
            )}{" "}
            —{" "}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                t.goToSection("contact");
              }}
            >
              Talk to {draft?.companyName || "our team"} today
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

const Testimonials: React.FC = () => {
  const { t, rating, c, photo } = useCobox();
  const rail = useRef<HTMLDivElement | null>(null);
  const reviews = (t.testimonials || []).slice(0, 6);
  const image =
    photo("home.reviews.image", t.galleryItems?.[8] || t.galleryItems?.[1]) || "";
  const average = rating.avg || 4.9;
  const scroll = (direction: number) => {
    const node = rail.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.min(360, node.clientWidth * 0.8), behavior: "smooth" });
  };
  return (
    <section className="cbx-reviews cbx-dark">
      {image ? <img className="cbx-reviews-bg" src={image} alt="" /> : null}
      <div className="cbx-shell cbx-reviews-grid">
        <CReveal>
          <CEyebrow light>
            {c("home.reviews.eyebrow", "Client testimonials")}
          </CEyebrow>
          <h2>
            {c(
              "home.reviews.title",
              "Real testimonials from our thriving co-working community"
            )}
          </h2>
          <div className="cbx-rating-box">
            <div>
              <b>{average.toFixed(1)}/5</b>
              <p>Based on {reviews.length || 1} reviews</p>
            </div>
            <div>
              <CStars value={Math.round(average)} />
              <p>Google reviews</p>
            </div>
          </div>
          <div className="cbx-review-nav">
            <button type="button" aria-label="Previous reviews" onClick={() => scroll(-1)}>
              {CIcon.chevronLeft()}
            </button>
            <button type="button" aria-label="Next reviews" onClick={() => scroll(1)}>
              {CIcon.chevronRight()}
            </button>
          </div>
        </CReveal>
        <div className="cbx-review-rail" ref={rail}>
          {reviews.map((review: any, index: number) => (
            <article className="cbx-review" key={review.key || index}>
              <CStars value={review.rating || 5} />
              <blockquote>
                “{String(review.text || review.review || "").replace(/^"|"$/g, "")}”
              </blockquote>
              <footer>
                {srcOf(review.image) ? (
                  <img src={srcOf(review.image)} alt="" />
                ) : null}
                <div>
                  <b>{review.name || "Member"}</b>
                  <small>{review.role || "Community member"}</small>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>
      <div className="cbx-shell" style={{ marginTop: 40 }}>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>
          {c("home.reviews.foot", "Your growth journey starts here")} —{" "}
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              t.goToSection("contact");
            }}
            style={{ color: "var(--t-accent)", borderBottom: "1px solid currentColor" }}
          >
            Join now
          </a>
        </p>
      </div>
    </section>
  );
};

export const CoboxFaq: React.FC<{ faqs?: any[] }> = ({ faqs }) => {
  const [open, setOpen] = useState<number | null>(0);
  const items = (faqs || []).filter((item) => item?.question && item?.answer);
  if (!items.length) return null;
  return (
    <section className="cbx-section cbx-faq">
      <div className="cbx-shell cbx-faq-grid">
        <div>
          <CEyebrow>Quick questions</CEyebrow>
          <h2>What our community asks</h2>
          <p style={{ marginTop: 16 }}>
            Everything you need to know before your first workday with us.
          </p>
        </div>
        <div className="cbx-faq-list">
          {items.map((item, index) => {
            const active = open === index;
            return (
              <article
                className="cbx-faq-item"
                key={`${item.question}-${index}`}
                data-open={active}
              >
                <button
                  type="button"
                  aria-expanded={active}
                  onClick={() => setOpen(active ? null : index)}
                >
                  <span>{item.question}</span>
                  <i>+</i>
                </button>
                {active ? <p>{item.answer}</p> : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const ContactBand: React.FC = () => {
  const { t, draft, primary, c } = useCobox();
  const showForm = draft?.contactEnableInquiryForm !== false;
  return (
    <section className="cbx-cta">
      <div className="cbx-shell cbx-cta-grid">
        <CReveal>
          <CEyebrow light>{c("home.contact.eyebrow", "Contact us")}</CEyebrow>
          <h2>{c("home.contact.title", "Find your next workspace")}</h2>
          <p>
            {c(
              "home.contact.body",
              "Tell us what kind of space you need and our team will help you plan the right visit."
            )}
          </p>
          <div className="cbx-contact-lines">
            {t.contactPhone ? (
              <p>
                <small>Phone</small>
                <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>
                  {t.contactPhone}
                </a>
              </p>
            ) : null}
            {t.contactEmail ? (
              <p>
                <small>Email</small>
                <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>
              </p>
            ) : null}
            {t.contactAddress ? (
              <p>
                <small>Address</small>
                <span>{t.contactAddress}</span>
              </p>
            ) : null}
          </div>
        </CReveal>
        {showForm ? (
          <CReveal delay={0.06}>
            <div className="cbx-form-card">
              {primary?.leadEnabled ? (
                <LeadFormPanel service={primary} />
              ) : (
                <MessageForm
                  inquiryType="General Enquiry"
                  submitLabel="Send message"
                  success={
                    draft?.contactInquirySuccessMessage ||
                    "Thank you. Your inquiry has been submitted successfully."
                  }
                />
              )}
            </div>
          </CReveal>
        ) : null}
      </div>
    </section>
  );
};

export const CoboxHome: React.FC = () => {
  const { draft } = useCobox();
  return (
    <>
      <Hero />
      <About />
      <Services />
      <WhatWeDo />
      <VideoBand />
      <Projects />
      <Process />
      <Pricing />
      <WhyUs />
      <CoreValues />
      <Testimonials />
      <CoboxFaq faqs={draft?.faqs} />
      <ContactBand />
    </>
  );
};
