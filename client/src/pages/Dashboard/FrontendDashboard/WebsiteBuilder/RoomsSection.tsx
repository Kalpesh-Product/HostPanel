// @ts-nocheck
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import UploadMultipleFilesInput from "../../../../components/UploadMultipleFilesInput";
import EnabledSwitch from "../../../../components/ui/EnabledSwitch";
import WebsiteFormField from "../../../../components/WebsiteFormField";
import ItemExtraFields, { OfferingDescription } from "./ItemExtraFields";
import BookableResourceSelect from "./BookableResourceSelect";

const KIND_BY_FIELD = { meetingRooms: "meeting", coLivingRooms: "coLiving" };

// Website-lead bookings get finalized against a real Resource record by
// matching its name — a free-typed Title here that doesn't match any
// Resource silently fails finalization later. Letting the host pick an
// existing resource keeps the two in sync. Meeting rooms book hourly
// (pricePerHour); co-living books nightly (pricePerNight).
//
// `rooms` is the co-living/meeting-rooms section array rendered by the
// vertical editor (see VERTICAL_CONFIG) — without it the co-living page had no
// picker at all, because that editor renders this component with no fieldName.
const BOOKABLE_RESOURCE_TYPES_BY_FIELD = {
  rooms: { types: ["Room"], priceField: "pricePerNight" },
  meetingRooms: { types: ["Meeting Room", "Conference Room"], priceField: "pricePerHour" },
  coLivingRooms: { types: ["Room"], priceField: "pricePerNight" },
};

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

  const bookableConfig = BOOKABLE_RESOURCE_TYPES_BY_FIELD[fieldName];
  // Titles drive both the picker's current selection and the duplicate block:
  // a resource another card already uses is disabled in this card's list.
  const sectionItems = useWatch({ control, name: fieldName }) || [];

  const applyResource = (index, resource) => {
    if (!resource) return;
    setValue?.(`${fieldName}.${index}.title`, resource.name, { shouldDirty: true });
    const price = resource[bookableConfig.priceField];
    if (price) {
      setValue?.(`${fieldName}.${index}.price`, String(price), { shouldDirty: true });
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
            {bookableConfig && (
              <BookableResourceSelect
                resourceTypes={bookableConfig.types}
                queryKeySuffix={fieldName}
                ownTitle={sectionItems?.[index]?.title || ""}
                otherTitles={sectionItems
                  .filter((_, itemIndex) => itemIndex !== index)
                  .map((item) => item?.title)}
                onSelect={(resource) => applyResource(index, resource)}
                placeholder="Select a resource to autofill name & price…"
              />
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
