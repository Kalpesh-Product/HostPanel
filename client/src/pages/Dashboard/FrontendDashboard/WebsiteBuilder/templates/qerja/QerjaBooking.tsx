import React from "react";
import {AnimatePresence,motion} from "../motion";
import type {Service,ServiceItem} from "../serviceAdapter";
import {LeadFormPanel} from "../shared/TplLead";
import {QIcon,QEyebrow} from "./QerjaUI";

export const QerjaLeadModal:React.FC<{open:boolean;onClose:()=>void;service:Service|null;item:ServiceItem|null}> = ({open,onClose,service,item}) => <AnimatePresence>{open&&service?<motion.div className="qj-modal" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} role="dialog" aria-modal="true"><button className="qj-modal-shade" type="button" onClick={onClose} aria-label="Close"/><motion.div className="qj-modal-panel" initial={{y:50,opacity:0,scale:.98}} animate={{y:0,opacity:1,scale:1}} exit={{y:30,opacity:0}} transition={{duration:.5,ease:[.22,1,.36,1]}}><button className="qj-modal-close" type="button" onClick={onClose} aria-label="Close enquiry form">{QIcon.close()}</button><aside><QEyebrow light>Reserve your workspace</QEyebrow><h2>{item?.title||service.name}</h2><p>Share your preferred date, team size and a few details. We will confirm the best available setup.</p></aside><div className="qj-modal-form"><LeadFormPanel service={service} item={item}/></div></motion.div></motion.div>:null}</AnimatePresence>;
