import { useState } from "react";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { FaqSection, PhotoViewer } from "../shared/TplParts";
import { useTinyHome } from "./TinyHomeContext";
import { TinyHomeImage, TinyHomePageHero } from "./TinyHomeUI";

export function StaysPage() {
  const { t, draft, services, goToService, navLabel } = useTinyHome();
  return (
    <>
      <TinyHomePageHero title={draft.productPageHeading || navLabel("products", "Our stays")} image={t.heroImages[0]} />
      <section className="tinyhome-section tinyhome-shell">
        {services.length ? (
          <div className="tinyhome-cards">
            {services.map((service) => (
              <article key={service.key}>
                <TinyHomeImage src={service.cardImage || service.heroImage} />
                <div>
                  <h2>{service.heading}</h2>
                  {service.subText ? <p>{service.subText}</p> : null}
                  <button className="tinyhome-card-action" type="button" onClick={() => goToService(service)}
                    aria-label={"View stays: " + service.heading}>View stays ↗</button>
                </div>
              </article>
            ))}
          </div>
        ) : <p>No stays are listed yet.</p>}
      </section>
    </>
  );
}

export function StayServicePage({ service }: { service: Service }) {
  const { t, goToItem, openLead, c } = useTinyHome();
  return (
    <>
      <TinyHomePageHero title={service.heroHeading} body={service.heroSubHeading}
        image={service.heroImage || service.cardImage || t.heroImages[0]} />
      <section className="tinyhome-section tinyhome-shell">
        {service.items.length ? (
          <div className="tinyhome-cards">
            {service.items.map((item) => {
              const price = priceWithUnit(item.price, item.priceUnit);
              return (
                <article key={item.key}>
                  <TinyHomeImage src={item.image || service.cardImage} />
                  <div>
                    {item.badge ? <p className="tinyhome-kicker">{item.badge}</p> : null}
                    <h2>{item.title}</h2>
                    {item.description ? <p>{item.description}</p> : null}
                    {price ? <p className="tinyhome-price">{price}</p> : null}
                    <button className="tinyhome-card-action" type="button" onClick={() => goToItem(service, item)}
                      aria-label={"View stay: " + item.title}>View stay ↗</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <p>No rooms are listed for this stay yet.</p>}
        {service.leadEnabled ? <div className="tinyhome-center tinyhome-related">
          <button className="tinyhome-button" type="button" onClick={() => openLead(service)}>{c("booking.cta", "Book a stay")}</button>
        </div> : null}
        {service.page?.faqs?.length ? <FaqSection faqs={service.page.faqs} /> : null}
      </section>
    </>
  );
}

export function StayDetailPage({ service, item }: { service: Service; item: ServiceItem }) {
  const { draft, goToService, openLead, goToItem, c } = useTinyHome();
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const photos = item.images.length ? item.images : [item.image || service.heroImage].filter(Boolean);
  const facts = [...new Set([...item.chips, ...item.features])];
  const related = service.items.filter((entry) => entry.key !== item.key).slice(0, 3);
  const price = priceWithUnit(item.price, item.priceUnit);

  return (
    <section className="tinyhome-section tinyhome-shell">
      <button type="button" className="tinyhome-text-link" onClick={() => goToService(service)}>← Back to {service.name}</button>
      <div className="tinyhome-split tinyhome-item-detail">
        <div>
          {photos[0] ? <button className="tinyhome-image-button" type="button" aria-label="Enlarge stay photo" onClick={() => setSelectedPhoto(0)}>
            <TinyHomeImage src={photos[0]} alt={item.title} eager />
          </button> : null}
          {photos.length > 1 ? <div className="tinyhome-thumbnails">
            {photos.map((image, index) => <button key={image + index} type="button" onClick={() => setSelectedPhoto(index)}
              aria-label={"Enlarge stay photo " + (index + 1)}><TinyHomeImage src={image} /></button>)}
          </div> : null}
        </div>
        <div>
          <p className="tinyhome-kicker">{item.badge || service.name}</p>
          <h1>{item.title}</h1>
          {item.description ? <p>{item.description}</p> : null}
          {price ? <p className="tinyhome-price">{price}</p> : null}
          {facts.length ? <ul className="tinyhome-amenities">{facts.map((fact) => <li key={fact}>{fact}</li>)}</ul> : null}
          {service.leadEnabled ? <button type="button" className="tinyhome-button" onClick={() => openLead(service, item)}>
            {c("booking.cta", "Book a stay")}
          </button> : null}
        </div>
      </div>
      {draft.stayPolicy?.houseRules?.length ? (
        <div className="tinyhome-related">
          <h2>House rules</h2>
          <ul className="tinyhome-amenities">{draft.stayPolicy.houseRules.map((rule: string, index: number) => <li key={index}>{rule}</li>)}</ul>
        </div>
      ) : null}
      {related.length ? <div className="tinyhome-related">
        <h2>More places to stay</h2>
        <div className="tinyhome-cards">
          {related.map((entry) => <article key={entry.key}>
            <TinyHomeImage src={entry.image} />
            <div><h3>{entry.title}</h3>
              <button type="button" className="tinyhome-card-action" aria-label={"View stay: " + entry.title}
                onClick={() => goToItem(service, entry)}>View stay ↗</button>
            </div>
          </article>)}
        </div>
      </div> : null}
      <PhotoViewer images={photos} index={selectedPhoto} onClose={() => setSelectedPhoto(null)} onChange={setSelectedPhoto} />
    </section>
  );
}
