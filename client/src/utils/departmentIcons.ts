import {
  BadgeCheck,
  Blocks,
  Boxes,
  Briefcase,
  Building2,
  Cog,
  Factory,
  FlaskConical,
  GraduationCap,
  Headphones,
  Landmark,
  Layers,
  Megaphone,
  Package,
  Palette,
  PenLine,
  Puzzle,
  Scale,
  School,
  Server,
  Shapes,
  ShieldCheck,
  Store,
  Stethoscope,
  Target,
  Truck,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react";
import type { ElementType } from "react";

const DEPT_ICON_KEYWORDS: Array<{ keywords: string[]; icon: ElementType }> = [
  { keywords: ["hr", "human resource", "people", "talent", "workforce"], icon: Users },
  { keywords: ["finance", "account", "money", "budget", "billing", "payroll", "treasury"], icon: WalletCards },
  { keywords: ["sales", "revenue", "business development"], icon: Target },
  { keywords: ["market", "marketing", "brand", "pr", "growth", "communications"], icon: Megaphone },
  { keywords: ["legal", "law", "compliance", "contract", "paralegal", "audit"], icon: Scale },
  { keywords: ["it", "tech", "software", "engineer", "engineering", "development", "devops", "data"], icon: Server },
  { keywords: ["design", "creative", "ui", "ux", "visual", "graphic"], icon: Palette },
  { keywords: ["customer", "support", "success", "care", "helpdesk", "service"], icon: Headphones },
  { keywords: ["operations", "ops", "general", "administration", "office"], icon: Cog },
  { keywords: ["security", "safety", "guard", "vigilance"], icon: ShieldCheck },
  { keywords: ["quality", "qa", "testing", "assurance", "inspection"], icon: BadgeCheck },
  { keywords: ["logistics", "supply", "procurement", "purchase", "inventory", "warehouse", "delivery"], icon: Truck },
  { keywords: ["maintenance", "facility", "housekeep", "cleaning", "repair", "estate"], icon: Wrench },
  { keywords: ["research", "r&d", "rd", "innovation", "lab", "analytics"], icon: FlaskConical },
  { keywords: ["content", "writing", "editorial", "copy", "document", "publication"], icon: PenLine },
  { keywords: ["production", "manufacturing", "factory", "plant"], icon: Factory },
  { keywords: ["health", "medical", "clinical", "wellness", "nursing"], icon: Stethoscope },
  { keywords: ["education", "training", "learning", "academy", "school", "development"], icon: GraduationCap },
];

const DEPT_ICON_POOL: ElementType[] = [
  Building2,
  Store,
  Briefcase,
  Landmark,
  Layers,
  Blocks,
  Puzzle,
  Factory,
  School,
  Shapes,
  Boxes,
  Package,
];

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

// Shared with the sidebar so a custom department's icon (chosen by matching
// keywords in its name, or a deterministic hash-based pick otherwise) stays
// identical wherever that department is shown — sidebar nav or module cards.
export const resolveDepartmentIcon = (name: string): ElementType => {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized) return Building2;
  const matched = DEPT_ICON_KEYWORDS.find((entry) =>
    entry.keywords.some((keyword) => normalized.includes(keyword)),
  );
  if (matched) return matched.icon;
  return DEPT_ICON_POOL[hashString(normalized) % DEPT_ICON_POOL.length];
};
