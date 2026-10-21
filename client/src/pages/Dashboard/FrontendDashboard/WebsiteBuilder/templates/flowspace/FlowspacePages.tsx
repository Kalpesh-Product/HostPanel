import React, { useState } from "react";
import { motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import {
  groupOpeningHours,
  postWebsiteLead,
  priceWithUnit,
} from "../templateKit";
import {
  getCareersJobMeta,
  getCareersJobTitle,
  getMediaSrc,
} from "../useWebsiteTemplateData";
import { ApplyForm, MessageForm, RoleSection } from "../shared/TplForms";
import { FaqSection } from "../shared/TplParts";
import { LeadFormPanel } from "../shared/TplLead";
import { useFlowspace } from "./FlowspaceContext";
import {
  Icon,
  PageHero,
  Placeholder,
  Reveal,
  SectionHead,
} from "./FlowspaceUI";

export const ServicesIndex: React.FC = () => {
  const { services, draft, navLabel, goToItem, goToService, c } =
    useFlowspace();
  const [query, setQuery] = useState("");
  const [serviceKey, setServiceKey] = useState("all");
  const rooms = services.flatMap((service) =>
    service.items.map((item) => ({ service, item })),
  );
  const filtered = rooms.filter(({ service, item }) => {
    const haystack =
      `${item.title} ${item.description} ${item.category} ${service.name}`.toLowerCase();
    return (
      (serviceKey === "all" || service.key === serviceKey) &&
      haystack.includes(query.trim().toLowerCase())
    );
  });
  return (
    <>
      <section className="fs-directory-head">
        <div className="fs-shell">
          <p className="fs-kicker">
            {c("services.index.eyebrow", "Our spaces")}
          </p>
          <h1>{navLabel("products", draft?.productTitle || "Services")}</h1>
          <p>
            {c(
              "services.index.sub",
              "Choose a room shaped around the way your team needs to work.",
            )}
          </p>
          <div className="fs-directory-filters">
            <label>
              <span>Search rooms</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name or feature"
              />
            </label>
            <label>
              <span>Service</span>
              <select
                value={serviceKey}
                onChange={(event) => setServiceKey(event.target.value)}
              >
                <option value="all">All services</option>
                {services.map((service) => (
                  <option key={service.key} value={service.key}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>
      <section className="fs-directory">
        <div className="fs-shell fs-directory-grid">
          {filtered.map(({ service, item }, index) => (
            <Reveal
              key={`${service.key}-${item.key}`}
              delay={Math.min(index * 0.05, 0.25)}
            >
              <button
                type="button"
                className="fs-location-card"
                onClick={() => goToItem(service, item)}
              >
                <div>
                  {item.image || service.cardImage || service.heroImage ? (
                    <img
                      src={item.image || service.cardImage || service.heroImage}
                      alt={item.title}
                    />
                  ) : (
                    <Placeholder text={item.title} />
                  )}
                  <span />
                </div>
                <p>{service.name}</p>
                <h2>{item.title}</h2>
                <small>
                  {item.category || item.chips[0] || item.description}
                </small>
                <i>{Icon.arrow()}</i>
              </button>
            </Reveal>
          ))}
          {!rooms.length
            ? services.map((service, index) => (
                <Reveal key={service.key} delay={index * 0.05}>
                  <button
                    type="button"
                    className="fs-location-card"
                    onClick={() => goToService(service)}
                  >
                    <div>
                      {service.cardImage || service.heroImage ? (
                        <img
                          src={service.cardImage || service.heroImage}
                          alt={service.name}
                        />
                      ) : (
                        <Placeholder text={service.name} />
                      )}
                      <span />
                    </div>
                    <p>Service</p>
                    <h2>{service.name}</h2>
                    <small>{service.subText || service.heroSubHeading}</small>
                    <i>{Icon.arrow()}</i>
                  </button>
                </Reveal>
              ))
            : null}
          {rooms.length && !filtered.length ? (
            <div className="fs-empty">
              <h2>No matching rooms</h2>
              <p>Try another name or service.</p>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
};

export const ServicePage: React.FC<{ service: Service }> = ({ service }) => {
  const { draft, goToItem, c } = useFlowspace();
  const images = Array.from(
    new Set(
      [
        service.heroImage,
        service.cardImage,
        ...service.heroImages,
        ...service.items.flatMap((item) => item.images),
      ].filter(Boolean),
    ),
  ).slice(0, 5);
  return (
    <>
      <DetailHeading
        eyebrow={service.profile.labels.listing}
        title={service.heroHeading || service.name}
        body={service.heroSubHeading || service.subText}
      />
      <DetailGallery images={images} title={service.name} />
      <section className="fs-location-detail">
        <div className="fs-shell fs-location-detail-grid">
          <main>
            <nav className="fs-detail-anchor">
              <a href="#overview">Overview</a>
              <a href="#spaces">Spaces</a>
              <a href="#services">Services</a>
              {draft?.mapUrl ? <a href="#access">Access</a> : null}
            </nav>
            <motion.article
              id="overview"
              className="fs-detail-section"
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.18 }}
            >
              <p className="fs-kicker">Overview</p>
              <h2>{service.heroHeading || service.name}</h2>
              <p>
                {service.heroSubHeading ||
                  service.subText ||
                  c(
                    "services.detail.intro",
                    "A flexible meeting environment with everything needed for focused work and useful conversation.",
                  )}
              </p>
              <div className="fs-detail-stats">
                <span>
                  <strong>{service.items.length || 1}</strong> spaces
                </span>
                <span>
                  <strong>
                    {service.items.reduce(
                      (sum, item) => sum + (item.capacity || 0),
                      0,
                    ) || "Flexible"}
                  </strong>{" "}
                  capacity
                </span>
                <span>
                  <strong>Fast</strong> Wi-Fi
                </span>
              </div>
            </motion.article>
            <motion.article
              id="spaces"
              className="fs-detail-section"
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.14 }}
            >
              <p className="fs-kicker">Spaces</p>
              <h2>Choose the right setup</h2>
              <div className="fs-space-rows">
                {service.items.map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => goToItem(service, item)}
                  >
                    <span>
                      {item.image ? (
                        <img src={item.image} alt="" />
                      ) : (
                        <Placeholder text={item.title} />
                      )}
                    </span>
                    <b>
                      {item.title}
                      <small>
                        {item.chips.join(" · ") || item.description}
                      </small>
                    </b>
                    {item.price ? (
                      <em>{priceWithUnit(item.price, item.priceUnit)}</em>
                    ) : null}
                    {Icon.arrow()}
                  </button>
                ))}
              </div>
              {!service.items.length ? (
                <p className="fs-copy">
                  Rooms will appear here as soon as they are added in the
                  builder.
                </p>
              ) : null}
            </motion.article>
            <motion.article
              id="services"
              className="fs-detail-section"
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.14 }}
            >
              <p className="fs-kicker">Included</p>
              <h2>Everything in place</h2>
              <div className="fs-feature-list">
                {[
                  "High-speed Wi-Fi",
                  "Presentation display",
                  "On-site support",
                  "Flexible layouts",
                  "Refreshments available",
                  "Simple arrival",
                ].map((feature) => (
                  <span key={feature}>
                    {Icon.check()} {feature}
                  </span>
                ))}
              </div>
            </motion.article>
          </main>
          {service.leadEnabled ? <BookingAside service={service} /> : null}
        </div>
        {draft?.mapUrl ? (
          <motion.article
            id="access"
            className="fs-shell fs-detail-wide fs-detail-wide-map"
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
          >
            <p className="fs-kicker">Access</p>
            <h2>Easy to find</h2>
            <div className="fs-detail-map">
              <iframe title="Map" src={draft.mapUrl} loading="lazy" />
            </div>
          </motion.article>
        ) : null}
      </section>
      <RoomSuggestions service={service} title="Explore the available rooms" />
      {service.page?.faqEnabled !== false ? (
        <section className="fs-page-section fs-faq">
          <div className="fs-shell fs-faq-grid">
            <SectionHead
              eyebrow="Questions"
              title="Before you book"
              body="Useful details about access, timing, equipment and changes."
            />
            <FaqSection faqs={service.page?.faqs} />
          </div>
        </section>
      ) : null}
    </>
  );
};

export const ItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({
  service,
  item,
}) => {
  const { draft, goToService } = useFlowspace();
  const images = Array.from(
    new Set(
      [
        item.image,
        ...item.images,
        service.heroImage,
        service.cardImage,
        ...service.items
          .filter((entry) => entry.key !== item.key)
          .map((entry) => entry.image),
      ].filter(Boolean),
    ),
  ).slice(0, 5);
  const featureList = item.features.length
    ? item.features
    : [
        "High-speed Wi-Fi",
        "Presentation display",
        "Comfortable seating",
        "On-site support",
      ];
  return (
    <>
      <DetailHeading
        eyebrow={service.name}
        title={item.title}
        body={item.description}
      />
      <DetailGallery images={images} title={item.title} />
      <section className="fs-location-detail">
        <div className="fs-shell fs-location-detail-grid">
          <main>
            <button
              type="button"
              className="fs-text-link"
              onClick={() => goToService(service)}
            >
              ← Back to {service.name}
            </button>
            <motion.article
              className="fs-detail-section"
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.18 }}
            >
              <p className="fs-kicker">Overview</p>
              <h2>{item.title}</h2>
              {item.price ? (
                <p className="fs-detail-price">
                  {priceWithUnit(item.price, item.priceUnit)}
                </p>
              ) : null}
              <p>{item.description || service.heroSubHeading}</p>
              <div className="fs-detail-stats">
                {item.capacity ? (
                  <span>
                    <strong>{item.capacity}</strong> people
                  </span>
                ) : null}
                {item.chips.slice(0, 2).map((chip) => (
                  <span key={chip}>
                    <strong>{Icon.check()}</strong>
                    {chip}
                  </span>
                ))}
                <span>
                  <strong>Fast</strong> response
                </span>
              </div>
            </motion.article>
            <motion.article
              className="fs-detail-section"
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.16 }}
            >
              <p className="fs-kicker">Room features</p>
              <h2>Ready when you are</h2>
              <p>
                The room is prepared around your meeting. Share the preferred
                layout, equipment and timing in the form and the team will
                confirm the details.
              </p>
              <div className="fs-feature-list">
                {featureList.map((feature) => (
                  <span key={feature}>
                    {Icon.check()} {feature}
                  </span>
                ))}
              </div>
            </motion.article>
          </main>
          {service.leadEnabled ? (
            <BookingAside service={service} item={item} />
          ) : null}
        </div>
        <motion.article
          className="fs-shell fs-detail-wide"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.14 }}
        >
          <p className="fs-kicker">Good to know</p>
          <h2>A smoother meeting from arrival to wrap-up</h2>
          <div className="fs-info-rows">
            <p>
              <b>Before you arrive</b>
              <span>
                Availability and the selected setup are confirmed after your
                request.
              </span>
            </p>
            <p>
              <b>Need a different layout?</b>
              <span>
                Add seating, display or catering requirements in the booking
                form.
              </span>
            </p>
            <p>
              <b>On the day</b>
              <span>
                The workspace team can help with access and room equipment.
              </span>
            </p>
          </div>
        </motion.article>
        {draft?.mapUrl ? (
          <motion.article
            className="fs-shell fs-detail-wide fs-detail-wide-map"
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
          >
            <p className="fs-kicker">Access</p>
            <h2>Plan your arrival</h2>
            <div className="fs-detail-map">
              <iframe title="Map" src={draft.mapUrl} loading="lazy" />
            </div>
          </motion.article>
        ) : null}
      </section>
      <RoomSuggestions
        service={service}
        currentItem={item}
        title="Other rooms you may like"
      />
    </>
  );
};

const DetailHeading: React.FC<{
  eyebrow: string;
  title: string;
  body?: string;
}> = ({ eyebrow, title, body }) => (
  <section className="fs-detail-heading">
    <div className="fs-shell">
      <p className="fs-kicker">{eyebrow}</p>
      <h1>{title}</h1>
      {body ? <p>{body}</p> : null}
    </div>
  </section>
);

const DetailGallery: React.FC<{ images: string[]; title: string }> = ({
  images,
  title,
}) => (
  <section className="fs-detail-gallery fs-shell">
    <div className="fs-detail-gallery-main">
      {images[0] ? (
        <motion.img
          src={images[0]}
          alt={title}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
        />
      ) : (
        <Placeholder text={title} />
      )}
    </div>
    <div className="fs-detail-gallery-side">
      {images.slice(1, 5).map((src, index) => (
        <img key={src} src={src} alt={`${title} ${index + 2}`} />
      ))}
    </div>
  </section>
);

const BookingAside: React.FC<{ service: Service; item?: ServiceItem }> = ({
  service,
  item,
}) => (
  <aside className="fs-location-form">
    <p className="fs-kicker">Book a room</p>
    <h2>Let’s find your space.</h2>
    <p>
      Tell us what you need and we’ll confirm availability, setup and pricing.
    </p>
    <LeadFormPanel service={service} item={item} />
  </aside>
);

const RoomSuggestions: React.FC<{
  service: Service;
  currentItem?: ServiceItem;
  title: string;
}> = ({ service, currentItem, title }) => {
  const { goToItem } = useFlowspace();
  const rooms = service.items
    .filter((item) => item.key !== currentItem?.key)
    .slice(0, 3);
  if (!rooms.length) return null;
  return (
    <section className="fs-suggestions">
      <div className="fs-shell">
        <div className="fs-suggestions-head">
          <p className="fs-kicker">Keep exploring</p>
          <h2>{title}</h2>
        </div>
        <div className="fs-suggestions-grid">
          {rooms.map((item, index) => (
            <motion.button
              type="button"
              key={item.key}
              onClick={() => goToItem(service, item)}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.65, delay: index * 0.07 }}
            >
              <span>
                {item.image ? (
                  <img src={item.image} alt={item.title} />
                ) : (
                  <Placeholder text={item.title} />
                )}
              </span>
              <small>{service.name}</small>
              <b>{item.title}</b>
              <em>{item.chips.join(" · ") || item.description}</em>
              <i>{Icon.arrow()}</i>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

export const FlowspaceAbout: React.FC = () => {
  const { t, draft, navLabel, c } = useFlowspace();
  const intro: string[] = t.aboutIntroBlocks || [];
  const narrative: any[] = t.aboutNarrativeBlocks || [];
  const founders: any[] = t.founders || [];
  const team: any[] = t.aboutPageImageCards || [];
  const images: string[] = (draft?.aboutPageImages || [])
    .map((item: any) => getMediaSrc(item))
    .filter(Boolean);
  return (
    <>
      <PageHero
        eyebrow={c("about.eyebrow", "Our story")}
        title={navLabel(
          "about",
          draft?.aboutTitle || "Rooms built around people",
        )}
        body={intro[0] || draft?.aboutPageStory}
        image={images[0] || t.galleryItems?.[0]}
      />
      <section className="fs-page-section">
        <div className="fs-shell fs-story-layout">
          <div>
            <p className="fs-kicker">Why we exist</p>
            <h2>
              {draft?.aboutPageStory ||
                "Better conversations need better rooms."}
            </h2>
          </div>
          <div>
            {intro.slice(1).map((text, index) => (
              <p key={index}>{text}</p>
            ))}
          </div>
        </div>
        {narrative.length ? (
          <div className="fs-shell fs-values">
            {narrative.map((block, index) => (
              <Reveal key={block.title || index}>
                <article>
                  <span>0{index + 1}</span>
                  <h3>{block.title}</h3>
                  <p>{block.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        ) : null}
      </section>
      {founders.length ? (
        <section className="fs-dark-section">
          <div className="fs-shell">
            <SectionHead
              light
              eyebrow={c("about.founders.eyebrow", "The people")}
              title={c(
                "about.founders.title",
                "Meet the team behind the rooms",
              )}
            />
            <div className="fs-people-grid">
              {founders.map((person, index) => (
                <article key={person.name || index}>
                  {getMediaSrc(person.image) ? (
                    <img src={getMediaSrc(person.image)} alt={person.name} />
                  ) : (
                    <Placeholder text={person.name} />
                  )}
                  <h3>{person.name}</h3>
                  <p>{person.role}</p>
                  <span>{person.bio}</span>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      {team.length ? (
        <section className="fs-page-section">
          <div className="fs-shell">
            <SectionHead
              eyebrow="Our crew"
              title={
                draft?.aboutPageTeamHeading ||
                "People who make every visit easy"
              }
            />
            <div className="fs-people-grid fs-people-light">
              {team.map((person, index) => (
                <article key={person.title || index}>
                  {getMediaSrc(person.image) ? (
                    <img src={getMediaSrc(person.image)} alt={person.title} />
                  ) : (
                    <Placeholder text={person.title} />
                  )}
                  <h3>{person.title}</h3>
                  <p>{person.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
};

export const FlowspaceGallery: React.FC = () => {
  const { t, draft, navLabel, c } = useFlowspace();
  const items: string[] = t.galleryItems || [];
  return (
    <>
      <PageHero
        eyebrow={c("gallery.eyebrow", "Gallery")}
        title={
          draft?.galleryPageHeading || navLabel("gallery", "Inside our spaces")
        }
        body={
          items.length
            ? `${items.length} views from our meeting rooms and shared spaces.`
            : undefined
        }
        image={items[0]}
      />
      <section className="fs-page-section">
        <div className="fs-gallery">
          {items.map((src, index) => (
            <button
              type="button"
              key={`${src}-${index}`}
              className={`fs-gallery-${(index % 5) + 1}`}
              onClick={() => t.openGalleryViewer(index)}
            >
              <img src={src} alt="" loading="lazy" />
              <span>View</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
};

export const FlowspaceTestimonials: React.FC = () => {
  const { t, draft, navLabel, rating, c } = useFlowspace();
  const items = t.testimonials || [];
  return (
    <>
      <PageHero
        eyebrow={c("reviews.eyebrow", "Member stories")}
        title={
          draft?.testimonialsPageHeading ||
          navLabel("testimonials", "What teams say")
        }
        body={
          rating.count
            ? `${rating.avg.toFixed(1)} average from ${rating.count} reviews`
            : draft?.testimonialsPageIntro
        }
        image={t.galleryItems?.[1]}
      />
      <section className="fs-page-section">
        <div className="fs-shell fs-testimonial-grid">
          {items.map((item: any, index: number) => (
            <Reveal key={item.id || index} delay={Math.min(index * 0.05, 0.25)}>
              <article>
                <div className="fs-stars">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i}>{Icon.star()}</span>
                  ))}
                </div>
                <blockquote>
                  “
                  {item.review ||
                    item.testimony ||
                    item.text ||
                    item.description}
                  ”
                </blockquote>
                <p>{item.reviewerName || item.name || "Guest"}</p>
              </article>
            </Reveal>
          ))}
        </div>
        {t.showWriteReview ? (
          <div className="fs-center-action">
            <button
              type="button"
              className="fs-pill-btn"
              onClick={t.openReviewModal}
            >
              {c("reviews.write", "Write a review")}
            </button>
          </div>
        ) : null}
      </section>
    </>
  );
};

export const FlowspacePartner: React.FC = () => {
  const { t, navLabel, c } = useFlowspace();
  const body =
    t.partnerPageContent ||
    c("partner.intro", "Tell us how you would like to work together.");
  return (
    <>
      <PageHero
        eyebrow={c("partner.eyebrow", "Partnerships")}
        title={t.partnerPageHeading || navLabel("partner", "Partner with us")}
        body={body}
        image={t.galleryItems?.[2]}
      />
      <section className="fs-page-section">
        <div className="fs-shell fs-form-layout">
          <SectionHead
            eyebrow="Start here"
            title={
              t.partnerFormTitle || "Let’s build something useful together"
            }
            body={body}
          />
          <div className="fs-form-card">
            <MessageForm
              inquiryType="Partnership"
              submitLabel="Send proposal"
              success="Thank you. Our team will be in touch shortly."
            />
          </div>
        </div>
      </section>
    </>
  );
};

export const FlowspaceContact: React.FC = () => {
  const { t, draft, navLabel, c } = useFlowspace();
  const hours = groupOpeningHours(draft?.openingHours);
  return (
    <>
      <section className="fs-contact-hero">
        <div className="fs-shell fs-contact-hero-grid">
          <div>
            <p className="fs-kicker">{c("contact.eyebrow", "Contact")}</p>
            <h1>
              {draft?.contactPageHeading ||
                navLabel("contact", "Let’s connect")}
            </h1>
            <p>
              {draft?.contactPageIntro ||
                "Questions, bookings, partnerships or a visit—tell us what you need and our team will help."}
            </p>
            <div className="fs-contact-details">
              {t.contactEmail ? (
                <p>
                  <span>Email</span>
                  <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>
                </p>
              ) : null}
              {t.contactPhone ? (
                <p>
                  <span>Phone</span>
                  <a
                    href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}
                  >
                    {t.contactPhone}
                  </a>
                </p>
              ) : null}
              {t.contactAddress ? (
                <p>
                  <span>Address</span>
                  <b>{t.contactAddress}</b>
                </p>
              ) : null}
              {hours.length ? (
                <p>
                  <span>Hours</span>
                  <b>
                    {hours
                      .map((row) => `${row.days}: ${row.hours}`)
                      .join(" · ")}
                  </b>
                </p>
              ) : null}
            </div>
          </div>
          {draft?.contactEnableInquiryForm !== false ? (
            <FlowspaceContactForm />
          ) : null}
        </div>
      </section>
      {draft?.mapUrl ? (
        <section className="fs-map fs-contact-map">
          <iframe title="Map" src={draft.mapUrl} loading="lazy" />
        </section>
      ) : null}
      <section className="fs-page-section fs-faq">
        <div className="fs-shell fs-faq-grid">
          <SectionHead
            eyebrow="Common questions"
            title="Everything you need before you arrive"
            body="Availability, access and setup are easy to confirm before your meeting."
          />
          <FaqSection faqs={draft?.faqs} />
        </div>
      </section>
    </>
  );
};

const FlowspaceContactForm: React.FC = () => {
  const { draft } = useFlowspace();
  const [form, setForm] = useState({
    name: "",
    email: "",
    help: "",
    message: "",
  });
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"" | "success" | "error">("");
  const update =
    (key: keyof typeof form) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setStatus("");
    try {
      await postWebsiteLead(draft, {
        fullName: form.name,
        name: form.name,
        email: form.email,
        inquiryType: form.help || "Contact",
        message: form.message,
      });
      setForm({ name: "", email: "", help: "", message: "" });
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setPending(false);
    }
  };
  return (
    <form className="fs-contact-form" onSubmit={submit}>
      <label>
        <span>Name</span>
        <input
          required
          value={form.name}
          onChange={update("name")}
          placeholder="Your name"
        />
      </label>
      <label>
        <span>Email</span>
        <input
          required
          type="email"
          value={form.email}
          onChange={update("email")}
          placeholder="you@company.com"
        />
      </label>
      <label>
        <span>What can we help you with?</span>
        <select required value={form.help} onChange={update("help")}>
          <option value="">Select one</option>
          <option>Book a meeting room</option>
          <option>Plan a visit</option>
          <option>Partnership</option>
          <option>General question</option>
        </select>
      </label>
      <label>
        <span>Message</span>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={update("message")}
          placeholder="Tell us a little more"
        />
      </label>
      {status === "success" ? (
        <p className="fs-form-success" role="status">
          Thank you. We’ll be in touch shortly.
        </p>
      ) : null}
      {status === "error" ? (
        <p className="fs-form-error" role="alert">
          Something went wrong. Please try again.
        </p>
      ) : null}
      <button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send message"} {Icon.arrow()}
      </button>
      <small>We usually respond within one business day.</small>
    </form>
  );
};

export const FlowspaceCareers: React.FC = () => {
  const { t, draft } = useFlowspace();
  const job = t.careersApplyJob;
  if (job) {
    const applyOnly = t.careersDirectApply;
    const tab = applyOnly ? "apply" : t.careersDetailTab;
    return (
      <>
        <PageHero
          eyebrow={applyOnly ? "Open application" : job.department || "Careers"}
          title={applyOnly ? "General application" : getCareersJobTitle(job)}
          body={applyOnly ? undefined : getCareersJobMeta(job)}
          image={t.galleryItems?.[4]}
        />
        <section className="fs-page-section">
          <div className="fs-shell fs-career-detail">
            <button
              type="button"
              className="fs-text-link"
              onClick={t.closeCareersJob}
            >
              Back to all roles
            </button>
            {!applyOnly ? (
              <div className="fs-tabs">
                <button
                  type="button"
                  aria-pressed={tab === "description"}
                  onClick={() => t.setCareersDetailTab("description")}
                >
                  Description
                </button>
                <button
                  type="button"
                  aria-pressed={tab === "apply"}
                  onClick={() => t.setCareersDetailTab("apply")}
                >
                  Apply
                </button>
              </div>
            ) : null}
            {tab === "description" ? (
              <div className="fs-role">
                <RoleSection title="About this role" text={job.aboutTheJob} />
                <RoleSection
                  title="Key responsibilities"
                  text={job.keyResponsibilities}
                  asList
                />
                <RoleSection
                  title="Requirements"
                  text={job.requirements}
                  asList
                />
                <RoleSection title="Soft skills" text={job.softSkills} asList />
                <button
                  type="button"
                  className="fs-pill-btn"
                  onClick={() => t.setCareersDetailTab("apply")}
                >
                  Apply now {Icon.arrow()}
                </button>
              </div>
            ) : (
              <div className="fs-form-card">
                <ApplyForm />
              </div>
            )}
          </div>
        </section>
      </>
    );
  }
  const intro = String(draft?.careersPageIntro || "")
    .split("\n")
    .filter(Boolean);
  return (
    <>
      <PageHero
        eyebrow="Careers"
        title={
          draft?.careersPageHeading || `Work with ${draft?.companyName || "us"}`
        }
        body={intro[0] || t.careersFallbackIntro?.[0]}
        image={t.galleryItems?.[4]}
      />
      <section className="fs-page-section">
        <div className="fs-shell">
          {t.careersJobsLoading ? (
            <p className="fs-empty">Loading roles…</p>
          ) : !t.careersJobs.length ? (
            <div className="fs-empty">
              <h2>No openings right now</h2>
              <p>Send a general application and tell us how you could help.</p>
              <button
                type="button"
                className="fs-pill-btn"
                onClick={t.openCareersGeneralApply}
              >
                General application
              </button>
            </div>
          ) : (
            <div className="fs-job-list">
              {t.careersDepartmentSections.map((department: any) => (
                <section key={department.department}>
                  <div>
                    <h2>{department.department}</h2>
                    <span>{department.jobs.length} open</span>
                  </div>
                  {department.jobs.map((item: any) => (
                    <button
                      type="button"
                      key={getCareersJobTitle(item)}
                      onClick={() => t.openCareersJob(item)}
                    >
                      <span>
                        <b>{getCareersJobTitle(item)}</b>
                        <small>{getCareersJobMeta(item)}</small>
                      </span>
                      {Icon.arrow()}
                    </button>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};
