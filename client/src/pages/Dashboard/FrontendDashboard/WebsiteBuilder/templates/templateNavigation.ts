export const normalizeTemplateNavSlug = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const isProductsNavItem = (item: any) => {
  const slug = normalizeTemplateNavSlug(item?.slug || item?.name);
  return slug === "products" || slug === "product";
};
