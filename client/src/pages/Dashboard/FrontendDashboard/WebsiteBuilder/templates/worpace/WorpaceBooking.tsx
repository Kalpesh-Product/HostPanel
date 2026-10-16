import React from "react";
import { AnimatePresence, motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { LeadFormPanel } from "../shared/TplLead";
import { Icon } from "./WorpaceUI";

export const WorpaceLeadModal: React.FC<{ open: boolean; onClose: () => void; service: Service | null; item: ServiceItem | null }> = ({ open, onClose, service, item }) => (
  <AnimatePresence>{open && service ? <motion.div className="wp-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{duration:.28}} role="dialog" aria-modal="true"><button type="button" className="wp-modal-backdrop" onClick={onClose} aria-label="Close"/><motion.div className="wp-modal-panel" initial={{ y: 60, opacity: 0, scale:.975 }} animate={{ y: 0, opacity: 1, scale:1 }} exit={{ y: 35, opacity: 0, scale:.985 }} transition={{ duration: .52, ease: [0.22,1,0.36,1] }}><button type="button" className="wp-modal-close" onClick={onClose} aria-label="Close reservation form">{Icon.close()}</button><aside><motion.span className="wp-mark" initial={{scale:0,rotate:-18}} animate={{scale:1,rotate:0}} transition={{delay:.22,duration:.42,type:"spring"}}><i/><i/><i/></motion.span><p className="wp-label-text">Reserve your workspace</p><h2>{item?.title || service.name}</h2><p>Tell us when you are coming and how your team works. We will confirm the best available setup.</p></aside><motion.div className="wp-modal-form" initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} transition={{delay:.12,duration:.45,ease:[.22,1,.36,1]}}><LeadFormPanel service={service} item={item}/></motion.div></motion.div></motion.div> : null}</AnimatePresence>
);
