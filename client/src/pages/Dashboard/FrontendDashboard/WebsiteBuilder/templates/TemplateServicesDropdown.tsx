import React, { useEffect, useRef, useState } from "react";
import { normalizeTemplateNavSlug } from "./templateNavigation";

type DropdownVariant = "minimal" | "fresh" | "warm" | "emerald";

interface TemplateServicesDropdownProps {
  item: any;
  productPages: any[];
  currentSection: string;
  currentProductSlug?: string;
  goToSection: (slug: string) => void;
  goToProductPage: (slug: string) => void;
  variant: DropdownVariant;
  mobile?: boolean;
}

const styles: Record<
  DropdownVariant,
  {
    desktopTrigger: string;
    desktopPanel: string;
    desktopItem: string;
    desktopActive: string;
    mobileWrap: string;
    mobileRow: string;
    mobilePanel: string;
    mobileItem: string;
  }
> = {
  minimal: {
    desktopTrigger:
      "text-[12px] font-medium uppercase tracking-[0.2em] text-[#b9b8ff]/60 hover:text-white",
    desktopPanel: "border border-white/15 bg-black shadow-2xl",
    desktopItem: "text-[#b9b8ff]/70 hover:bg-white/10 hover:text-white",
    desktopActive: "bg-white/10 text-white",
    mobileWrap: "border-b border-white/10",
    mobileRow: "text-[13px] font-medium uppercase tracking-[0.15em] text-white",
    mobilePanel: "border-t border-white/10 bg-white/[0.04]",
    mobileItem: "text-[#b9b8ff]/70 hover:bg-white/10 hover:text-white",
  },
  fresh: {
    desktopTrigger: "text-[14px] font-medium border-b-2 border-transparent pb-1 text-white/80 hover:text-white hover:border-[#E11D48]",
    desktopPanel: "border border-white/10 bg-[#11111a] shadow-2xl",
    desktopItem: "text-white/70 hover:bg-white/[0.07] hover:text-white",
    desktopActive: "border-[#E11D48] text-[#E11D48]",
    mobileWrap: "border-b border-white/[0.08]",
    mobileRow: "text-[14px] font-medium text-white/80",
    mobilePanel: "border-t border-white/[0.08] bg-white/[0.03]",
    mobileItem: "text-white/70 hover:bg-white/[0.07] hover:text-white",
  },
  warm: {
    desktopTrigger: "text-[13px] text-[#5b473b] hover:text-[#b85c38]",
    desktopPanel: "border border-[#6b4f3b]/15 bg-[#fffaf1] shadow-xl",
    desktopItem: "text-[#6b584b] hover:bg-[#f1e6d3] hover:text-[#b85c38]",
    desktopActive: "bg-[#f1e6d3] font-semibold text-[#b85c38]",
    mobileWrap: "border-b border-[#6b4f3b]/15",
    mobileRow: "text-[14px] text-[#3b3029]",
    mobilePanel: "border-t border-[#6b4f3b]/10 bg-[#f1e6d3]/60",
    mobileItem: "text-[#6b584b] hover:bg-[#f1e6d3] hover:text-[#b85c38]",
  },
  emerald: {
    desktopTrigger: "text-sm font-medium border-b-2 border-transparent pb-1 text-stone-400 hover:text-stone-100 hover:border-[#ffb900]",
    desktopPanel: "border border-emerald-700/60 bg-[#003b2e] shadow-2xl",
    desktopItem: "text-stone-300 hover:bg-emerald-800/70 hover:text-amber-400",
    desktopActive: "border-[#ffb900] font-semibold text-amber-400",
    mobileWrap: "border-b border-emerald-800/50",
    mobileRow: "text-sm font-medium text-stone-300",
    mobilePanel: "border-t border-emerald-800/50 bg-emerald-900/50",
    mobileItem: "text-stone-400 hover:bg-emerald-800/60 hover:text-amber-400",
  },
};

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 20 20"
    aria-hidden="true"
    className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 7.5l5 5 5-5" />
  </svg>
);

const TemplateServicesDropdown: React.FC<TemplateServicesDropdownProps> = ({
  item,
  productPages,
  currentSection,
  currentProductSlug,
  goToSection,
  goToProductPage,
  variant,
  mobile = false,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const theme = styles[variant];
  const isActive = currentSection === "products";

  useEffect(() => {
    if (!open || mobile) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [mobile, open]);

  const goAllProducts = () => {
    setOpen(false);
    goToSection(item?.slug || "products");
  };

  const goProduct = (product: any) => {
    setOpen(false);
    goToProductPage(product?.slug || product?.name || "product");
  };

  if (mobile) {
    return (
      <div className={theme.mobileWrap}>
        <div
          className={`flex items-center gap-2 py-3 ${theme.mobileRow} ${isActive || open ? "font-semibold" : ""}`}
        >
          <button
            type="button"
            onClick={goAllProducts}
            className="flex-1 text-left"
          >
            {item?.name || "Services"}
          </button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-current/20"
            aria-label="Toggle product pages"
            aria-expanded={open}
          >
            <Chevron open={open} />
          </button>
        </div>
        {open && productPages.length > 0 ? (
          <div className={`flex flex-col gap-1 p-2 ${theme.mobilePanel}`}>
            <button
              type="button"
              onClick={goAllProducts}
              className={`rounded px-3 py-2 text-left text-sm font-semibold ${theme.mobileItem}`}
            >
              All Services
            </button>
            {productPages.map((product, index) => (
              <button
                key={`mobile-product-${product?.slug || index}`}
                type="button"
                onClick={() => goProduct(product)}
                className={`rounded px-3 py-2 text-left text-sm ${theme.mobileItem}`}
              >
                {product?.name || product?.heading || "Service"}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className={`inline-flex items-center gap-1.5 ${theme.desktopTrigger} ${isActive || open ? theme.desktopActive : ""}`}
      >
        <button type="button" onClick={goAllProducts}>
          {item?.name || "Services"}
        </button>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle products menu"
          aria-expanded={open}
          className="inline-flex items-center justify-center"
        >
          <Chevron open={open} />
        </button>
      </div>
      {open && productPages.length > 0 ? (
        <div
          className={`absolute left-1/2 top-full z-50 mt-3 w-60 -translate-x-1/2 rounded-xl p-2 ${theme.desktopPanel}`}
        >
          <button
            type="button"
            onClick={goAllProducts}
            className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${theme.desktopItem}`}
          >
            All Services
          </button>
          {productPages.map((product, index) => {
            const productSlug = normalizeTemplateNavSlug(
              product?.slug || product?.name,
            );
            const selected =
              isActive &&
              normalizeTemplateNavSlug(currentProductSlug) === productSlug;
            return (
              <button
                key={`product-${product?.slug || index}`}
                type="button"
                onClick={() => goProduct(product)}
                className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm ${selected ? theme.desktopActive : theme.desktopItem}`}
              >
                {product?.name || product?.heading || "Service"}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default TemplateServicesDropdown;
