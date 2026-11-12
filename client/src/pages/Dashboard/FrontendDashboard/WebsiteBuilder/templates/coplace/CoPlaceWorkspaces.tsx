import { useState } from "react";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { FaqSection, PhotoViewer } from "../shared/TplParts";
import { useCoPlace } from "./CoPlaceContext";
import { CoPlaceImage, CoPlacePageHero } from "./CoPlaceUI";

export function WorkspacesPage() {
  const { t, draft, services, goToService, navLabel } = useCoPlace();
  return (
    <>
      <CoPlacePageHero title={draft.productPageHeading || navLabel("products", "Our workspaces")} image={t.heroImages[0]} />
      <section className="coplace-section coplace-shell">
        {services.length ? (
          <div className="coplace-cards">
            {services.map((service) => (
              <article key={service.key}>
                <CoPlaceImage src={service.cardImage || service.heroImage} />
                <div>
                  <h2>{service.heading}</h2>
                  {service.subText ? <p>{service.subText}</p> : null}
                  <button className="coplace-card-action" type="button" onClick={() => goToService(service)}
                    aria-label={"Explore spaces: " + service.heading}>Explore spaces ↗</button>
                </div>
              </article>
            ))}
          </div>
        ) : <p>No workspaces are listed yet.</p>}
      </section>
    </>
  );
}

export function WorkspaceServicePage({ service }: { service: Service }) {
  const { t, goToItem, openLead, c } = useCoPlace();
  return (
    <>
      <CoPlacePageHero title={service.heroHeading} body={service.heroSubHeading}
        image={service.heroImage || service.cardImage || t.heroImages[0]} />
      <section className="coplace-section coplace-shell">
        {service.items.length ? (
          <div className="coplace-cards">
            {service.items.map((item) => {
              const price = priceWithUnit(item.price, item.priceUnit);
              return (
                <article key={item.key}>
                  <CoPlaceImage src={item.image || service.cardImage} />
                  <div>
                    {item.badge ? <p className="coplace-kicker">{item.badge}</p> : null}
                    <h2>{item.title}</h2>
                    {item.description ? <p>{item.description}</p> : null}
                    {price ? <p className="coplace-price">{price}</p> : null}
                    <button className="coplace-card-action" type="button" onClick={() => goToItem(service, item)}
                      aria-label={"Explore workspace: " + item.title}>Explore workspace ↗</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <p>No workspaces are listed for this service yet.</p>}
        {service.leadEnabled ? <div className="coplace-center coplace-related">
          <button className="coplace-button" type="button" onClick={() => openLead(service)}>{c("booking.enquire", "Enquire now")}</button>
        </div> : null}
        {service.page?.faqs?.length ? <FaqSection faqs={service.page.faqs} /> : null}
      </section>
    </>
  );
}

export function WorkspaceDetailPage({ service, item }: { service: Service; item: ServiceItem }) {
  const { goToService, openLead, goToItem, c } = useCoPlace();
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const photos = item.images.length ? item.images : [item.image || service.heroImage].filter(Boolean);
  const facts = [...new Set([...item.chips, ...item.features])];
  const related = service.items.filter((entry) => entry.key !== item.key).slice(0, 3);
  const price = priceWithUnit(item.price, item.priceUnit);

  return (
    <section className="coplace-section coplace-shell">
      <button type="button" className="coplace-text-link" onClick={() => goToService(service)}>← Back to {service.name}</button>
      <div className="coplace-split coplace-item-detail">
        <div>
          {photos[0] ? <button className="coplace-image-button" type="button" aria-label="Enlarge workspace photo" onClick={() => setSelectedPhoto(0)}>
            <CoPlaceImage src={photos[0]} alt={item.title} eager />
          </button> : null}
          {photos.length > 1 ? <div className="coplace-thumbnails">
            {photos.map((image, index) => <button key={image + index} type="button" onClick={() => setSelectedPhoto(index)}
              aria-label={"Enlarge workspace photo " + (index + 1)}><CoPlaceImage src={image} /></button>)}
          </div> : null}
        </div>
        <div>
          <p className="coplace-kicker">{item.badge || service.name}</p>
          <h1>{item.title}</h1>
          {item.description ? <p>{item.description}</p> : null}
          {price ? <p className="coplace-price">{price}</p> : null}
          {facts.length ? <ul className="coplace-amenities">{facts.map((fact) => <li key={fact}>{fact}</li>)}</ul> : null}
          {service.leadEnabled ? <button type="button" className="coplace-button" onClick={() => openLead(service, item)}>
            {c("booking.enquire", "Enquire now")}
          </button> : null}
        </div>
      </div>
      {related.length ? <div className="coplace-related">
        <h2>More ways to work</h2>
        <div className="coplace-cards">
          {related.map((entry) => <article key={entry.key}>
            <CoPlaceImage src={entry.image} />
            <div><h3>{entry.title}</h3>
              <button type="button" className="coplace-card-action" aria-label={"Explore workspace: " + entry.title}
                onClick={() => goToItem(service, entry)}>Explore workspace ↗</button>
            </div>
          </article>)}
        </div>
      </div> : null}
      <PhotoViewer images={photos} index={selectedPhoto} onClose={() => setSelectedPhoto(null)} onChange={setSelectedPhoto} />
    </section>
  );
}
