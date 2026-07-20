import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { CircleHelp } from "lucide-react";

interface PageGuideButtonProps {
  available: boolean;
  onStart: () => void;
}

const findPageHeading = () => {
  const selectors = [
    '[data-tour="page-content"] [data-page-title]',
    '[data-tour="page-content"] h1',
    '[data-tour="page-content"] h2',
    '[data-tour="page-content"] .text-title',
  ];

  for (const selector of selectors) {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const heading = candidates.find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !candidate.closest('[role="dialog"]');
    });
    if (heading) return heading;
  }
  return null;
};

export default function PageGuideButton({ available, onStart }: PageGuideButtonProps) {
  const location = useLocation();
  const [portalHost, setPortalHost] = useState<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!available) {
      setPortalHost(null);
      return;
    }

    let host: HTMLSpanElement | null = null;
    const attachToHeading = () => {
      if (host?.isConnected) return;
      const heading = findPageHeading();
      if (!heading) return;

      host = document.createElement("span");
      host.dataset.pageGuideAnchor = "true";
      host.className = "ml-2 inline-flex align-middle normal-case";
      heading.appendChild(host);
      setPortalHost(host);
    };

    attachToHeading();
    const pageContent = document.querySelector('[data-tour="page-content"]');
    const observer = new MutationObserver(attachToHeading);
    if (pageContent) observer.observe(pageContent, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      host?.remove();
    };
  }, [available, location.pathname]);

  if (!portalHost) return null;

  return createPortal(
    <button
      type="button"
      data-tour="page-guide-button"
      onClick={onStart}
      className="group relative inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 text-[11px] font-pmedium leading-none text-[#2563EB] shadow-sm transition-all hover:border-blue-300 hover:bg-[#2563EB] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
      aria-label="Show this page guide"
      title="Show this page guide"
    >
      <CircleHelp aria-hidden="true" size={14} strokeWidth={2} />
      <span>Guide</span>
    </button>,
    portalHost,
  );
}
