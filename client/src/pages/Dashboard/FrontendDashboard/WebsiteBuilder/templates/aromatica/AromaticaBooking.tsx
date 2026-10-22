import React from "react";
import { AnimatePresence, motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { LeadFormPanel } from "../shared/TplLead";
import { AromaImage } from "./AromaticaUI";

export const AromaticaBooking: React.FC<{
  open: boolean;
  onClose: () => void;
  service: Service | null;
  item: ServiceItem | null;
}> = ({ open, onClose, service, item }) => (
  <AnimatePresence>
    {open && service ? (
      <motion.div
        className="aroma-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="Reserve a table"
      >
        <button
          type="button"
          className="aroma-modal-backdrop"
          onClick={onClose}
          aria-label="Close reservation"
        />
        <motion.div
          className="aroma-modal-panel"
          initial={{ y: 42, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            type="button"
            className="aroma-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
          <aside>
            <AromaImage src={item?.image || service.heroImage} alt="" />
            <div className="aroma-modal-overlay" />
            <div className="aroma-modal-story">
              <p className="aroma-kicker">Your table awaits</p>
              <h2>{item?.title || service.name}</h2>
              <p>
                Choose your preferred date, time and party size. Our café team
                will confirm your table shortly.
              </p>
            </div>
          </aside>
          <div className="aroma-modal-form">
            <p className="aroma-kicker">Reservation</p>
            <h2>Come for the coffee. Stay for the ritual.</h2>
            <LeadFormPanel service={service} item={item} />
          </div>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);
