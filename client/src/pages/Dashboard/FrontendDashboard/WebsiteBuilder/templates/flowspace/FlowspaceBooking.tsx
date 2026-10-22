import React from "react";
import { AnimatePresence, motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { LeadFormPanel } from "../shared/TplLead";
import { Icon } from "./FlowspaceUI";

export const FlowspaceLeadModal: React.FC<{
  open: boolean;
  onClose: () => void;
  service: Service | null;
  item: ServiceItem | null;
}> = ({ open, onClose, service, item }) => (
  <AnimatePresence>
    {open && service ? (
      <motion.div
        className="fs-booking-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label={service.profile.labels.leadTitle}
      >
        <button
          type="button"
          className="fs-booking-backdrop"
          onClick={onClose}
          aria-label="Close booking form"
        />
        <motion.div
          className="fs-booking-panel"
          initial={{ y: 34, opacity: 0, scale: 0.985 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            type="button"
            className="fs-booking-close"
            onClick={onClose}
            aria-label="Close"
          >
            {Icon.close()}
          </button>
          <aside className="fs-booking-info">
            <span className="fs-brand-dot">⌘</span>
            <div>
              <p className="fs-kicker">Book a room</p>
              <h2>Let’s find the right space.</h2>
              <p>
                Share your meeting details and our team will confirm
                availability, setup and pricing.
              </p>
            </div>
            <ul>
              <li>{Icon.check()} Flexible hourly booking</li>
              <li>{Icon.check()} Display and fast Wi-Fi</li>
              <li>{Icon.check()} On-site support</li>
            </ul>
          </aside>
          <div className="fs-booking-form">
            <p className="fs-kicker">{service.name}</p>
            <h2>{item?.title || service.profile.labels.leadTitle}</h2>
            {item?.description ? (
              <p className="fs-booking-item-copy">{item.description}</p>
            ) : null}
            <LeadFormPanel service={service} item={item} />
          </div>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);
