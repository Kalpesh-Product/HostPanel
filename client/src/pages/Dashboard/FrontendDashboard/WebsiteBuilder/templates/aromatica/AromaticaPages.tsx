import React, { useState } from "react";
import { AnimatePresence, motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { groupByCategory } from "../serviceAdapter";
import { ApplyForm, MessageForm, RoleSection } from "../shared/TplForms";
import { FaqSection } from "../shared/TplParts";
import { priceWithUnit } from "../templateKit";
import { useAromatica } from "./AromaticaContext";
import {
  AromaArrow,
  AromaImage,
  AromaPageHero,
  AromaProductCard,
  AromaReveal,
} from "./AromaticaUI";

export const AromaticaAbout: React.FC = () => {
  const { t, draft, c, photo } = useAromatica();
  const images = t.aboutImages || [];
  const mediaUrl = (value: any) =>
    typeof value === "string" ? value : value?.url || value?.src || "";
  const heroImage =
    mediaUrl(images[0]) ||
    mediaUrl(draft?.aboutPageImages?.[0]) ||
    mediaUrl(draft?.heroImages?.[1]) ||
    mediaUrl(draft?.heroImages?.[0]);
  const people = (t.team?.length ? t.team : t.founders) || [];
  const storyImage = photo(
    "about.story",
    mediaUrl(images[1]) || mediaUrl(images[2]) || heroImage,
  );
  const savedAboutTitle = c("about.title", "Coffee with a point of view");
  const aboutTitle = /^(?:get|good) to know us$/i.test(savedAboutTitle.trim())
    ? "Coffee with a point of view"
    : savedAboutTitle;
  return (
    <>
      <AromaPageHero
        eyebrow="Behind the cup"
        title={aboutTitle}
        body={t.aboutParagraphs?.[0]}
        image={photo("about.hero", heroImage)}
      />
      <section className="aroma-about-story">
        <div className="aroma-shell aroma-about-editorial">
          <AromaReveal className="aroma-about-visual">
            <AromaImage src={storyImage} alt="Coffee roasted and prepared with care" />
            <span>From origin to cup</span>
          </AromaReveal>
          <AromaReveal className="aroma-about-copy">
            <p className="aroma-kicker">What guides us</p>
            <h2>
              Small lots,
              <br />
              unmistakable character.
            </h2>
            <p>
              {t.aboutParagraphs?.[1] ||
                "We work directly with importers and producers who value flavour, fairness and long-term relationships."}
            </p>
            <p>
              {t.aboutParagraphs?.[2] ||
                "Every coffee is profiled, cupped and adjusted until it tastes transparent, sweet and true to its origin."}
            </p>
            <div className="aroma-facts">
              <span>
                <b>12</b>Origins tasted
              </span>
              <span>
                <b>48h</b>Fresh dispatch
              </span>
              <span>
                <b>100%</b>Traceable lots
              </span>
            </div>
          </AromaReveal>
        </div>
      </section>
      {people.length ? (
        <section className="aroma-team">
          <div className="aroma-shell">
            <div className="aroma-section-head">
              <div>
                <p className="aroma-kicker">People behind the roast</p>
                <h2>Meet the team</h2>
              </div>
            </div>
            <div className="aroma-team-grid">
              {people.slice(0, 6).map((person: any, index: number) => (
                <AromaReveal
                  key={`${person.name || person.title}-${index}`}
                  delay={index * 0.06}
                >
                  <AromaImage
                    src={person.image}
                    alt={person.name || person.title}
                  />
                  <h3>{person.name || person.title}</h3>
                  <p>{person.role || person.description}</p>
                </AromaReveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <section className="aroma-faq">
        <div className="aroma-shell">
          <p className="aroma-kicker">Questions, answered</p>
          <h2>Before you visit</h2>
          <FaqSection faqs={draft?.faqs} />
        </div>
      </section>
    </>
  );
};

export const ServicesIndex: React.FC = () => {
  const { services, goToService } = useAromatica();
  return (
    <>
      <AromaPageHero
        eyebrow="Our offering"
        title="Coffee, food and a table for every mood"
        body="Browse our café menus and discover the roasts, drinks and plates prepared each day."
        image={services[0]?.heroImage}
      />
      <section className="aroma-services-index">
        <div className="aroma-shell">
          <div className={`aroma-service-grid count-${services.length}`}>
            {services.map((service, index) => (
              <AromaReveal key={service.key} delay={index * 0.06}>
                <button type="button" onClick={() => goToService(service)}>
                  <AromaImage
                    src={service.cardImage || service.heroImage}
                    alt={service.name}
                  />
                  <span>0{index + 1}</span>
                  <div>
                    <p className="aroma-kicker">Explore</p>
                    <h2>{service.name}</h2>
                    <p>{service.subText || service.heroSubHeading}</p>
                    <i>
                      <AromaArrow />
                    </i>
                  </div>
                </button>
              </AromaReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export const ServicePage: React.FC<{ service: Service }> = ({ service }) => {
  const groups = groupByCategory(service.items);
  const { openLead } = useAromatica();
  const menuImage =
    service.heroImage || service.cardImage || service.items.find((item) => item.image)?.image;
  return (
    <>
      <section className="aroma-menu-hero">
        <AromaImage
          className="aroma-menu-hero-image"
          src={menuImage}
          alt={service.heroHeading || service.name}
          eager
        />
        <div className="aroma-menu-hero-shade" />
        <div className="aroma-shell aroma-menu-hero-inner">
          <motion.div
            className="aroma-menu-hero-copy"
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="aroma-kicker">Aromatica / all-day menu</p>
            <h1>{service.heroHeading || service.name}</h1>
            <p>{service.heroSubHeading}</p>
            <div className="aroma-menu-hero-meta">
              <span>
                <b>{String(service.items.length).padStart(2, "0")}</b>
                <small>house selections</small>
              </span>
              <span>
                <b>{String(groups.length).padStart(2, "0")}</b>
                <small>menu chapters</small>
              </span>
            </div>
          </motion.div>
          <span className="aroma-menu-hero-caption">Roasted carefully · served daily</span>
        </div>
      </section>
      <section className="aroma-menu-page">
        <div className="aroma-shell">
          <AromaReveal className="aroma-menu-overview">
            <div className="aroma-menu-overview-copy">
              <p className="aroma-kicker">Find your order</p>
              <h2>Start with what you crave.</h2>
            </div>
            <p>
              Bright and quick, deep and slow, or something worth sharing.
              Browse by chapter, then open any selection for the full story.
            </p>
            <div
              className={`aroma-menu-category-rail count-${Math.min(groups.length, 4)}`}
            >
              {groups.map((group, index) => (
                <a
                  href={`#aroma-menu-group-${index}`}
                  key={group.category || `category-${index}`}
                >
                  <b>0{index + 1}</b>
                  <strong>{group.category || service.name}</strong>
                  <small>{group.items.length} items</small>
                </a>
              ))}
            </div>
          </AromaReveal>
          {groups.map((group, groupIndex) => (
            <div
              className="aroma-menu-group"
              id={`aroma-menu-group-${groupIndex}`}
              key={group.category || "menu"}
            >
              <div className="aroma-menu-group-head">
                <span>0{groupIndex + 1}</span>
                <div>
                  <p className="aroma-kicker">Menu chapter</p>
                  <h2>{group.category || service.name}</h2>
                </div>
                <small>{group.items.length} selections · made to order</small>
              </div>
              <div
                className={`aroma-menu-list count-${Math.min(group.items.length, 3)}`}
              >
                {group.items.map((item, index) => (
                  <AromaProductCard
                    key={item.key}
                    service={service}
                    item={item}
                    index={index}
                  />
                ))}
              </div>
            </div>
          ))}
          {service.leadEnabled ? (
            <div className="aroma-menu-cta">
              <p className="aroma-kicker">Planning a visit?</p>
              <h2>Good coffee deserves a little time.</h2>
              <p>
                Come for the first pour, stay for another. We will have your
                table ready.
              </p>
              <button
                type="button"
                className="aroma-primary"
                onClick={() => openLead(service)}
              >
                Reserve a table <AromaArrow />
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
};

export const ItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({
  service,
  item,
}) => {
  const { openLead, goToService, goToItem } = useAromatica();
  const images = item.images?.length ? item.images : [item.image];
  const related = service.items
    .filter((entry) => entry.key !== item.key)
    .slice(0, 3);
  return (
    <main className="aroma-item">
      <section className="aroma-item-hero">
        <div className="aroma-shell">
          <button
            type="button"
            className="aroma-text-link"
            onClick={() => goToService(service)}
          >
            ← Back to {service.name}
          </button>
          <div className="aroma-item-grid">
            <motion.div
              className="aroma-item-gallery"
              initial={{ clipPath: "inset(0 0 100% 0)" }}
              animate={{ clipPath: "inset(0 0 0% 0)" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <AromaImage src={images[0]} alt={item.title} eager />
            </motion.div>
            <motion.aside
              className="aroma-item-copy"
              initial={{ opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.12 }}
            >
              <p className="aroma-kicker">
                {item.category || "House favourite"}
              </p>
              <h1>{item.title}</h1>
              <div className="aroma-item-meta">
                <span>
                  <small>Price</small>
                  <strong>
                    {item.price
                      ? priceWithUnit(item.price, item.priceUnit)
                      : "Ask our barista"}
                  </strong>
                </span>
                <span>
                  <small>Menu</small>
                  <strong>{service.name}</strong>
                </span>
              </div>
              <p>
                {item.description ||
                  "Prepared carefully by our bar team and served at its best."}
              </p>
              {item.features?.length ? (
                <div className="aroma-item-features">
                  <p className="aroma-kicker">What makes it special</p>
                  <ul>
                    {item.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {service.leadEnabled ? (
                <button
                  type="button"
                  className="aroma-primary"
                  onClick={() => openLead(service, item)}
                >
                  Reserve a table <AromaArrow />
                </button>
              ) : null}
            </motion.aside>
          </div>
        </div>
      </section>
      {images.length > 1 ? (
        <section className="aroma-item-more-media">
          <div
            className={`aroma-shell aroma-item-more-grid count-${Math.min(images.length - 1, 4)}`}
          >
            {images.slice(1, 5).map((image, index) => (
              <AromaReveal key={`${image}-${index}`} delay={index * 0.05}>
                <AromaImage
                  src={image}
                  alt={`${item.title} view ${index + 2}`}
                />
              </AromaReveal>
            ))}
          </div>
        </section>
      ) : null}
      {related.length ? (
        <section className="aroma-related-menu">
          <div className="aroma-shell">
            <AromaReveal className="aroma-related-head">
              <div>
                <p className="aroma-kicker">Keep tasting</p>
                <h2>You may also like</h2>
              </div>
              <button type="button" onClick={() => goToService(service)}>
                View full menu <AromaArrow />
              </button>
            </AromaReveal>
            <div className={`aroma-related-grid count-${related.length}`}>
              {related.map((entry, index) => (
                <AromaReveal key={entry.key} delay={index * 0.06}>
                  <button
                    type="button"
                    className="aroma-related-card"
                    onClick={() => goToItem(service, entry)}
                  >
                    <span className="aroma-related-image">
                      <AromaImage src={entry.image} alt={entry.title} />
                      <i>0{index + 1}</i>
                    </span>
                    <span className="aroma-related-copy">
                      <small>{entry.category || "House favourite"}</small>
                      <b>{entry.title}</b>
                      <em>
                        {entry.price
                          ? priceWithUnit(entry.price, entry.priceUnit)
                          : "Ask our barista"}
                      </em>
                      <AromaArrow />
                    </span>
                  </button>
                </AromaReveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
};

export const AromaticaGallery: React.FC = () => {
  const { t } = useAromatica();
  return (
    <>
      <AromaPageHero
        eyebrow="Inside the café"
        title="Roasting, pouring and gathering"
        body="A glimpse of the people, details and everyday rituals that shape our coffee house."
        image={t.galleryItems?.[0]?.url || t.homeHeroImage}
      />
      <section className="aroma-gallery">
        <div className="aroma-shell">
          {(t.galleryItems || [])
            .slice(0, 12)
            .map((item: any, index: number) => (
              <motion.button
                type="button"
                key={item.id || item.url || index}
                whileHover={{ y: -8 }}
                onClick={() => t.openGalleryViewer(index)}
              >
                <AromaImage
                  src={item.url || item}
                  alt={item.alt || `Gallery image ${index + 1}`}
                />
              </motion.button>
            ))}
        </div>
      </section>
    </>
  );
};

export const AromaticaTestimonials: React.FC = () => {
  const { t, testimonials } = useAromatica();
  const [reviewIndex, setReviewIndex] = useState(0);
  const reviews = testimonials?.length
    ? testimonials
    : [
        {
          name: "Coffee guest",
          text: "A warm room, thoughtful service and coffee worth slowing down for.",
        },
      ];
  const activeReview = reviews[reviewIndex % reviews.length];
  const changeReview = (direction: number) => {
    setReviewIndex((current) =>
      (current + direction + reviews.length) % reviews.length,
    );
  };
  return (
    <>
      <AromaPageHero
        eyebrow="Guest notes"
        title="Stories shared over coffee"
        image={t.homeHeroImage}
      />
      <section className="aroma-testimonials aroma-testimonials-page">
        <div className="aroma-shell">
          <div className="aroma-reviews-page-head">
            <div>
              <p className="aroma-kicker">From our guests</p>
              <h2>One story at a time.</h2>
            </div>
            <span>
              {String((reviewIndex % reviews.length) + 1).padStart(2, "0")} /{" "}
              {String(reviews.length).padStart(2, "0")}
            </span>
          </div>
          <div className="aroma-reviews-carousel">
            <button
              type="button"
              className="aroma-reviews-carousel-arrow is-previous"
              onClick={() => changeReview(-1)}
              aria-label="Previous review"
              disabled={reviews.length < 2}
            >
              <AromaArrow />
            </button>
            <div className="aroma-reviews-carousel-stage">
              <AnimatePresence mode="wait" initial={false}>
                <motion.article
                  key={`${activeReview.name || activeReview.author}-${reviewIndex}`}
                  initial={{ opacity: 0, x: 38 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -38 }}
                  transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="aroma-reviews-quote">“</span>
                  <blockquote>
                    {activeReview.text ||
                      activeReview.review ||
                      activeReview.comment}
                  </blockquote>
                  <footer>
                    <b>{activeReview.name || activeReview.author || "Coffee guest"}</b>
                    {activeReview.role || activeReview.location ? (
                      <small>{activeReview.role || activeReview.location}</small>
                    ) : null}
                  </footer>
                </motion.article>
              </AnimatePresence>
            </div>
            <button
              type="button"
              className="aroma-reviews-carousel-arrow is-next"
              onClick={() => changeReview(1)}
              aria-label="Next review"
              disabled={reviews.length < 2}
            >
              <AromaArrow />
            </button>
          </div>
          <div className="aroma-reviews-page-footer">
            <div className="aroma-reviews-dots" aria-label="Choose a review">
              {reviews.map((_: any, index: number) => (
                <button
                  type="button"
                  className={index === reviewIndex % reviews.length ? "is-active" : ""}
                  key={index}
                  onClick={() => setReviewIndex(index)}
                  aria-label={`Show review ${index + 1}`}
                  aria-current={index === reviewIndex % reviews.length ? "true" : undefined}
                />
              ))}
            </div>
            {t.showWriteReview ? (
              <button
                className="aroma-primary"
                type="button"
                onClick={t.openReviewModal}
              >
                Write a review
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
};

export const AromaticaPartner: React.FC = () => {
  const { t } = useAromatica();
  return (
    <>
      <AromaPageHero
        eyebrow="Wholesale & collaborations"
        title={t.partnerPageHeading || "Serve coffee with a story"}
        body={
          t.partnerPageContent?.intro ||
          "Let us build a thoughtful coffee programme for your workplace, hotel or restaurant."
        }
      />
      <section className="aroma-form-page">
        <div className="aroma-shell aroma-form-grid aroma-partner-grid">
          <div className="aroma-form-intro">
            <p className="aroma-kicker">Partner with us</p>
            <h2>Roasted for your counter.</h2>
            <p>
              Training, equipment guidance, dependable deliveries and a roast
              profile made for your guests.
            </p>
            <div className="aroma-partner-notes" aria-label="Partnership support">
              <span>Wholesale coffee</span>
              <span>Barista training</span>
              <span>Equipment guidance</span>
            </div>
          </div>
          <div className="aroma-message-panel">
            <p className="aroma-kicker">Tell us about your space</p>
            <h3>Start a partnership.</h3>
            <MessageForm
              inquiryType="partnership"
              submitLabel="Start a conversation"
              success="Thanks — our coffee team will be in touch shortly."
            />
          </div>
        </div>
      </section>
    </>
  );
};

export const AromaticaCareers: React.FC = () => {
  const { t } = useAromatica();
  const active = t.careersApplyJob;
  if (active)
    return (
      <section className="aroma-career-detail">
        <div className="aroma-shell">
          <button
            type="button"
            className="aroma-text-link"
            onClick={t.closeCareersJob}
          >
            ← All roles
          </button>
          <p className="aroma-kicker">Join the team</p>
          <h1>{active.title || active.name || active.jobTitle}</h1>
          {active.description || active.summary || active.aboutTheJob ? (
            <RoleSection
              title="The role"
              text={active.description || active.summary || active.aboutTheJob}
            />
          ) : null}
          {active.requirements ? (
            <RoleSection
              title="What you will bring"
              text={active.requirements}
              asList
            />
          ) : null}
          <ApplyForm />
        </div>
      </section>
    );
  return (
    <>
      <AromaPageHero
        eyebrow="Work with us"
        title="Curious people make better coffee"
        body="Join a team that cares about hospitality, craft and the details guests remember."
        image={t.aboutImages?.[2] || t.homeHeroImage}
      />
      <section className="aroma-jobs">
        <div className="aroma-shell">
          {t.careersJobsLoading ? (
            <p>Loading roles…</p>
          ) : t.careersJobs?.length ? (
            t.careersJobs.map((job: any, index: number) => (
              <button
                type="button"
                key={job.id || index}
                onClick={() => t.openCareersJob(job)}
              >
                <span>0{index + 1}</span>
                <h3>{job.title || job.name}</h3>
                <p>{job.location || "At the roastery"}</p>
                <AromaArrow />
              </button>
            ))
          ) : (
            <div className="aroma-empty">
              <h2>No open roles today.</h2>
              <p>We are always glad to meet thoughtful hospitality people.</p>
            </div>
          )}
          <div className="aroma-general-application">
            <p className="aroma-kicker">Do not see your role?</p>
            <h2>Make your own introduction.</h2>
            <p>
              Tell us what you care about, where you shine and how you would
              add something special to Aromatica.
            </p>
            <button
              type="button"
              className="aroma-primary"
              onClick={t.openCareersGeneralApply}
            >
              Send a general application <AromaArrow />
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export const AromaticaContact: React.FC = () => {
  const { t, draft } = useAromatica();
  const configuredMap = String(draft?.mapUrl || "").trim();
  const map =
    configuredMap ||
    (t.contactAddress
      ? `https://www.google.com/maps?q=${encodeURIComponent(t.contactAddress)}&output=embed`
      : "");
  return (
    <>
      <AromaPageHero
        eyebrow="Visit us"
        title="Coffee tastes better together"
        body="Drop in for a cup, collect freshly roasted beans or reserve a table for your group."
      />
      <section className="aroma-contact">
        <div className="aroma-shell">
          <div className="aroma-contact-grid">
            <div className="aroma-contact-details">
              <p className="aroma-kicker">Find us</p>
              <h2>{t.contactAddress}</h2>
              <div className="aroma-contact-links">
                {t.contactPhone ? (
                  <a href={`tel:${t.contactPhone}`}>{t.contactPhone}</a>
                ) : null}
                {t.contactEmail ? (
                  <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>
                ) : null}
              </div>
            </div>
            <div className="aroma-message-panel">
              <p className="aroma-kicker">Write to us</p>
              <h3>Plan your next coffee.</h3>
              <MessageForm
                inquiryType="contact"
                submitLabel="Send message"
                success="Thanks — we will reply shortly."
              />
            </div>
          </div>
          {map ? (
            <div className="aroma-contact-map">
              <iframe
                title="Map"
                src={map}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
};
