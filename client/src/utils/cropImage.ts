export interface CropPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}

// Header logo display box: the logo sits on the left of the header as
// `h-12` tall with `max-w-[70%]` of the open sidebar (w-60 = 240px), so the
// visible slot is ~168x48px (3.5:1). The crop/positioning preview mirrors this.
export const LOGO_DISPLAY_ASPECT = 168 / 48;
export const LOGO_OUTPUT_WIDTH = 1680;
export const LOGO_OUTPUT_HEIGHT = 480;

// Renders the user's chosen crop/zoom/position onto a fixed-size canvas so the
// uploaded file always matches the slot the image is displayed in, regardless
// of the source photo's aspect ratio.
async function getCroppedBlob(
  imageSrc: string,
  cropPixels: CropPixels,
  outputWidth: number,
  outputHeight: number,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to crop image"))),
      "image/jpeg",
      0.92,
    );
  });
}

// Square avatar crop (profile photos display as a square/round slot).
export async function getCroppedImageBlob(
  imageSrc: string,
  cropPixels: CropPixels,
  outputSize = 512,
): Promise<Blob> {
  return getCroppedBlob(imageSrc, cropPixels, outputSize, outputSize);
}

// Wide header-logo crop (the logo slot on the left side of the header).
export async function getCroppedLogoBlob(
  imageSrc: string,
  cropPixels: CropPixels,
): Promise<Blob> {
  return getCroppedBlob(imageSrc, cropPixels, LOGO_OUTPUT_WIDTH, LOGO_OUTPUT_HEIGHT);
}
