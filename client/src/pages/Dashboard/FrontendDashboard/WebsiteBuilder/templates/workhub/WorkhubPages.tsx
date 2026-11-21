import React from "react";
import { motion } from "../motion";
import { ApplyForm, MessageForm } from "../shared/TplForms";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { useWorkhub } from "./WorkhubContext";
import {
  WhIcon,
  WhImage,
  WhPageHero,
  WhReveal,
  WhSectionHead,
  WhSpaceCard,
} from "./WorkhubUI";

const mapSrc = (address: string) =>
  `https://www.google.com/maps?q=${encodeURIComponent(address || "Bengaluru")}&output=embed`;

export const WorkhubAbout: React.FC = () => {
  const { t, draft, c } = useWorkhub();
  const images = [...(t.aboutImages || []), ...(t.galleryItems || [])];
  const image = images[0] || t.homeHeroImage;
  const paragraphs = (
    t.aboutParagraphs || [draft?.about || draft?.aboutPageStory]
  )
    .filter(Boolean)
    .map((paragraph: any) =>
      typeof paragraph === "string" ? paragraph : paragraph?.text || "",
    )
    .filter(Boolean);
  const values = [
    ["Community Building", "A space where every person feels welcome and connected."],
    ["Sustainable Actions", "Thoughtful practices that reduce waste without reducing comfort."],
    ["Incubating Innovations", "An environment that encourages new ideas and useful growth."],
    ["Room for Flexibility", "Adaptable settings for teams, interviews and workshops."],
  ];
  return (
    <>
      <WhPageHero
        number="01"
        title={draft?.aboutTitle || `About ${draft?.companyName || "WorkHub"}`}
        image={image}
      />
      <section className="wh-section wh-about-intro">
        <div className="wh-shell wh-about-grid">
          <WhReveal>
            <h2>
              {c("about.title", "Empowering Collaboration, Fostering Innovation")}
            </h2>
          </WhReveal>
          <div>
            {paragraphs.length ? (
              paragraphs.map((paragraph: string, i: number) => (
                <p key={i}>{paragraph}</p>
              ))
            ) : (
              <p>
                We make room for teams to connect, focus and do their most
                useful work together.
              </p>
            )}
          </div>
        </div>
        <div className="wh-shell wh-stats">
          {[
            ["500+", "Happy members and growing community"],
            ["96%", "Member satisfaction rate"],
            ["300+", "Teams supported and empowered"],
            ["1000+", "Community events hosted"],
          ].map(([value, label]) => (
            <article key={label}>
              <p>{label}</p>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
      </section>
      <section className="wh-section wh-values">
        <div className="wh-shell wh-values-grid">
          <div>
            <h2>Our Values</h2>
            <p>
              A thoughtful workplace should help people feel welcome, supported
              and ready to make progress.
            </p>
            <button
              type="button"
              className="wh-btn"
              onClick={() => t.goToSection("contact")}
            >
              Let’s get in touch
            </button>
          </div>
          <div className="wh-values-list">
            {values.map(([title, body], index) => (
              <WhReveal key={title} delay={index * 0.05}>
                <article>
                  <span>0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              </WhReveal>
            ))}
          </div>
        </div>
      </section>
      <section className="wh-section">
        <div className="wh-shell">
          <WhSectionHead
            label="Our work facilities"
            title="Spaces built around your day"
          />
          <div className="wh-facility-grid">
            {[
              [images[1] || image, "Modern Meeting Room"],
              [images[2] || image, "Comfortable Lounge Areas"],
              [images[3] || image, "Gourmet Coffee Bar"],
            ].map(([src, title], index) => (
              <WhReveal key={title as string} delay={index * 0.06}>
                <article>
                  <div className="wh-facility-figure">
                    <WhImage src={src} alt={title as string} />
                  </div>
                  <h3>{title}</h3>
                </article>
              </WhReveal>
            ))}
          </div>
        </div>
      </section>
      <section className="wh-section wh-glimpse">
        <div className="wh-shell">
          <WhSectionHead label="Inside" title="A Glimpse Inside" />
          <div className="wh-glimpse-grid">
            {[
              images[4] || image,
              images[5] || images[1] || image,
              images[6] || images[2] || image,
            ].map((src, index) => (
              <WhReveal key={index} delay={index * 0.06}>
                <figure>
                  <WhImage src={src} alt="Inside the workspace" />
                </figure>
              </WhReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export const ServicesIndex: React.FC = () => {
  const { services, goToService, t, c } = useWorkhub();
  const image = services[0]?.heroImage || t.homeHeroImage;
  return (
    <>
      <WhPageHero
        number="02"
        title={c("services.index.title", "Work in WorkHub")}
        image={image}
        body={c(
          "services.index.body",
          "Flexible spaces for meetings, workshops and focused work.",
        )}
      />
      <section className="wh-section">
        <div className="wh-shell wh-service-directory">
          {services.map((service) => (
            <WhReveal key={service.key}>
              <button type="button" onClick={() => goToService(service)}>
                <div className="wh-service-photo">
                  <WhImage
                    src={service.cardImage || service.heroImage}
                    alt={service.name}
                  />
                  <span>{WhIcon.arrow()}</span>
                </div>
                <div className="wh-service-copy">
                  <h2>{service.name}</h2>
                  <p>
                    {service.subText ||
                      service.heroSubHeading ||
                      "A flexible, fully equipped setting for your best work."}
                  </p>
                  <div>
                    <span>{service.items.length || 1} spaces</span>
                    <b>
                      From{" "}
                      {service.items[0]?.price
                        ? priceWithUnit(
                            service.items[0].price,
                            service.items[0].priceUnit,
                          )
                        : "on request"}
                    </b>
                  </div>
                </div>
              </button>
            </WhReveal>
          ))}
        </div>
      </section>
    </>
  );
};

export const ServicePage: React.FC<{ service: Service }> = ({ service }) => (
  <>
    <WhPageHero
      number="03"
      title={service.heroHeading || service.name}
      image={service.heroImage}
      body={service.heroSubHeading}
    />
    <section className="wh-section">
      <div className="wh-shell">
        <WhSectionHead
          label={service.name}
          title="Choose the space that fits"
        />
        <div className={`wh-card-grid wh-count-${Math.min(service.items.length, 6)}`}>
          {service.items.map((item, index) => (
            <WhSpaceCard
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

export const ItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({
  service,
  item,
}) => {
  const { openLead, t, draft } = useWorkhub();
  const itemImages = Array.isArray(item.images) ? item.images : [];
  const images = itemImages.length
    ? itemImages
    : [item.image, service.heroImage, ...(t.galleryItems || [])].filter(Boolean);
  const features = [...(item.chips || []), ...(item.features || [])]
    .filter(Boolean)
    .slice(0, 6);
  const suggestions = service.items
    .filter((entry) => entry.key !== item.key)
    .slice(0, 3);
  return (
    <>
      <WhPageHero
        number="03"
        title={item.title}
        image={item.image || service.heroImage}
        body={item.description}
        variant="detail"
      />
      <div className="wh-shell wh-detail">
        <div className="wh-detail-overview">
          <div>
            <p className="wh-label">Room details</p>
            <h2>A meeting room ready before you arrive.</h2>
            <p>
              {item.description ||
                service.heroSubHeading ||
                "A calm, considered room for conversations that matter."}
            </p>
            <ul>
              {features.map((feature) => (
                <li key={feature}>
                  {WhIcon.check()}
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <aside className="wh-detail-spec">
            <p className="wh-label">Room specification</p>
            <div>
              <span>Capacity</span>
              <b>
                {item.capacity
                  ? `Up to ${item.capacity} people`
                  : "Flexible setup"}
              </b>
            </div>
            <div>
              <span>Access</span>
              <b>High-speed Wi-Fi and on-site support</b>
            </div>
            <div>
              <span>Rate</span>
              <strong>
                {item.price ? priceWithUnit(item.price, item.priceUnit) : "On request"}
              </strong>
            </div>
            <button type="button" className="wh-btn" onClick={() => openLead(service, item)}>
              Book Now {WhIcon.arrow()}
            </button>
          </aside>
        </div>
        <div className="wh-detail-images">
          {images.slice(0, 2).map((src, i) => (
            <button
              type="button"
              key={`${String(src)}-${i}`}
              onClick={() => {
                const index = (t.galleryItems || []).indexOf(src);
                if (index >= 0) t.openGalleryViewer(index);
              }}
            >
              <WhImage src={src} alt={item.title} />
            </button>
          ))}
        </div>
        <div className="wh-detail-cinema">
          <WhImage src={images[2] || images[0]} alt={`${item.title} workspace`} />
          <span aria-hidden="true">Ⅱ</span>
        </div>
        <section className="wh-detail-location">
          <div>
            <p className="wh-label">Visit the space</p>
            <h2>
              Easy to find.
              <br />
              Easy to settle in.
            </h2>
          </div>
          <div className="wh-map">
            <iframe
              title="Location map"
              src={draft?.mapUrl || mapSrc(t.contactAddress)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      </div>
      {suggestions.length ? (
        <section className="wh-suggestions">
          <div className="wh-shell">
            <WhSectionHead
              label="Keep exploring"
              title="Other rooms you may like"
            />
            <div className="wh-suggestion-grid">
              {suggestions.map((entry, i) => (
                <WhSpaceCard
                  key={entry.key}
                  service={service}
                  item={entry}
                  index={i}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
};

export const WorkhubGallery: React.FC = () => {
  const { t } = useWorkhub();
  return (
    <>
      <WhPageHero
        number="04"
        title="Inside WorkHub"
        image={t.galleryItems?.[0] || t.homeHeroImage}
      />
      <section className="wh-section">
        <div className="wh-shell wh-gallery-grid">
          {(t.galleryItems || []).map((src: string, i: number) => (
            <motion.button
              type="button"
              key={`${src}-${i}`}
              onClick={() => t.openGalleryViewer(i)}
              whileHover={{ y: -6 }}
            >
              <WhImage src={src} alt="Workspace" />
            </motion.button>
          ))}
        </div>
      </section>
    </>
  );
};

export const WorkhubTestimonials: React.FC = () => {
  const { t } = useWorkhub();
  return (
    <>
      <WhPageHero
        number="05"
        title="Member Stories"
        image={t.galleryItems?.[1] || t.homeHeroImage}
      />
      <section className="wh-section">
        <div className="wh-shell">
          <div className="wh-review-grid">
            {t.testimonials.map((review: any, i: number) => (
              <WhReveal key={i}>
                <article>
                  <span aria-hidden="true">“</span>
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
              </WhReveal>
            ))}
          </div>
          {t.showWriteReview ? (
            <button
              className="wh-btn wh-review-button"
              type="button"
              onClick={() => t.setReviewModalOpen(true)}
            >
              Write a review
            </button>
          ) : null}
        </div>
      </section>
    </>
  );
};

export const WorkhubPartner: React.FC = () => {
  const { t, c } = useWorkhub();
  return (
    <>
      <WhPageHero
        number="06"
        title={t.partnerPageHeading || "Partner With Us"}
        image={t.galleryItems?.[2] || t.homeHeroImage}
      />
      <section className="wh-section">
        <div className="wh-shell wh-form-grid">
          <div>
            <p className="wh-label">Grow together</p>
            <h2>{c("partner.title", "Build a better workday with us")}</h2>
            <p>
              {t.partnerPageContent ||
                "Tell us how your organisation, community or local business would like to work together."}
            </p>
          </div>
          <MessageForm
            inquiryType="partner"
            submitLabel="Send partnership enquiry"
            success="Thank you. Our partnerships team will contact you shortly."
          />
        </div>
      </section>
    </>
  );
};

export const WorkhubCareers: React.FC = () => {
  const { t } = useWorkhub();
  const jobs = t.careersJobs || [];
  const job = t.careersApplyJob;
  const jobTitle = job?.title || job?.jobTitle;
  const applyOnly =
    Boolean(t.careersDirectApply) ||
    job?.jobCode === "GENERAL" ||
    jobTitle === "General Application";

  if (job) {
    return (
      <>
        <WhPageHero
          number="07"
          title={
            applyOnly ? "General application" : jobTitle || "Apply for this role"
          }
          image={t.galleryItems?.[3] || t.homeHeroImage}
        />
        <section className="wh-section">
          <div className="wh-shell wh-careers-detail">
            <button
              type="button"
              className="wh-back-link"
              onClick={t.closeCareersJob}
            >
              ← Back to all roles
            </button>
            <div className="wh-apply wh-apply-panel">
              <h2>
                {applyOnly
                  ? "General application"
                  : `Apply for ${jobTitle || "this role"}`}
              </h2>
              <div className="wh-apply-form">
                <ApplyForm />
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <WhPageHero
        number="07"
        title="Careers at WorkHub"
        image={t.galleryItems?.[3] || t.homeHeroImage}
      />
      <section className="wh-section">
        <div className="wh-shell">
          <WhSectionHead label="Join the team" title="Help people do their best work" />
          <div className="wh-jobs">
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
                  {WhIcon.arrow()}
                </button>
              ))
            ) : (
              <p className="wh-empty">
                No open roles right now. Please check again soon.
              </p>
            )}
          </div>
          <div className="wh-careers-general">
            <p>Don’t see the right role? We’d still like to hear from you.</p>
            <button
              type="button"
              className="wh-btn wh-btn-outline"
              onClick={() => t.openCareersGeneralApply()}
            >
              General application {WhIcon.arrow()}
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export const WorkhubContact: React.FC = () => {
  const { t, draft } = useWorkhub();
  return (
    <>
      <WhPageHero
        number="08"
        title={`Contact ${t.draft?.companyName || "WorkHub"}`}
        image={t.galleryItems?.[4] || t.homeHeroImage}
        variant="contact"
      />
      <section className="wh-section wh-contact-section">
        <div className="wh-shell wh-form-grid">
          <div className="wh-contact-form">
            <MessageForm
              inquiryType="contact"
              submitLabel="Send message"
              success="Thank you. We will get back to you shortly."
            />
          </div>
          <div className="wh-contact-intro">
            <p className="wh-label">Get in touch</p>
            <h2>Let’s plan your next meeting.</h2>
            <p>
              Tell us what your team needs and we will help you find the right
              room for the day.
            </p>
            <div className="wh-contact-lines">
              {t.contactPhone ? (
                <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>
                  <span>☎</span>
                  {t.contactPhone}
                </a>
              ) : null}
              {t.contactEmail ? (
                <a href={`mailto:${t.contactEmail}`}>
                  <span>✉</span>
                  {t.contactEmail}
                </a>
              ) : null}
              <div>
                <span>◎</span>
                {t.contactAddress}
              </div>
            </div>
          </div>
        </div>
        <div className="wh-shell wh-contact-map">
          <div className="wh-map">
            <iframe
              title="Location map"
              src={draft?.mapUrl || mapSrc(t.contactAddress)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </>
  );
};
