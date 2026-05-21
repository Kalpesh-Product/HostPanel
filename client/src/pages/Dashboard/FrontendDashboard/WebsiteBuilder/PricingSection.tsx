// @ts-nocheck
import { useFieldArray } from "react-hook-form";
import { TextField } from "@mui/material";

const PricingFeatures = ({ control, register, parentIndex }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `pricing.${parentIndex}.features`,
  });

  return (
    <div className="pt-3">
      <span className="text-sm font-pmedium">Features</span>
      <div className="grid grid-cols-1 gap-2 mt-2">
        {fields.map((featureField, featureIndex) => (
          <div key={featureField.id} className="flex items-center gap-2">
            <TextField
              size="small"
              fullWidth
              label={`Feature #${featureIndex + 1}`}
              {...register(`pricing.${parentIndex}.features.${featureIndex}`)}
            />
            <button
              type="button"
              onClick={() => remove(featureIndex)}
              className="text-sm text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append("")}
          className="text-sm text-primary text-left"
        >
          + Add feature
        </button>
      </div>
    </div>
  );
};

const PricingSection = ({ control, register }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "pricing",
  });

  return (
    <div className="col-span-2">
      <div className="py-4 border-b-default border-borderGray">
        <span className="text-subtitle font-pmedium">Pricing</span>
      </div>
      <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-xl border border-borderGray p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="font-pmedium">Pricing #{index + 1}</span>
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
                {...register(`pricing.${index}.title`)}
              />
              <TextField
                size="small"
                label="Price"
                fullWidth
                {...register(`pricing.${index}.price`)}
              />
              <TextField
                size="small"
                label="Duration"
                fullWidth
                {...register(`pricing.${index}.duration`)}
              />
            </div>
            <PricingFeatures
              control={control}
              register={register}
              parentIndex={index}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ title: "", price: "", duration: "", features: [] })}
          className="text-sm text-primary"
        >
          + Add item
        </button>
      </div>
    </div>
  );
};

export default PricingSection;

