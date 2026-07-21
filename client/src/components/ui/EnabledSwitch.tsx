import { Controller } from "react-hook-form";

// Small "Show on website" switch used next to list items (products, rooms, FAQs,
// team members, gallery images, etc). Every item is enabled by default (unset ===
// enabled); toggling off hides it from the live site without deleting it.
interface EnabledSwitchProps {
  name: string;
  control: any;
}

const EnabledSwitch = ({ name, control }: EnabledSwitchProps) => (
  <Controller
    name={name}
    control={control}
    defaultValue={true}
    render={({ field }) => (
      <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-slate-500">
        <span>{field.value !== false ? "Enabled" : "Disabled"}</span>
        <span
          role="switch"
          aria-checked={field.value !== false}
          onClick={() => field.onChange(field.value === false)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
            field.value !== false ? "bg-accent" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              field.value !== false ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </span>
      </label>
    )}
  />
);

export default EnabledSwitch;
