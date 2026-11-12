import { useEffect, useRef } from "react";
import type { Service, ServiceItem } from "../serviceAdapter";
import { LeadFormPanel } from "../shared/TplLead";
import { useTinyHome } from "./TinyHomeContext";

export function TinyHomeBooking({ service, item, onClose }: {
  service: Service;
  item: ServiceItem | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { c, draft } = useTinyHome();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog className="tinyhome-dialog" ref={dialog} aria-labelledby="tinyhome-booking-title" onCancel={(event) => {
      event.preventDefault();
      onClose();
    }}>
      <div className="tinyhome-dialog-inner">
        <button type="button" className="tinyhome-dialog-close" onClick={onClose} aria-label="Close reservation">×</button>
        <p className="tinyhome-kicker">{item?.title || draft.companyName}</p>
        <h2 id="tinyhome-booking-title">{c("booking.title", "Request a stay")}</h2>
        <LeadFormPanel service={service} item={item} />
      </div>
    </dialog>
  );
}
