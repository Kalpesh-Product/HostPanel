// @ts-nocheck
import { useFieldArray } from "react-hook-form";
import { TextField } from "@mui/material";

const AmenitiesSection = ({ control, register }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "amenities",
  });

  return (
    <div className="col-span-2">
      <div className="py-4 border-b-default border-borderGray">
        <span className="text-subtitle font-pmedium">Amenities</span>
      </div>
      <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-xl border border-borderGray p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="font-pmedium">Amenity #{index + 1}</span>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-red-500 hover:text-red-700 text-xs font-semibold transition-all"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                size="small"
                label="Title"
                fullWidth
                {...register(`amenities.${index}.title`)}
              />
              <TextField
                size="small"
                label="Icon"
                fullWidth
                {...register(`amenities.${index}.icon`)}
              />
              <TextField
                size="small"
                label="Description"
                fullWidth
                {...register(`amenities.${index}.description`)}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ title: "", description: "", icon: "" })}
          className="text-[#2563EB] text-sm font-semibold hover:underline inline-flex items-center gap-1 transition-all"
        >
          + Add item
        </button>
      </div>
    </div>
  );
};

export default AmenitiesSection;

