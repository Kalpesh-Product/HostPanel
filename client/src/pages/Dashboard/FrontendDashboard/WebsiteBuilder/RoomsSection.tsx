// @ts-nocheck
import { Controller, useFieldArray } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import UploadMultipleFilesInput from "../../../../components/UploadMultipleFilesInput";
import EnabledSwitch from "../../../../components/ui/EnabledSwitch";
import WebsiteFormField from "../../../../components/WebsiteFormField";
import ItemExtraFields, { OfferingDescription } from "./ItemExtraFields";
import { getResources } from "../../../../services/resources";

const KIND_BY_FIELD = { meetingRooms: "meeting", coLivingRooms: "coLiving" };

// Meeting-room bookings get finalized against a real Resource record by
// matching its name — a free-typed Title here that doesn't match any
// Resource silently fails finalization later. Letting the host pick an
// existing resource keeps the two in sync.
const BOOKABLE_RESOURCE_TYPES = ["Meeting Room", "Conference Room"];

const RoomsSection = ({
  control,
  register,
  setValue,
  priceLabel = "Price",
  fieldName = "rooms",
  sectionTitle = "Rooms",
  itemLabel = "Room",
  imageLabel = "Room Images",
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName,
  });

  const isMeetingRooms = fieldName === "meetingRooms";
  const { data: bookableResources = [] } = useQuery({
    queryKey: ["bookableResources", "meetingRooms"],
    enabled: isMeetingRooms,
    queryFn: async () => {
      const res = await getResources();
      const resources = res?.data?.data?.resources || [];
      return resources.filter((r) => BOOKABLE_RESOURCE_TYPES.includes(r.type));
    },
  });

  const applyResource = (index, recordId) => {
    const resource = bookableResources.find((r) => String(r.recordId) === recordId);
    if (!resource) return;
    setValue?.(`${fieldName}.${index}.title`, resource.name, { shouldDirty: true });
    if (resource.pricePerHour) {
      setValue?.(`${fieldName}.${index}.price`, String(resource.pricePerHour), { shouldDirty: true });
    }
  };

  return (
    <div className="col-span-2">
      <div className="py-4 border-b-default border-borderGray" data-tour="wb-editor-offerings-section">
        <span className="text-subtitle font-pmedium">{sectionTitle}</span>
      </div>
      <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-xl border border-borderGray p-4 mb-3">
            <div className="flex items-center justify-between mb-3 gap-3">
              <span className="font-pmedium">{itemLabel} #{index + 1}</span>
              <div className="flex items-center gap-3">
                <EnabledSwitch name={`${fieldName}.${index}.enabled`} control={control} />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-500 hover:text-red-700 text-xs font-semibold transition-all"
                >
                  Remove
                </button>
              </div>
            </div>
            {isMeetingRooms && bookableResources.length > 0 && (
              <div className="mb-3">
                <label className="block text-xs font-pmedium text-gray-500 mb-1">
                  Use an existing resource (recommended)
                </label>
                <select
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) applyResource(index, e.target.value); }}
                  className="w-full rounded-lg border border-borderGray px-3 py-2 text-sm"
                >
                  <option value="">Select a resource to autofill name &amp; price…</option>
                  {bookableResources.map((r) => (
                    <option key={r.recordId} value={r.recordId}>{r.name} ({r.type})</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Picking one keeps this listing in sync with the bookable resource, so the booking can be finalized after payment.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <WebsiteFormField
                label="Title"
                registration={register(`${fieldName}.${index}.title`)}
              />
              <WebsiteFormField
                label={priceLabel}
                registration={register(`${fieldName}.${index}.price`)}
              />
              <OfferingDescription control={control} register={register} name={`${fieldName}.${index}.description`} kind="offering" />
            </div>
            <div className="pt-4">
              <Controller
                name={`${fieldName}.${index}.images`}
                control={control}
                render={({ field }) => (
                  <UploadMultipleFilesInput
                    {...field}
                    label={imageLabel}
                    maxFiles={10}
                    allowedExtensions={["jpg", "jpeg", "png", "webp"]}
                    id={`${fieldName}.${index}.images`}
                  />
                )}
              />
            </div>
            <ItemExtraFields
              control={control}
              register={register}
              name={`${fieldName}.${index}`}
              kind={KIND_BY_FIELD[fieldName] || "room"}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            append({ title: "", description: "", price: "", images: [] })
          }
          className="text-[#2563EB] text-sm font-semibold hover:underline inline-flex items-center gap-1 transition-all"
        >
          + Add item
        </button>
      </div>
    </div>
  );
};

export default RoomsSection;

