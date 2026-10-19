import React from "react";
import { AnimatePresence, motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { LeadFormPanel } from "../shared/TplLead";
import { priceWithUnit } from "../templateKit";
import { BxIcon, BxImage } from "./BrixspaceUI";

export const BrixspaceBooking: React.FC<{
  open: boolean;
  onClose: () => void;
  service: Service | null;
  item: ServiceItem | null;
}> = ({ open, onClose, service, item }) => {
  const isMenu = service?.kind === "menu";
  const rate = item?.price
    ? priceWithUnit(item.price, item.priceUnit)
    : isMenu
      ? "See menu"
      : "Tailored quote";
  const title = service?.profile.labels.leadTitle || "Send an enquiry";
  return (
    <AnimatePresence>
      {open && service ? (
        <motion.div
          className="bx-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <button
            type="button"
            className="bx-modal-backdrop"
            onClick={onClose}
            aria-label={`Close ${title.toLowerCase()} form`}
          />
          <motion.div
            className="bx-modal-panel"
            initial={{ y: 38, opacity: 0, scale: 0.975 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              className="bx-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              {BxIcon.close()}
            </button>
            <aside className="bx-modal-aside">
              <BxImage src={item?.image || service.heroImage} alt="" />
              <div className="bx-modal-shade" />
              <div className="bx-modal-aside-copy">
                <span className="bx-modal-mark" aria-hidden="true" />
                <p className="bx-kicker">{service.profile.labels.cta}</p>
                <h2>{item?.title || service.name}</h2>
                <p>
                  {isMenu
                    ? "Choose when you are joining us and we will have your table ready."
                    : `Tell us what you are planning and we will prepare the right ${service.profile.labels.item} and support.`}
                </p>
                <div className="bx-modal-facts">
                  <span>
                    <small>{isMenu ? "Category" : "Capacity"}</small>
                    <strong>
                      {isMenu
                        ? item?.category || item?.dietary || "Menu favourite"
                        : item?.capacity
                          ? `Up to ${item.capacity} people`
                          : "Flexible setup"}
                    </strong>
                  </span>
                  <span>
                    <small>{isMenu ? "Price" : "Rate"}</small>
                    <strong>{rate}</strong>
                  </span>
                </div>
              </div>
            </aside>
            <div className="bx-modal-form">
              <p className="bx-kicker">{title}</p>
              <h2>
                {isMenu
                  ? "Plan your table."
                  : `Plan your next ${service.profile.labels.item}.`}
              </h2>
              <p>
                {item?.description ||
                  service.heroSubHeading ||
                  (isMenu
                    ? "Share your preferred date, time and party size. We will confirm your table shortly."
                    : "Share a few details and our team will confirm the best available option.")}
              </p>
              <LeadFormPanel service={service} item={item} />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
