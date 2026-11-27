import { useState } from "react";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { FaqSection, PhotoViewer } from "../shared/TplParts";
import { useCabin } from "./CabinContext";
import { cabinFallback, cabinImage } from "./cabinMedia";
import { CabinImage, CabinPageHero } from "./CabinUI";

export function StaysPage() {
  const { t, draft, services, goToService, navLabel } = useCabin();
  return (
    <>
      <CabinPageHero title={draft.productPageHeading || navLabel("products", "Our stays")} image={cabinImage(t.heroImages[0], cabinFallback(0))} />
      <section className="cabin-section cabin-shell">
        {services.length ? (
          <div className="cabin-cards cabin-product-cards">
            {services.map((service) => (
              <article key={service.key}>
                <CabinImage src={cabinImage(service.cardImage, service.heroImage)} fallback={cabinFallback(5)} />
                <div>
                  <h2>{service.heading}</h2>
                  {service.subText ? <p>{service.subText}</p> : null}
                  <button className="cabin-card-action" type="button" onClick={() => goToService(service)}
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
  const { t, goToItem, openLead, c } = useCabin();
  return (
    <>
      <CabinPageHero title={service.heroHeading} body={service.heroSubHeading}
        image={cabinImage(service.heroImage, service.cardImage, t.heroImages[0], cabinFallback(5))} />
      <section className="cabin-section cabin-shell">
        {service.items.length ? (
          <div className="cabin-cards cabin-product-cards">
            {service.items.map((item, index) => {
              const price = priceWithUnit(item.price, item.priceUnit);
              return (
                <article key={item.key}>
                  <CabinImage src={cabinImage(item.image, service.cardImage, service.heroImage)} fallback={cabinFallback(index + 5)} />
                  <div>
                    {item.badge ? <p className="cabin-kicker">{item.badge}</p> : null}
                    <h2>{item.title}</h2>
                    {item.description ? <p>{item.description}</p> : null}
                    {price ? <p className="cabin-price">{price}</p> : null}
                    <button className="cabin-card-action" type="button" onClick={() => goToItem(service, item)}
                      aria-label={"View stay: " + item.title}>View stay ↗</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <p>No rooms are listed for this stay yet.</p>}
        {service.leadEnabled ? <div className="cabin-center cabin-related">
          <button className="cabin-button" type="button" onClick={() => openLead(service)}>{c("booking.cta", "Book a stay")}</button>
        </div> : null}
        {service.page?.faqs?.length ? <FaqSection faqs={service.page.faqs} /> : null}
      </section>
    </>
  );
}

export function StayDetailPage({ service, item }: { service: Service; item: ServiceItem }) {
  const { draft, goToService, openLead, goToItem, c } = useCabin();
  const [previewPhoto, setPreviewPhoto] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const photos = item.images.length
    ? item.images.map((image, index) => cabinImage(image, cabinFallback(index)))
    : [cabinImage(item.image, service.heroImage, service.cardImage, cabinFallback(0))];
  const previewIndex = photos[previewPhoto] ? previewPhoto : 0;
  const facts = [...new Set([...item.chips, ...item.features])];
  const related = service.items.filter((entry) => entry.key !== item.key).slice(0, 3);
  const price = priceWithUnit(item.price, item.priceUnit);

  return (
    <section className="cabin-section cabin-shell">
      <button type="button" className="cabin-text-link" onClick={() => goToService(service)}>← Back to {service.name}</button>
      <div className="cabin-split cabin-item-detail">
        <div>
          {photos[previewIndex] ? <button className="cabin-image-button" type="button" aria-label="Enlarge stay photo" onClick={() => setSelectedPhoto(previewIndex)}>
            <CabinImage src={photos[previewIndex]} fallback={cabinFallback(previewIndex)} alt={item.title} eager />
          </button> : null}
          {photos.length > 1 ? <div className="cabin-thumbnails">
            {photos.map((image, index) => (
              <button key={image + index} type="button" aria-label={`Enlarge stay photo ${index + 1}`}
                onPointerEnter={() => setPreviewPhoto(index)} onFocus={() => setPreviewPhoto(index)} onClick={() => {
                  setPreviewPhoto(index);
                  setSelectedPhoto(index);
                }}>
                <CabinImage src={image} fallback={cabinFallback(index)} />
              </button>
            ))}
          </div> : null}
        </div>
        <div>
          <p className="cabin-kicker">{item.badge || service.name}</p>
          <h1>{item.title}</h1>
          {item.description ? <p>{item.description}</p> : null}
          {price ? <p className="cabin-price">{price}</p> : null}
          {facts.length ? <ul className="cabin-amenities">{facts.map((fact) => <li key={fact}>{fact}</li>)}</ul> : null}
          {service.leadEnabled ? <button type="button" className="cabin-button" onClick={() => openLead(service, item)}>
            {c("booking.cta", "Book a stay")}
          </button> : null}
        </div>
      </div>
      {draft.stayPolicy?.houseRules?.length ? (
        <div className="cabin-related">
          <h2>House rules</h2>
          <ul className="cabin-amenities">{draft.stayPolicy.houseRules.map((rule: string, index: number) => <li key={index}>{rule}</li>)}</ul>
        </div>
      ) : null}
      {related.length ? <div className="cabin-related">
        <h2>More places to stay</h2>
        <div className="cabin-cards cabin-product-cards">
          {related.map((entry, index) => <article key={entry.key}>
            <CabinImage src={cabinImage(entry.image, cabinFallback(index + 5))} fallback={cabinFallback(index + 5)} />
            <div><h3>{entry.title}</h3>
              <button type="button" className="cabin-card-action" aria-label={"View stay: " + entry.title}
                onClick={() => goToItem(service, entry)}>View stay ↗</button>
            </div>
          </article>)}
        </div>
      </div> : null}
      <PhotoViewer images={photos} index={selectedPhoto} onClose={() => setSelectedPhoto(null)} onChange={setSelectedPhoto} />
    </section>
  );
}
