// @ts-nocheck
import { Controller, useFieldArray } from "react-hook-form";
import { TextField } from "@mui/material";
import UploadMultipleFilesInput from "../../../../components/UploadMultipleFilesInput";
import EnabledSwitch from "../../../../components/ui/EnabledSwitch";

const DormsSection = ({ control, register }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "dorms",
  });

  return (
    <div className="col-span-2">
      <div className="py-4 border-b-default border-borderGray">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                size="small"
                label="Title"
                fullWidth
                {...register(`dorms.${index}.title`)}
              />
              <TextField
                size="small"
                label="Capacity"
                type="number"
                fullWidth
                {...register(`dorms.${index}.capacity`, { valueAsNumber: true })}
              />
              <TextField
                size="small"
                label="Price"
                fullWidth
                {...register(`dorms.${index}.price`)}
              />
              <TextField
                size="small"
                label="Description"
                fullWidth
                multiline
                minRows={3}
                {...register(`dorms.${index}.description`)}
              />
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
                    allowedExtensions={["jpg", "jpeg", "png", "webp", "pdf"]}
                    id={`dorms.${index}.images`}
                  />
                )}
              />
            </div>
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

