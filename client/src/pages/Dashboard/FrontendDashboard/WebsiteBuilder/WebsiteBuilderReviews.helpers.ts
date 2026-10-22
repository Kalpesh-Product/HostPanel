export type WebsiteRecord = {
  searchKey?: string;
  isPublished?: boolean;
  deployedUrl?: string;
  publishedProjectUrl?: string;
} | null;

export type WebsiteEmptyAction = {
  label: string;
  to: string;
  kind: "pending" | "error" | "create" | "edit";
  disabled: boolean;
  isWebsitePublished: boolean;
  publishedWebsiteUrl: string;
};

// Mirrors CompanyLeads' isSameCompanyWebsite so both pages agree on which
// website record belongs to the host's company/workspace.
export function isSameCompanyWebsite(website, companyId, workspaceId, companyName) {
  const websiteCompanyId = String(website?.companyId || "").trim();
  const websiteWorkspaceId = String(website?.workspaceId || "").trim();
  const websiteCompanyName = String(website?.companyName || "").trim().toLowerCase();

  if (companyId && websiteCompanyId) return websiteCompanyId === String(companyId).trim();
  if (workspaceId && websiteWorkspaceId) return websiteWorkspaceId === String(workspaceId).trim();
  return Boolean(companyName) && websiteCompanyName === String(companyName).trim().toLowerCase();
}

// Website reviews can only be collected from a live site, so the empty state
// must read the real website state first: create one, finish/publish a draft,
// or open the already-published site — never a blanket "Publish Website".
export function resolveWebsiteEmptyAction({
  website,
  isWebsitePending,
  isWebsiteError,
}: {
  website: WebsiteRecord;
  isWebsitePending: boolean;
  isWebsiteError: boolean;
}): WebsiteEmptyAction {
  if (isWebsitePending) {
    return {
      label: "Checking Website",
      to: "/key-apps/website-builder",
      kind: "pending",
      disabled: true,
      isWebsitePublished: false,
      publishedWebsiteUrl: "",
    };
  }

  const websiteSearchKey = String(website?.searchKey || "").trim();
  const publishedWebsiteUrl = String(website?.deployedUrl || website?.publishedProjectUrl || "").trim();
  const isWebsitePublished = Boolean(website?.isPublished === true || publishedWebsiteUrl);

  if (!website) {
    return {
      label: isWebsiteError ? "Open Website Builder" : "Create Website",
      to: "/key-apps/website-builder",
      kind: isWebsiteError ? "error" : "create",
      disabled: false,
      isWebsitePublished: false,
      publishedWebsiteUrl: "",
    };
  }

  return {
    label: "Edit Website",
    to: websiteSearchKey
      ? `/key-apps/website-builder/edit-website/${encodeURIComponent(websiteSearchKey)}`
      : "/key-apps/website-builder/dynamic/create-website",
    kind: "edit",
    disabled: false,
    isWebsitePublished,
    publishedWebsiteUrl,
  };
}
