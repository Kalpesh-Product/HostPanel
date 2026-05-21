// @ts-nocheck
import { Controller, useFieldArray } from "react-hook-form";
import { TextField } from "@mui/material";
import UploadMultipleFilesInput from "../../../../components/UploadMultipleFilesInput";

const PackagesSection = ({ control, register }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "packages",
  });

  return (
    <div className="col-span-2">
      <div className="py-4 border-b-default border-borderGray">
        <span className="text-subtitle font-pmedium">Packages</span>
      </div>
      <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-xl border border-borderGray p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="font-pmedium">Package #{index + 1}</span>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-sm text-red-600"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                size="small"
                label="Title"
                fullWidth
                {...register(`packages.${index}.title`)}
              />
              <TextField
                size="small"
                label="Price"
                fullWidth
                {...register(`packages.${index}.price`)}
              />
              <TextField
                size="small"
                label="Duration"
                fullWidth
                {...register(`packages.${index}.duration`)}
              />
              <TextField
                size="small"
                label="Description"
                fullWidth
                multiline
                minRows={3}
                {...register(`packages.${index}.description`)}
              />
            </div>
            <div className="pt-4">
              <Controller
                name={`packages.${index}.images`}
                control={control}
                render={({ field }) => (
                  <UploadMultipleFilesInput
                    {...field}
                    label="Package Images"
                    maxFiles={10}
                    allowedExtensions={["jpg", "jpeg", "png", "webp", "pdf"]}
                    id={`packages.${index}.images`}
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
              price: "",
              duration: "",
              images: [],
            })
          }
          className="text-sm text-primary"
        >
          + Add item
        </button>
      </div>
    </div>
  );
};

export default PackagesSection;

