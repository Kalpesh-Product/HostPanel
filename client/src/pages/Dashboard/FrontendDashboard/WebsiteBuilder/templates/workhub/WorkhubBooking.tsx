import React from "react";
import { AnimatePresence, motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { LeadFormPanel } from "../shared/TplLead";
import { WhIcon, WhImage } from "./WorkhubUI";

export const WorkhubBooking: React.FC<{
  open: boolean;
  onClose: () => void;
  service: Service | null;
  item: ServiceItem | null;
}> = ({ open, onClose, service, item }) => (
  <AnimatePresence>
    {open && service ? (
      <motion.div
        className="wh-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="Book a room"
      >
        <button
          type="button"
          className="wh-modal-backdrop"
          onClick={onClose}
          aria-label="Close booking form"
        />
        <motion.div
          className="wh-modal-panel"
          initial={{ y: 34, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            type="button"
            className="wh-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            {WhIcon.close()}
          </button>
          <aside className="wh-modal-aside">
            <WhImage src={item?.image || service.heroImage} alt="" />
            <div>
              <p className="wh-eyebrow">Reserve your room</p>
              <h2>{item?.title || service.name}</h2>
              <p>
                Tell us when your team is coming. We will confirm the best
                available setup.
              </p>
            </div>
          </aside>
          <div className="wh-modal-form">
            <p className="wh-label">Book Room</p>
            <h2>Plan your next meeting</h2>
            {item?.description ? <p>{item.description}</p> : null}
            <LeadFormPanel service={service} item={item} />
          </div>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);
