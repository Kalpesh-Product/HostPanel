// @ts-nocheck
import { Controller, useFieldArray } from "react-hook-form";
import { TextField } from "@mui/material";
import UploadFileInput from "../../../../components/UploadFileInput";
import EnabledSwitch from "../../../../components/ui/EnabledSwitch";

const MenuSection = ({ control, register }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "menuItems",
  });

  return (
    <div className="col-span-2">
      <div className="py-4 border-b-default border-borderGray">
        <span className="text-subtitle font-pmedium">Menu</span>
      </div>
      <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-xl border border-borderGray p-4 mb-3">
            <div className="flex items-center justify-between mb-3 gap-3">
              <span className="font-pmedium">Menu Item #{index + 1}</span>
              <div className="flex items-center gap-3">
                <EnabledSwitch name={`menuItems.${index}.enabled`} control={control} />
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
                label="Category"
                fullWidth
                {...register(`menuItems.${index}.category`)}
              />
              <TextField
                size="small"
                label="Name"
                fullWidth
                {...register(`menuItems.${index}.name`)}
              />
              <TextField
                size="small"
                label="Price"
                fullWidth
                {...register(`menuItems.${index}.price`)}
              />
              <TextField
                size="small"
                label="Description"
                fullWidth
                multiline
                minRows={3}
                {...register(`menuItems.${index}.description`)}
              />
            </div>
            <div className="pt-4">
              <Controller
                name={`menuItems.${index}.image`}
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    {field.value?.url ? (
                      <div className="rounded-lg border border-borderGray p-2">
                        <img
                          src={field.value.url}
                          alt={`Menu Item ${index + 1}`}
                          className="h-24 w-24 rounded object-cover"
                        />
                        <button
                          type="button"
                          className="mt-2 text-red-500 hover:text-red-700 text-xs font-semibold transition-all"
                          onClick={() => field.onChange(null)}
                        >
                          Remove current image
                        </button>
                      </div>
                    ) : null}
                    <UploadFileInput
                      id={`menuItems.${index}.image`}
                      value={field.value instanceof File ? field.value : null}
                      label="Menu Image"
                      onChange={field.onChange}
                    />
                  </div>
                )}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            append({
              category: "",
              name: "",
              description: "",
              price: "",
              image: null,
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

export default MenuSection;

