import { useEffect, useRef } from "react";
import type { Service, ServiceItem } from "../serviceAdapter";
import { LeadFormPanel } from "../shared/TplLead";
import { useCoPlace } from "./CoPlaceContext";

export function CoPlaceBooking({ service, item, onClose }: {
  service: Service;
  item: ServiceItem | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { c, draft } = useCoPlace();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const canTour = service.kind === "workspace" && draft?.tourBooking?.enabled !== false;

  return (
    <dialog className="coplace-dialog" ref={dialog} aria-labelledby="coplace-booking-title" onCancel={(event) => {
      event.preventDefault();
      onClose();
    }}>
      <div className="coplace-dialog-inner">
        <button type="button" className="coplace-dialog-close" onClick={onClose} aria-label="Close enquiry">×</button>
        <p className="coplace-kicker">{item?.title || draft.companyName}</p>
        <h2 id="coplace-booking-title">{item || !canTour ? c("booking.title", "Workspace enquiry") : c("booking.cta", "Book a tour")}</h2>
        <LeadFormPanel service={service} item={item} defaultMode={!item && canTour ? "visit" : "enquiry"} />
      </div>
    </dialog>
  );
}
