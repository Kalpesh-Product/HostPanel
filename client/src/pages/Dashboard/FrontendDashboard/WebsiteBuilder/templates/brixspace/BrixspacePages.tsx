import React from "react";
import { motion } from "../motion";
import { ApplyForm, MessageForm } from "../shared/TplForms";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { useBrixspace } from "./BrixspaceContext";
import {
  BxIcon,
  BxImage,
  BxPageHero,
  BxReveal,
  BxRoomCard,
  BxSectionHead,
} from "./BrixspaceUI";

const mapSrc = (address: string) =>
  `https://www.google.com/maps?q=${encodeURIComponent(address || "Bengaluru")}&output=embed`;

export const BrixspaceAbout: React.FC = () => {
  const { t, draft, kind, c } = useBrixspace();
  const isMenu = kind === "menu";
  const images = [...(t.aboutImages || []), ...(t.galleryItems || [])];
  const paragraphs = (
    t.aboutParagraphs ||
    draft.about || [draft.aboutPageStory]
  )
    .filter(Boolean)
    .map((p: any) => (typeof p === "string" ? p : p?.text || ""))
    .filter(Boolean);
  const founders = draft.founders || [];
  const stats = isMenu
    ? [
        ["100+", "guests served weekly"],
        ["96%", "guest satisfaction"],
        ["Fresh", "made every day"],
        ["Local", "ingredients and partners"],
      ]
    : [
        ["100+", "teams hosted monthly"],
        ["96%", "guest satisfaction"],
        ["12", "flexible room layouts"],
        ["8 min", "average setup support"],
      ];
  const values = isMenu
    ? [
        [
          "01",
          "Fresh by design",
          "Ingredients are chosen carefully and every plate is prepared to order.",
        ],
        [
          "02",
          "Warm from arrival",
          "Thoughtful service makes every guest feel welcome at the table.",
        ],
        [
          "03",
          "Made for sharing",
          "Our menu and space are shaped around good food and easy conversation.",
        ],
      ]
    : [
        [
          "01",
          "Useful by design",
          "Every detail earns its place, from the chair to the screen.",
        ],
        [
          "02",
          "Ready on arrival",
          "The room, technology and hospitality are prepared before you walk in.",
        ],
        [
          "03",
          "Flexible around people",
          "Layouts and support adapt to the kind of conversation you need.",
        ],
      ];
  return (
    <>
      <BxPageHero
        eyebrow="About us"
        title={
          draft.aboutTitle ||
          (isMenu
            ? "Good food, made with intention"
            : "Room for people and possibilities")
        }
        body={draft.aboutPageStory}
        image={images[0] || t.homeHeroImage}
      />
      <section className="bx-pad">
        <div className="bx-shell bx-about-copy">
          <BxReveal>
            <p className="bx-kicker">Our story</p>
            <h2>
              {c(
                "about.title",
                isMenu
                  ? "The table shapes the moments shared around it."
                  : "The room shapes what happens inside it.",
              )}
            </h2>
          </BxReveal>
          <BxReveal delay={0.08}>
            {paragraphs.length ? (
              paragraphs.map((p: string, i: number) => <p key={i}>{p}</p>)
            ) : (
              <p>
                {isMenu
                  ? "We make fresh food, thoughtful coffee and a welcoming place worth returning to."
                  : "We create well-prepared rooms where teams can think clearly, welcome guests and make progress together."}
              </p>
            )}
          </BxReveal>
        </div>
        <div className="bx-shell bx-stat-row">
          {stats.map(([v, l]) => (
            <article key={l}>
              <strong>{v}</strong>
              <span>{l}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="bx-dark-section bx-pad">
        <div className="bx-shell">
          <BxSectionHead
            light
            eyebrow="What guides us"
            title={
              isMenu
                ? "Made with care, served with warmth."
                : "Built for connection, designed for clarity."
            }
          />
          <div className="bx-value-grid">
            {values.map(([n, title, body]) => (
              <BxReveal key={n}>
                <article>
                  <span>{n}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              </BxReveal>
            ))}
          </div>
        </div>
      </section>
      {founders.length ? (
        <section className="bx-pad">
          <div className="bx-shell">
            <BxSectionHead
              eyebrow="Our people"
              title={c(
                "about.team.title",
                isMenu
                  ? "The people behind every plate and pour."
                  : "The people behind every prepared room.",
              )}
            />
            <div className="bx-team">
              {founders.map((person: any, i: number) => (
                <BxReveal key={person.name || i} delay={i * 0.06}>
                  <article>
                    <BxImage src={person.image} alt={person.name} />
                    <h3>{person.name}</h3>
                    <p>{person.role}</p>
                    <span>{person.bio}</span>
                  </article>
                </BxReveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
};

export const ServicesIndex: React.FC = () => {
  const { t, services, profile, kind, goToService, c } = useBrixspace();
  const isMenu = kind === "menu";
  return (
    <>
      <BxPageHero
        eyebrow={profile.labels.listing}
        title={c(
          "services.index.title",
          isMenu
            ? "Made fresh for every part of your day."
            : `A ${profile.labels.item} for every kind of conversation.`,
        )}
        body={c(
          "services.index.body",
          isMenu
            ? "Explore cafe favourites, fresh plates and drinks prepared with care."
            : `Compare our ${profile.labels.items}, facilities and rates to find the option that fits.`,
        )}
        image={services[0]?.heroImage || t.homeHeroImage}
      />
      <section className="bx-pad">
        <div className="bx-shell bx-service-directory">
          {services.map((service, index) => (
            <BxReveal key={service.key} delay={index * 0.06}>
              <button type="button" onClick={() => goToService(service)}>
                <BxImage
                  src={service.cardImage || service.heroImage}
                  alt={service.name}
                />
                <div>
                  <p className="bx-kicker">
                    0{index + 1} · {service.profile.labels.tag}
                  </p>
                  <h2>{service.name}</h2>
                  <p>{service.subText || service.heroSubHeading}</p>
                  <span>
                    {service.kind === "menu"
                      ? `View ${service.items.length || 1} menu items`
                      : `Explore ${service.items.length || 1} ${service.profile.labels.items}`}{" "}
                    {BxIcon.arrow()}
                  </span>
                </div>
              </button>
            </BxReveal>
          ))}
        </div>
      </section>
    </>
  );
};

export const ServicePage: React.FC<{ service: Service }> = ({ service }) => {
  const isMenu = service.kind === "menu";
  return (
    <>
      <BxPageHero
        eyebrow={service.profile.labels.tag}
        title={service.heroHeading || service.name}
        body={service.heroSubHeading}
        image={service.heroImage}
      />
      <section className="bx-pad">
        <div className="bx-shell">
          <BxSectionHead
            eyebrow={
              isMenu
                ? "Menu items"
                : `Available ${service.profile.labels.items}`
            }
            title={
              isMenu
                ? "Choose what you are craving."
                : `Choose the ${service.profile.labels.item} that fits.`
            }
            body={
              isMenu
                ? "Fresh ingredients, cafe favourites and something satisfying for every appetite."
                : `Compare the details, rates and features of every ${service.profile.labels.item}.`
            }
          />
          <div
            className={`bx-room-grid bx-room-count-${Math.min(service.items.length, 6)}`}
          >
            {service.items.map((item, index) => (
              <BxRoomCard
                key={item.key}
                service={service}
                item={item}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export const ItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({
  service,
  item,
}) => {
  const { t, openLead } = useBrixspace();
  const isMenu = service.kind === "menu";
  const images = (
    Array.isArray(item.images) && item.images.length
      ? item.images
      : [item.image, service.heroImage, ...(t.galleryItems || [])]
  ).filter(Boolean);
  const five = Array.from({ length: 5 }, (_, i) => images[i % images.length]);
  const suggestions = service.items
    .filter((entry) => entry.key !== item.key)
    .slice(0, 3);
  const defaultFeatures = isMenu
    ? [
        "Fresh ingredients",
        "Made to order",
        "Served with care",
        "Dietary requests welcome",
      ]
    : [
        "Fast Wi-Fi",
        "Display screen",
        "On-site support",
        "Refreshments available",
      ];
  return (
    <>
      <BxPageHero
        eyebrow={item.category || service.name}
        title={item.title}
        body={item.description}
        image={item.image || service.heroImage}
      />
      <section className="bx-detail bx-pad">
        <div className="bx-shell">
          <div className="bx-detail-intro">
            <div>
              <p className="bx-kicker">
                {isMenu
                  ? "Menu item"
                  : `${service.profile.labels.item} overview`}
              </p>
              <h2>
                {isMenu
                  ? "Made fresh and ready to enjoy."
                  : "Everything ready before your guests arrive."}
              </h2>
              <p>{item.description || service.heroSubHeading}</p>
              <ul>
                {(item.features.length ? item.features : defaultFeatures)
                  .slice(0, 6)
                  .map((feature) => (
                    <li key={feature}>
                      {BxIcon.check()} {feature}
                    </li>
                  ))}
              </ul>
            </div>
            <aside>
              <div>
                <span>{isMenu ? "Category" : "Capacity"}</span>
                <strong>
                  {isMenu
                    ? item.category || item.dietary || "Cafe favourite"
                    : item.capacity
                      ? `Up to ${item.capacity} people`
                      : "Flexible setup"}
                </strong>
              </div>
              <div>
                <span>{isMenu ? "Price" : "Rate"}</span>
                <strong>
                  {item.price
                    ? priceWithUnit(item.price, item.priceUnit)
                    : "On request"}
                </strong>
              </div>
              <div>
                <span>Best for</span>
                <strong>
                  {item.category ||
                    (isMenu ? "Any time of day" : "Meetings and workshops")}
                </strong>
              </div>
              {service.leadEnabled ? (
                <button
                  type="button"
                  className="bx-primary"
                  onClick={() => openLead(service, item)}
                >
                  {service.profile.labels.itemCta} {BxIcon.arrow()}
                </button>
              ) : null}
            </aside>
          </div>
          <div className="bx-detail-gallery">
            {five.map((src, i) => (
              <motion.button
                type="button"
                key={`${String(src)}-${i}`}
                whileHover={{ scale: 0.985 }}
                onClick={() => {
                  const index = t.galleryItems.indexOf(src as string);
                  if (index >= 0) t.openGalleryViewer(index);
                }}
              >
                <BxImage src={src} alt={`${item.title} view ${i + 1}`} />
              </motion.button>
            ))}
          </div>
          <div className="bx-map-block">
            <div>
              <p className="bx-kicker">Good to know</p>
              <h2>
                {isMenu ? (
                  <>
                    Easy to find.
                    <br />
                    Worth staying for.
                  </>
                ) : (
                  <>
                    Easy to find.
                    <br />
                    Easy to settle in.
                  </>
                )}
              </h2>
              <p>{t.contactAddress}</p>
            </div>
            <iframe
              title="Location map"
              src={mapSrc(t.contactAddress)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
      {suggestions.length ? (
        <section className="bx-suggestions bx-pad">
          <div className="bx-shell">
            <BxSectionHead
              eyebrow="Keep exploring"
              title={
                isMenu
                  ? "More from the menu"
                  : `Other ${service.profile.labels.items} you may like`
              }
            />
            <div className="bx-room-grid">
              {suggestions.map((entry, index) => (
                <BxRoomCard
                  key={entry.key}
                  service={service}
                  item={entry}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
};

export const BrixspaceGallery: React.FC = () => {
  const { t, kind, draft } = useBrixspace();
  const isMenu = kind === "menu";
  return (
    <>
      <BxPageHero
        eyebrow={
          isMenu
            ? `Inside ${draft.companyName || "our cafe"}`
            : "Inside Brix Rooms"
        }
        title={
          isMenu
            ? "Fresh plates, warm light and welcoming tables."
            : "Comfortable spaces made for momentum."
        }
        image={t.galleryItems?.[0] || t.homeHeroImage}
      />
      <section className="bx-pad">
        <div className="bx-shell bx-gallery">
          {(t.galleryItems || []).map((src: string, i: number) => (
            <motion.button
              type="button"
              key={`${src}-${i}`}
              whileHover={{ y: -7 }}
              onClick={() => t.openGalleryViewer(i)}
            >
              <BxImage
                src={src}
                alt={isMenu ? "Cafe food and atmosphere" : "Meeting space"}
              />
            </motion.button>
          ))}
        </div>
      </section>
    </>
  );
};
export const BrixspaceTestimonials: React.FC = () => {
  const { t, kind } = useBrixspace();
  const isMenu = kind === "menu";
  return (
    <>
      <BxPageHero
        eyebrow="Guest stories"
        title={
          isMenu
            ? "Guests remember how a meal made the day feel."
            : "Teams remember how the room made work feel."
        }
        image={t.galleryItems?.[1] || t.homeHeroImage}
      />
      <section className="bx-pad">
        <div className="bx-shell bx-review-grid">
          {t.testimonials.map((review: any, i: number) => (
            <BxReveal key={i}>
              <article>
                <span>“</span>
                <blockquote>
                  {review.quote ||
                    review.review ||
                    review.testimonial ||
                    review.testimony ||
                    review.text}
                </blockquote>
                <strong>{review.name || review.reviewerName}</strong>
                <p>{review.role}</p>
              </article>
            </BxReveal>
          ))}
        </div>
        {t.showWriteReview ? (
          <div className="bx-shell">
            <button
              className="bx-primary"
              type="button"
              onClick={() => t.setReviewModalOpen(true)}
            >
              Write a review
            </button>
          </div>
        ) : null}
      </section>
    </>
  );
};
export const BrixspacePartner: React.FC = () => {
  const { t } = useBrixspace();
  return (
    <>
      <BxPageHero
        eyebrow="Partnerships"
        title={
          t.partnerPageHeading || "Let’s build a better meeting day together."
        }
        body={t.partnerPageContent}
        image={t.galleryItems?.[2] || t.homeHeroImage}
      />
      <section className="bx-pad bx-partner-section">
        <div className="bx-shell bx-partner-grid">
          <div className="bx-partner-intro">
            <div>
              <p className="bx-kicker">Grow together</p>
              <h2>Bring your team, community or event to Brix Rooms.</h2>
              <p>
                From preferred-room programmes to recurring events, we shape
                practical partnerships around the way your people meet.
              </p>
              <div className="bx-partner-benefits">
                <span>
                  <b>01</b> Corporate room programmes
                </span>
                <span>
                  <b>02</b> Community and event partners
                </span>
                <span>
                  <b>03</b> Long-term workspace support
                </span>
              </div>
            </div>
            <BxImage
              src={
                t.galleryItems?.[6] || t.galleryItems?.[1] || t.homeHeroImage
              }
              alt="A meeting room prepared for a partnership event"
            />
          </div>
          <div className="bx-partner-form">
            <p className="bx-kicker">Partnership enquiry</p>
            <h3>Start the conversation.</h3>
            <p>
              Tell us about your organisation and what you would like to build
              together. Our partnerships team will reply with the right next
              step.
            </p>
            <MessageForm
              inquiryType="partner"
              submitLabel="Send partnership enquiry"
              success="Thank you. Our partnerships team will contact you shortly."
            />
          </div>
        </div>
      </section>
    </>
  );
};
export const BrixspaceCareers: React.FC = () => {
  const { t } = useBrixspace();
  const jobs = t.careersJobs || [];
  return (
    <>
      <BxPageHero
        eyebrow="Careers"
        title="Help teams feel ready to do their best work."
        image={t.galleryItems?.[3] || t.homeHeroImage}
      />
      <section className="bx-pad">
        <div className="bx-shell">
          <BxSectionHead
            eyebrow="Open roles"
            title="Join the people behind the rooms."
          />
          <div className="bx-jobs">
            {t.careersJobsLoading ? (
              <p>Loading roles…</p>
            ) : jobs.length ? (
              jobs.map((job: any) => (
                <button
                  type="button"
                  key={job._id || job.id}
                  onClick={() => {
                    t.setCareersApplyJob(job);
                    t.setCareersDetailTab("apply");
                  }}
                >
                  <span>{job.department || "Operations"}</span>
                  <h3>{job.title || job.jobTitle}</h3>
                  <p>{job.location || "On site"}</p>
                  {BxIcon.arrow()}
                </button>
              ))
            ) : (
              <p className="bx-empty">
                No open roles right now. Please check again soon.
              </p>
            )}
          </div>
          {t.careersApplyJob ? (
            <div className="bx-apply">
              <h2>
                Apply for{" "}
                {t.careersApplyJob.title || t.careersApplyJob.jobTitle}
              </h2>
              <ApplyForm />
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
};
export const BrixspaceContact: React.FC = () => {
  const { t, kind } = useBrixspace();
  const isMenu = kind === "menu";
  return (
    <>
      <BxPageHero
        eyebrow="Contact us"
        title={
          isMenu
            ? "Your next table starts here."
            : "Your next useful conversation starts here."
        }
        image={t.galleryItems?.[4] || t.homeHeroImage}
      />
      <section className="bx-pad">
        <div className="bx-shell bx-contact">
          <div>
            <p className="bx-kicker">Visit or message</p>
            <h2>
              {isMenu
                ? "Ask about the menu or plan your visit."
                : "Tell us what your team needs."}
            </h2>
            <p>
              {isMenu
                ? "We can help with table reservations, dietary questions and group visits."
                : "We will recommend the right room, layout and time for your meeting."}
            </p>
            <div>
              {t.contactPhone ? (
                <a
                  href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}
                >
                  {t.contactPhone}
                </a>
              ) : null}
              {t.contactEmail ? (
                <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>
              ) : null}
              <p>{t.contactAddress}</p>
            </div>
          </div>
          <MessageForm
            inquiryType="contact"
            submitLabel="Send message"
            success="Thank you. We will get back to you shortly."
          />
        </div>
        <div className="bx-shell bx-contact-map">
          <iframe
            title="Location map"
            src={mapSrc(t.contactAddress)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </>
  );
};
