import { axiosPrivate } from "../utils/axios";

async function saveBlob(blob: Blob, fileName?: string, fallbackUrl?: string): Promise<void> {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download =
    fileName ||
    fallbackUrl?.split("?")[0]?.split("/").pop()?.replace(/[^a-zA-Z0-9._-]/g, "-") ||
    "report";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

/**
 * Downloads a report file from the given URL, or opens it in a new tab.
 * Same-origin API URLs (/api/reports/file/:id) are fetched through the
 * authenticated axios instance so downloads never depend on S3 CORS.
 */
export async function downloadReportFile(
  downloadUrl: string | undefined,
  options: { openInNewTab?: boolean; fileName?: string } = {}
): Promise<void> {
  if (!downloadUrl) return;

  try {
    if (downloadUrl.startsWith("/api/")) {
      // Authenticated API stream — server already sets Content-Disposition.
      const response = await axiosPrivate.get(downloadUrl, { responseType: "blob" });
      await saveBlob(response.data as Blob, options.fileName, downloadUrl);
      return;
    }

    if (options.openInNewTab) {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // A plain <a download> is ignored by the browser for cross-origin URLs
    // (e.g. S3) — it just opens the file instead of downloading it. Fetching
    // the bytes into a blob: URL first forces a real download since blob:
    // URLs are always same-origin to the page.
    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    await saveBlob(blob, options.fileName, downloadUrl);
  } catch {
    // Never navigate the app away on API-stream failures (auth expiry etc.);
    // only legacy direct S3 URLs fall back to a new tab.
    if (!downloadUrl.startsWith("/api/")) {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    }
  }
}
