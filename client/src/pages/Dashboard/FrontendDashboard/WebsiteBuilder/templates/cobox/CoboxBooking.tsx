import React from "react";
import { AnimatePresence, motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { LeadFormPanel } from "../shared/TplLead";
import { CEyebrow, CIcon } from "./CoboxUI";

export const CoboxLeadModal: React.FC<{
  open: boolean;
  onClose: () => void;
  service: Service | null;
  item: ServiceItem | null;
}> = ({ open, onClose, service, item }) => (
  <AnimatePresence>
    {open && service ? (
      <motion.div
        className="cbx-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label={service.profile.labels.leadTitle}
      >
        <button
          className="cbx-modal-shade"
          type="button"
          onClick={onClose}
          aria-label="Close"
        />
        <motion.div
          className="cbx-modal-panel"
          initial={{ y: 44, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 26, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            className="cbx-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close enquiry form"
          >
            {CIcon.close()}
          </button>
          <aside className="cbx-modal-aside">
            <CEyebrow light>{service.profile.leadKind.replace(/-/g, " ")}</CEyebrow>
            <h2>{item?.title || service.name}</h2>
            <p>
              Share your preferred date, team size and a few details. Our team will
              confirm the best available setup.
            </p>
          </aside>
          <div className="cbx-modal-form">
            <LeadFormPanel service={service} item={item} />
          </div>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);
