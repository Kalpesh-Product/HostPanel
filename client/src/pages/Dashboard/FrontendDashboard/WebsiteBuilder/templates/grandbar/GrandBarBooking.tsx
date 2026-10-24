import React from "react";
import { AnimatePresence, motion } from "../motion";
import { LeadFormPanel } from "../shared/TplLead";
import type { Service, ServiceItem } from "../serviceAdapter";
import { GbIcon } from "./GrandBarUI";

export const GrandBarBooking: React.FC<{
  open: boolean;
  onClose: () => void;
  service: Service | null;
  item: ServiceItem | null;
}> = ({ open, onClose, service, item }) => (
  <AnimatePresence>
    {open && service ? (
      <motion.div
        className="gb-booking-shell"
        role="dialog"
        aria-modal="true"
        aria-label="Book a table"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button
          type="button"
          className="gb-booking-backdrop"
          aria-label="Close booking form"
          onClick={onClose}
        />
        <motion.div
          className="gb-booking"
          initial={{ opacity: 0, y: 42, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            type="button"
            className="gb-booking-close"
            aria-label="Close"
            onClick={onClose}
          >
            {GbIcon.close(24)}
          </button>
          <div className="gb-booking-form">
            <div className="gb-booking-heading">
              <p className="gb-kicker">
                {item?.title || service.name || "Reservations"}
              </p>
              <h3>Reserve your table</h3>
              <p>
              Choose a date, time and party size. Our team will confirm your
              table shortly.
              </p>
            </div>
            <LeadFormPanel service={service} item={item} />
          </div>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);
