import React, { useEffect, useState } from "react";
import { resolveTemplate } from "./templateRegistry";

const LIVE_PREVIEW_DRAFT_STORAGE_KEY = "website_builder_live_preview_draft";

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
// to force a specific template regardless of what's saved on the draft.
// Display-only — never writes back to the draft.
const WebsiteTemplateRenderer: React.FC = () => {
  const [themeVariant, setThemeVariant] = useState<string>(readThemeVariant);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LIVE_PREVIEW_DRAFT_STORAGE_KEY) {
        setThemeVariant(readThemeVariant());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const previewOverride = new URLSearchParams(window.location.search).get("previewTemplate");
  const { component: TemplateComponent } = resolveTemplate(previewOverride || themeVariant);
  return <TemplateComponent />;
};

export default WebsiteTemplateRenderer;
