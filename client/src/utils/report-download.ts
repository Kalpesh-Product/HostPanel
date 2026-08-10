/**
 * Downloads a report file from the given URL, or opens it in a new tab.
 */
export async function downloadReportFile(
  downloadUrl: string | undefined,
  options: { openInNewTab?: boolean; fileName?: string } = {}
): Promise<void> {
  if (!downloadUrl) return;

  if (options.openInNewTab) {
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    // A plain <a download> is ignored by the browser for cross-origin URLs
    // (e.g. S3) — it just opens the file instead of downloading it. Fetching
    // the bytes into a blob: URL first forces a real download since blob:
    // URLs are always same-origin to the page.
    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = options.fileName || downloadUrl.split("/").pop() || "report";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  }
}
