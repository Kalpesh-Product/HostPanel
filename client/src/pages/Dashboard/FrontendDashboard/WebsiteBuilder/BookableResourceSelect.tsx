// @ts-nocheck
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getResources } from "../../../../services/resources";

const normalize = (value) => String(value || "").trim().toLowerCase();

// Autofill picker shared by the website listing editors (dorms, meeting rooms,
// co-living, co-working services).
//
// It never creates a listing on its own. A resource already used by another
// card in the same section is disabled here, because two cards pointing at one
// bookable resource publish two listings that both resolve to it — two guests
// can pay for the same room, and the second booking cannot be honoured.
//
// The listing arrays have no resourceId column, so the card's own Title is the
// only link that survives a save: matching it against a resource name is what
// re-selects the dropdown after a reload, and it is the same name match
// `resolveRoomForLead` uses at finalization. Other cards' titles are what mark
// an option as taken.
const BookableResourceSelect = ({
  resourceTypes = [],
  queryKeySuffix = "",
  onSelect,
  ownTitle = "",
  otherTitles = [],
  label = "Use an existing resource (recommended)",
  placeholder = "Select a resource to autofill name & price…",
  hint = "Picking one keeps this listing in sync with the bookable resource, so the booking can be finalized after payment.",
}) => {
  const [pickedId, setPickedId] = useState("");

  // Only `status === "Active"` resources are offered: finalization refuses
  // anything else, so an archived resource here would build a page that can
  // never be finalized after payment.
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["bookableResources", queryKeySuffix, resourceTypes.join("|")],
    enabled: resourceTypes.length > 0,
    queryFn: async () => {
      const res = await getResources();
      const list = res?.data?.data?.resources || [];
      return list.filter(
        (r) => resourceTypes.includes(r.type) && r.status === "Active",
      );
    },
  });

  if (resourceTypes.length === 0) return null;

  if (isLoading) {
    return (
      <p className="mb-3 text-[11px] text-gray-400">
        Loading bookable resources…
      </p>
    );
  }

  if (resources.length === 0) {
    return (
      <p className="mb-3 text-[11px] text-amber-600">
        No active {resourceTypes.join(" / ")} resource yet. Create one in
        Resources &amp; Pricing, then reopen this page to link it here.
      </p>
    );
  }

  const ownMatch = resources.find(
    (resource) => normalize(resource.name) === normalize(ownTitle) && ownTitle,
  );
  const selectedId = pickedId || (ownMatch ? String(ownMatch.recordId) : "");
  const selectedResource = resources.find(
    (resource) => String(resource.recordId) === selectedId,
  );

  const isUsedByAnotherCard = (resource) =>
    normalize(resource.name) !== normalize(ownTitle) &&
    otherTitles.some((title) => normalize(title) === normalize(resource.name));

  return (
    <div className="mb-3">
      <label className="block text-xs font-pmedium text-gray-500 mb-1">
        {label}
      </label>
      <select
        value={selectedResource ? selectedId : ""}
        onChange={(event) => {
          const nextId = event.target.value;
          setPickedId(nextId);
          if (!nextId) return;
          const resource = resources.find((r) => String(r.recordId) === nextId);
          if (resource) onSelect?.(resource);
        }}
        className="w-full rounded-lg border border-borderGray px-3 py-2 text-sm"
      >
        <option value="">{placeholder}</option>
        {resources.map((resource) => {
          const taken = isUsedByAnotherCard(resource);
          return (
            <option
              key={String(resource.recordId)}
              value={String(resource.recordId)}
              disabled={taken}
            >
              {resource.name} ({resource.type})
              {taken ? " — already used in this section" : ""}
            </option>
          );
        })}
      </select>
      <p className="text-[11px] text-gray-400 mt-1">
        {selectedResource
          ? `Filled from "${selectedResource.name}". Pick the first option to clear this, or choose another resource to refill.`
          : hint}
      </p>
    </div>
  );
};

export default BookableResourceSelect;
