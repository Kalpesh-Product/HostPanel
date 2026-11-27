import { useEffect, useRef } from "react";
import type { Service, ServiceItem } from "../serviceAdapter";
import { LeadFormPanel } from "../shared/TplLead";
import { useCabin } from "./CabinContext";

export function CabinBooking({ service, item, onClose }: {
  service: Service;
  item: ServiceItem | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { c, draft } = useCabin();
  const legacyTitle = c("booking.title", "Book a stay");
  const title = c("booking.modalTitle", legacyTitle === "Request a stay" ? "Book a stay" : legacyTitle);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog className="cabin-dialog" ref={dialog} aria-labelledby="cabin-booking-title" onCancel={(event) => {
      event.preventDefault();
      onClose();
    }}>
      <div className="cabin-dialog-inner">
        <button type="button" className="cabin-dialog-close" onClick={onClose} aria-label="Close reservation">×</button>
        <p className="cabin-kicker">{item?.title || draft.companyName}</p>
        <h2 id="cabin-booking-title">{title}</h2>
        <LeadFormPanel service={service} item={item} />
      </div>
    </dialog>
  );
}
