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
    desktopTrigger: "text-[14px] font-medium border-b-2 border-transparent pb-1",
    desktopPanel: "border border-[color:color-mix(in_srgb,var(--t-text,#ffffff)_10%,transparent)] bg-[var(--t-surface,#11111a)] shadow-2xl",
    desktopItem: "text-[color:color-mix(in_srgb,var(--t-text,#ffffff)_70%,transparent)] hover:bg-[color-mix(in_srgb,var(--t-text,#ffffff)_7%,transparent)] hover:text-[color:var(--t-text,#ffffff)]",
    desktopActive: "border-[color:var(--t-accent,#D94B4B)] text-[color:var(--t-accent,#D94B4B)]",
    mobileWrap: "border-b border-[color:color-mix(in_srgb,var(--t-text,#ffffff)_8%,transparent)]",
    mobileRow: "text-[14px] font-medium text-[color:color-mix(in_srgb,var(--t-text,#ffffff)_80%,transparent)]",
    mobilePanel: "border-t border-[color:color-mix(in_srgb,var(--t-text,#ffffff)_8%,transparent)] bg-[color-mix(in_srgb,var(--t-text,#ffffff)_3%,transparent)]",
    mobileItem: "text-[color:color-mix(in_srgb,var(--t-text,#ffffff)_70%,transparent)] hover:bg-[color-mix(in_srgb,var(--t-text,#ffffff)_7%,transparent)] hover:text-[color:var(--t-text,#ffffff)]",
  },
  warm: {
    desktopTrigger: "text-[13px] border-b-2 border-transparent pb-1 text-[color:var(--t-text,#5b473b)] hover:text-[color:var(--t-accent,#b85c38)]",
    desktopPanel: "border border-[color:color-mix(in_srgb,var(--t-text,#6b4f3b)_15%,transparent)] bg-[var(--t-raised,#fffaf1)] shadow-xl",
    desktopItem: "text-[color:var(--t-muted,#6b584b)] hover:bg-[var(--t-bg,#f1e6d3)] hover:text-[color:var(--t-accent,#b85c38)]",
    desktopActive: "border-[color:var(--t-accent,#b85c38)] font-semibold text-[color:var(--t-accent,#b85c38)]",
    mobileWrap: "border-b border-[color:color-mix(in_srgb,var(--t-text,#6b4f3b)_15%,transparent)]",
    mobileRow: "text-[14px] text-[color:var(--t-text,#3b3029)]",
    mobilePanel: "border-t border-[color:color-mix(in_srgb,var(--t-text,#6b4f3b)_10%,transparent)] bg-[color-mix(in_srgb,var(--t-bg,#f1e6d3)_60%,transparent)]",
    mobileItem: "text-[color:var(--t-muted,#6b584b)] hover:bg-[var(--t-bg,#f1e6d3)] hover:text-[color:var(--t-accent,#b85c38)]",
  },
  emerald: {
    desktopTrigger: "text-sm font-medium border-b-2 border-transparent pb-1 text-white/90 hover:text-white hover:border-white",
    desktopPanel: "border border-white/25 bg-[#2f4a70] shadow-2xl",
    desktopItem: "text-white/90 hover:bg-white/15 hover:text-white",
    desktopActive: "border-white font-semibold text-white",
    mobileWrap: "border-b border-white/20",
    mobileRow: "text-sm font-medium text-white/90",
    mobilePanel: "border-t border-white/20 bg-white/10",
    mobileItem: "text-white/90 hover:bg-white/15 hover:text-white",
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
    <div ref={rootRef} className="relative inline-flex items-center">
      <div
        className={`inline-flex items-center gap-1.5 ${theme.desktopTrigger} ${isActive || open ? theme.desktopActive : ""}`}
        style={
          variant === "fresh" && (isActive || open)
            ? { color: "#D94B4B", borderBottomColor: "#D94B4B" }
            : variant === "warm" && (isActive || open)
              ? { color: "#b85c38", borderBottomColor: "#b85c38" }
              : undefined
        }
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
