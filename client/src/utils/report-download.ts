/**
 * Downloads a report file from the given URL, or opens it in a new tab.
 */
export async function downloadReportFile(
  downloadUrl: string | undefined,
  options: { openInNewTab?: boolean } = {}
): Promise<void> {
  if (!downloadUrl) return;

  if (options.openInNewTab) {
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = downloadUrl.split("/").pop() || "report";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  }
}
