import React from "react";
import { AnimatePresence, motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { LeadFormPanel } from "../shared/TplLead";
import { Icon } from "../shared/TplUI";

/** Booking/enquiry modal. The form itself is the shared lead form, styled by wavexTheme. */
export const WavexBooking: React.FC<{
  open: boolean;
  onClose: () => void;
  service: Service | null;
  item: ServiceItem | null;
}> = ({ open, onClose, service, item }) => (
  <AnimatePresence>
    {open && service ? (
      <motion.div
        className="wx-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label={service.profile.labels.leadTitle}
      >
        <button
          type="button"
          className="wx-modal-backdrop"
          onClick={onClose}
          aria-label="Close booking form"
        />
        <motion.div
          className="wx-modal-panel"
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            type="button"
            className="wx-modal-close"
            onClick={onClose}
            aria-label="Close booking form"
          >
            {Icon.close(18)}
          </button>
          <div className="wx-modal-aside">
            {(item?.image || service.cardImage || service.heroImage) ? (
              <img src={item?.image || service.cardImage || service.heroImage} alt="" />
            ) : null}
            <div className="wx-modal-aside-copy">
              <span className="wx-kicker">{service.name}</span>
              <h2>{item?.title || service.heading}</h2>
              <p>{item?.description || service.subText}</p>
            </div>
          </div>
          <div className="wx-modal-form">
            <span className="wx-kicker">Book a room</span>
            <h2>{service.profile.labels.leadTitle}</h2>
            <p>Tell us what you need and our team will confirm the details.</p>
            <LeadFormPanel service={service} item={item} />
          </div>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);
