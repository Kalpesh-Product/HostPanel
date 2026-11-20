import { useEffect, useRef } from "react";
import type { Service, ServiceItem } from "../serviceAdapter";
import { LeadFormPanel } from "../shared/TplLead";
import { useRestobar } from "./RestobarContext";

export function RestobarBooking({ service, item, onClose }: {
  service: Service;
  item: ServiceItem | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { c, draft } = useRestobar();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog className="resto-dialog" ref={dialog} aria-labelledby="resto-booking-title" onCancel={(event) => {
      event.preventDefault();
      onClose();
    }}>
      <div className="resto-dialog-inner">
        <button type="button" className="resto-dialog-close" onClick={onClose} aria-label="Close reservation">×</button>
        <p className="resto-kicker">{item?.title || draft.companyName}</p>
        <h2 id="resto-booking-title">{c("booking.title", "Book a table")}</h2>
        <LeadFormPanel service={service} item={item} />
      </div>
    </dialog>
  );
}
