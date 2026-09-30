import React, { useEffect, useState } from "react";
import { AnimatePresence, Reveal, motion } from "../motion";
import { Icon } from "./TplUI";
import { useTpl } from "./TplContext";

/* ───────────────────────── FAQ (also used on other pages) ───────────────────────── */

export const FaqSection: React.FC<{ faqs?: any[] }> = ({ faqs }) => {
  const [open, setOpen] = useState<number | null>(0);
  const list = (faqs || []).filter((faq) => faq?.question && faq?.enabled !== false);
  if (!list.length) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <p className="tp-eyebrow mb-3">FAQ</p>
          <h2 className="tp-h2">Good to know</h2>
        </Reveal>
        <div className="space-y-3">
          {list.map((faq, index) => {
            const isOpen = open === index;
            return (
              <Reveal key={index} delay={Math.min(index * 0.05, 0.25)}>
                <div className="tp-card overflow-hidden" style={{ borderRadius: 22 }}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : index)}
                  >
                    <span className="text-[16px] font-bold">{faq.question}</span>
                    <motion.span animate={{ rotate: isOpen ? 45 : 0 }} style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{Icon.plus(20)}</motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: "hidden" }}>
                        <p className="tp-muted whitespace-pre-line px-6 pb-5 text-[15px] leading-relaxed">{faq.answer}</p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};


export const Lightbox: React.FC = () => {
  const { t } = useTpl();
  const open: boolean = t.galleryViewerOpen;
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") t.closeGalleryViewer();
      if (event.key === "ArrowRight") t.goToGalleryIndex(t.galleryViewerIndex + 1);
      if (event.key === "ArrowLeft") t.goToGalleryIndex(t.galleryViewerIndex - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, t.galleryViewerIndex]);
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(8,6,4,.92)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={t.closeGalleryViewer}
        >
          <button type="button" aria-label="Previous photo" className="absolute left-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white md:left-8" onClick={(e) => { e.stopPropagation(); t.goToGalleryIndex(t.galleryViewerIndex - 1); }}>
            <span style={{ transform: "rotate(180deg)", display: "flex" }}>{Icon.arrow(20)}</span>
          </button>
          <motion.img
            key={t.galleryViewerIndex}
            src={t.galleryItems[t.galleryViewerIndex]}
            alt=""
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="max-h-[86vh] max-w-[88vw] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button type="button" aria-label="Next photo" className="absolute right-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white md:right-8" onClick={(e) => { e.stopPropagation(); t.goToGalleryIndex(t.galleryViewerIndex + 1); }}>
            {Icon.arrow(20)}
          </button>
          <button type="button" aria-label="Close" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white" onClick={t.closeGalleryViewer}>
            {Icon.close(20)}
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export const Toast: React.FC = () => {
  const { t } = useTpl();
  return (
    <AnimatePresence>
      {t.successPopup?.open ? (
        <motion.div
          className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          role="status"
        >
          <div className="tp-btn tp-btn-dark shadow-xl">{Icon.check(16)} {t.successPopup.message}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

/** Simple lightbox for one item's own photos. */
export const PhotoViewer: React.FC<{ images: string[]; index: number | null; onClose: () => void; onChange: (index: number) => void }> = ({
  images,
  index,
  onClose,
  onChange,
}) => {
  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onChange((index + 1) % images.length);
      if (event.key === "ArrowLeft") onChange((index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images.length]);
  return (
    <AnimatePresence>
      {index !== null && images[index] ? (
        <motion.div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(8,10,12,.94)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={onClose}>
          <button type="button" aria-label="Previous photo" className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white md:left-8" onClick={(e) => { e.stopPropagation(); onChange((index - 1 + images.length) % images.length); }}>
            <span style={{ display: "flex", transform: "rotate(180deg)" }}>{Icon.arrow(20)}</span>
          </button>
          <motion.img key={images[index]} src={images[index]} alt="" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-h-[86vh] max-w-[90vw] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          <button type="button" aria-label="Next photo" className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white md:right-8" onClick={(e) => { e.stopPropagation(); onChange((index + 1) % images.length); }}>
            {Icon.arrow(20)}
          </button>
          <button type="button" aria-label="Close" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white" onClick={onClose}>{Icon.close(20)}</button>
          <span className="absolute bottom-5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white">{index + 1} / {images.length}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
