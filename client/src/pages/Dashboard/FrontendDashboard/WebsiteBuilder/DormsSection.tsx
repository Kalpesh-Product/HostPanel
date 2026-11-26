// @ts-nocheck
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import UploadMultipleFilesInput from "../../../../components/UploadMultipleFilesInput";
import EnabledSwitch from "../../../../components/ui/EnabledSwitch";
import WebsiteFormField from "../../../../components/WebsiteFormField";
import ItemExtraFields, { OfferingDescription } from "./ItemExtraFields";
import BookableResourceSelect from "./BookableResourceSelect";

// Website-lead bookings get finalized against a real Resource record by
// matching its name — a free-typed Title here that doesn't match any
// Resource silently fails finalization later. Letting the host pick an
// existing Dorm resource keeps the two in sync (same pattern as
// RoomsSection's meeting-room/co-living picker).
const DormsSection = ({ control, register, setValue }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "dorms",
  });

  // Titles drive both the picker's current selection and the duplicate block:
  // a dorm another card already uses is disabled in this card's list.
  const dormItems = useWatch({ control, name: "dorms" }) || [];

  const applyResource = (index, resource) => {
    if (!resource) return;
    setValue?.(`dorms.${index}.title`, resource.name, { shouldDirty: true });
    if (resource.pricePerNight) {
      setValue?.(`dorms.${index}.price`, String(resource.pricePerNight), { shouldDirty: true });
    }
    if (resource.capacity) {
      setValue?.(`dorms.${index}.capacity`, resource.capacity, { shouldDirty: true });
    }
  };

  return (
    <div className="col-span-2">
      <div className="py-4 border-b-default border-borderGray" data-tour="wb-editor-offerings-section">
        <span className="text-subtitle font-pmedium">Dorms</span>
      </div>
      <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-xl border border-borderGray p-4 mb-3">
            <div className="flex items-center justify-between mb-3 gap-3">
              <span className="font-pmedium">Dorm #{index + 1}</span>
              <div className="flex items-center gap-3">
                <EnabledSwitch name={`dorms.${index}.enabled`} control={control} />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-500 hover:text-red-700 text-xs font-semibold transition-all"
                >
                  Remove
                </button>
              </div>
            </div>
            <BookableResourceSelect
              resourceTypes={["Dorm"]}
              queryKeySuffix="dorms"
              ownTitle={dormItems?.[index]?.title || ""}
              otherTitles={dormItems
                .filter((_, itemIndex) => itemIndex !== index)
                .map((item) => item?.title)}
              onSelect={(resource) => applyResource(index, resource)}
              placeholder="Select a resource to autofill name, capacity & price…"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <WebsiteFormField
                label="Title"
                registration={register(`dorms.${index}.title`)}
              />
              <WebsiteFormField
                label="Capacity"
                type="number"
                registration={register(`dorms.${index}.capacity`, { valueAsNumber: true })}
              />
              <WebsiteFormField
                label="Price"
                registration={register(`dorms.${index}.price`)}
              />
              <OfferingDescription control={control} register={register} name={`dorms.${index}.description`} kind="offering" />
            </div>
            <div className="pt-4">
              <Controller
                name={`dorms.${index}.images`}
                control={control}
                render={({ field }) => (
                  <UploadMultipleFilesInput
                    {...field}
                    label="Dorm Images"
                    maxFiles={10}
                    allowedExtensions={["jpg", "jpeg", "png", "webp"]}
                    id={`dorms.${index}.images`}
                  />
                )}
              />
            </div>
            <ItemExtraFields
              control={control}
              register={register}
              name={`dorms.${index}`}
              kind="dorm"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            append({
              title: "",
              description: "",
              capacity: undefined,
              price: "",
              images: [],
            })
          }
          className="text-[#2563EB] text-sm font-semibold hover:underline inline-flex items-center gap-1 transition-all"
        >
          + Add item
        </button>
      </div>
    </div>
  );
};

export default DormsSection;
