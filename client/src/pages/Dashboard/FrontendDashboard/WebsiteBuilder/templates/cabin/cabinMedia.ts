import { getMediaSrc } from "../useWebsiteTemplateData";

const CABIN_CDN = "https://cdn.prod.website-files.com/66fef51bb2a32743f5bfff90/";
const CABIN_CMS_CDN = "https://cdn.prod.website-files.com/66fef51bb2a32743f5bfff97/";

/**
 * Real photographs from the reference site. The Bg-Row/Bg-third/Blog/Insta
 * assets are near-white layout masks, so they must never be used as image
 * fallbacks — that is what made the cards look empty.
 */
export const CABIN_FALLBACK_IMAGES = [
  `${CABIN_CDN}66fef51bb2a32743f5bfffe9_clay-banks-UEhjiKh63Ek-unsplash.jpg`,
  `${CABIN_CDN}66fef51bb2a32743f5c00045_clay-banks-Kdmx7BVKfBI-unsplash.jpg`,
  `${CABIN_CDN}66fef51bb2a32743f5c00049_clay-banks-haJdK-oucKg-unsplash.jpg`,
  `${CABIN_CDN}66fef51bb2a32743f5c00044_clay-banks-su9IJ9K_f2I-unsplash.jpg`,
  `${CABIN_CDN}66fef51bb2a32743f5c0004c_clay-banks-D-KyoOIZtmM-unsplash.jpg`,
  `${CABIN_CMS_CDN}66fef51bb2a32743f5c00015_3d-rendering-wooden-house%20(1).jpg`,
  `${CABIN_CDN}66fef51bb2a32743f5c000d0_clay-banks-KjkZqlBayFc-unsplash.jpg`,
  `${CABIN_CDN}66fef51bb2a32743f5c00096_clay-banks-6LSKem6Fkt4-unsplash.jpg`,
  `${CABIN_CMS_CDN}66fef51bb2a32743f5c00014_3d-rendering-wooden-house%20(2).jpg`,
  `${CABIN_CMS_CDN}66fef51bb2a32743f5bfff9a_3d-rendering-wooden-house%20(3).jpg`,
  `${CABIN_CDN}66fef51bb2a32743f5c000a6_Insta-1.jpg`,
  `${CABIN_CDN}66fef51bb2a32743f5c000a7_Insta-2.jpg`,
  `${CABIN_CDN}66fef51bb2a32743f5c000a5_Insta-3.jpg`,
  `${CABIN_CDN}66fef51bb2a32743f5c000a8_Insta-4.jpg`,
  `${CABIN_CDN}66fef51bb2a32743f5c000b3_clay-banks-UEhjiKh63Ek-unsplash%20(1).jpg`,
] as const;

export const cabinFallback = (index = 0): string => {
  const length = CABIN_FALLBACK_IMAGES.length;
  return CABIN_FALLBACK_IMAGES[((index % length) + length) % length];
};

/** Normalizes media objects, URLs and empty values without inventing a fallback. */
export const cabinSrc = (...values: unknown[]): string => {
  for (const value of values) {
    const src = getMediaSrc(value);
    if (src) return src;
  }
  return "";
};

/** Use for always-visible imagery; never returns an empty src. */
export const cabinImage = (...values: unknown[]): string =>
  cabinSrc(...values) || CABIN_FALLBACK_IMAGES[0];
