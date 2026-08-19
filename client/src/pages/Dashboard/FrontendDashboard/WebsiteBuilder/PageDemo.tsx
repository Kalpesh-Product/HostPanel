import React from "react";
import WebsiteTemplateRenderer from "./templates/WebsiteTemplateRenderer";

// Thin route wrapper — kept at this path/name because Routes.tsx imports it
// directly (/website-preview, /live-demo). All actual rendering now lives in
// templates/ (see templateRegistry.ts), so new visual templates can be added
// there without touching this file or the routes.
const PageDemo: React.FC = () => <WebsiteTemplateRenderer />;

export default PageDemo;
