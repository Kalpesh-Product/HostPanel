import type { ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";

const QERJA_DEMO_PRICES = [
  "₹699 / day",
  "₹9,000 / month",
  "₹18,000 / month",
  "₹42,000 / month",
  "₹1,200 / hour",
];

export const qerjaPrice = (item: ServiceItem, index = 0) =>
  priceWithUnit(item.price, item.priceUnit) ||
  QERJA_DEMO_PRICES[index % QERJA_DEMO_PRICES.length];
