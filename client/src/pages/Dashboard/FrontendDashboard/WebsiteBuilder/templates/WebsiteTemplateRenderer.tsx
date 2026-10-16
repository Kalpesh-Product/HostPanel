import React, { useEffect, useState } from "react";
import { buildDemoPreviewDraft } from "./demoPreviewData";
import { resolveTemplate } from "./templateRegistry";

const LIVE_PREVIEW_DRAFT_STORAGE_KEY = "website_builder_live_preview_draft";

type PreviewMetadata = { title: string; favicon: string };

const mediaSrc = (value: any): string =>
  typeof value === "string" ? value.trim() : String(value?.url || value?.src || "").trim();

const readPreviewMetadata = (): PreviewMetadata => {
  try {
    const raw = localStorage.getItem(LIVE_PREVIEW_DRAFT_STORAGE_KEY);
    const draft = raw ? JSON.parse(raw) : null;
    return {
      title: String(draft?.companyName || "Website Preview").trim() || "Website Preview",
      favicon: mediaSrc(draft?.companyLogo),
    };
  } catch {
    return { title: "Website Preview", favicon: "" };
  }
};

const readThemeVariant = (): string => {
  try {
    const raw = localStorage.getItem(LIVE_PREVIEW_DRAFT_STORAGE_KEY);
    if (!raw) return "default";
    const draft = JSON.parse(raw);
    return String(draft?.themeVariant || "default").trim() || "default";
  } catch {
    return "default";
  }
};

// Picks which visual template component to mount based on the draft's
// themeVariant. Today only "default" (Classic) and "minimal-swiss" exist in
// the registry — this component exists to give every template a single
// switch point without touching PageDemo.tsx or the template components.
//
// Manual testing helper: until the real picker UI is built, append
// ?previewTemplate=<id> to the preview URL (e.g. /website-preview?previewTemplate=minimal-swiss)
// to force a specific template regardless of what's saved on the draft. Add
// &demo=1 to seed that template's local-only demo draft for visual QA.
const WebsiteTemplateRenderer: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const previewOverride = params.get("previewTemplate");
  const [themeVariant, setThemeVariant] = useState<string>(() => {
    if (previewOverride && params.get("demo") === "1") {
      try {
        localStorage.setItem(
          LIVE_PREVIEW_DRAFT_STORAGE_KEY,
          JSON.stringify(buildDemoPreviewDraft(previewOverride)),
        );
        return previewOverride;
      } catch {
        return readThemeVariant();
      }
    }
    return readThemeVariant();
  });
  const [metadata, setMetadata] = useState<PreviewMetadata>(readPreviewMetadata);

  useEffect(() => {
    const refreshPreviewState = () => {
      setThemeVariant(readThemeVariant());
      const next = readPreviewMetadata();
      setMetadata((current) => current.title === next.title && current.favicon === next.favicon ? current : next);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LIVE_PREVIEW_DRAFT_STORAGE_KEY) {
        refreshPreviewState();
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("website-preview-draft-updated", refreshPreviewState);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("website-preview-draft-updated", refreshPreviewState);
    };
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    const existingIcons = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
    const previousIcons = existingIcons.map((icon) => ({ icon, href: icon.getAttribute("href") }));
    let createdIcon: HTMLLinkElement | null = null;

    document.title = metadata.title;
    if (metadata.favicon) {
      if (existingIcons.length) {
        existingIcons.forEach((icon) => { icon.href = metadata.favicon; });
      } else {
        const icon = document.createElement("link");
        icon.rel = "icon";
        icon.href = metadata.favicon;
        document.head.appendChild(icon);
        createdIcon = icon;
      }
    }

    return () => {
      document.title = previousTitle;
      previousIcons.forEach(({ icon, href }) => href === null ? icon.removeAttribute("href") : icon.setAttribute("href", href));
      createdIcon?.remove();
    };
  }, [metadata]);

  const { component: TemplateComponent } = resolveTemplate(previewOverride || themeVariant);
  return <TemplateComponent />;
};

export default WebsiteTemplateRenderer;
