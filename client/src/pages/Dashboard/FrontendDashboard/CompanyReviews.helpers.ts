export type ListingsEmptyState = {
  label: string;
  to: string;
  kind: "pending" | "error" | "add" | "manage" | "view";
  disabled: boolean;
};

// The Nomads Reviews empty state is only useful if it points at the right
// listing action. With no listings the host must add one; with listings that
// exist but are all switched off they must activate one; only once something
// is active AND public can visitors actually leave a review.
export function resolveListingsEmptyAction({
  isPending,
  isError,
  listingCount,
  activePublicListingCount,
}: {
  isPending: boolean;
  isError: boolean;
  listingCount: number;
  activePublicListingCount: number;
}): ListingsEmptyState {
  if (isPending) {
    return { label: "Checking Listings", to: "/key-apps/nomad-listings", kind: "pending", disabled: true };
  }
  if (isError) {
    // Never claim the host has no listings when the lookup simply failed.
    return { label: "View Listings", to: "/key-apps/nomad-listings", kind: "error", disabled: false };
  }
  if (!listingCount) {
    return { label: "Add Listing", to: "/key-apps/nomad-listings/add", kind: "add", disabled: false };
  }
  if (!activePublicListingCount) {
    return { label: "Manage Listings", to: "/key-apps/nomad-listings", kind: "manage", disabled: false };
  }
  return { label: "View Listings", to: "/key-apps/nomad-listings", kind: "view", disabled: false };
}
