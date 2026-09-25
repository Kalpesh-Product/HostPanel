// @ts-nocheck
import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import WebsiteFormField from "../../../../components/WebsiteFormField";
import { CheckboxField, ChipPicker, ListInput } from "./ItemExtraFields";
import {
  WEEKDAYS,
  defaultOpeningHours,
  defaultReservation,
  defaultStayPolicy,
} from "./templates/offeringFields";

// One-per-line list (house rules can contain commas, so this doesn't split on them).
const LineListInput = ({ field, label, placeholder }) => {
  const joined = Array.isArray(field.value) ? field.value.join("\n") : "";
  const [text, setText] = useState(joined);
  useEffect(() => {
    const parsed = text.split("\n").map((line) => line.trim()).filter(Boolean).join("\n");
    if (parsed !== joined) setText(joined);
  }, [joined]);
  return (
    <WebsiteFormField
      label={label}
      placeholder={placeholder}
      multiline
      minRows={4}
      value={text}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        field.onChange(next.split("\n").map((line) => line.trim()).filter(Boolean));
      }}
    />
  );
};

const PanelShell = ({ title, hint, children }) => (
  <div className="rounded-xl border border-borderGray p-4 mb-3">
    <div className="mb-3">
      <span className="font-pmedium">{title}</span>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
    {children}
  </div>
);

const OpeningHoursEditor = ({ control }) => (
  <Controller
    name="openingHours"
    control={control}
    render={({ field }) => {
      const rows = Array.isArray(field.value) ? field.value : [];
      if (!rows.length) {
        return (
          <button
            type="button"
            onClick={() => field.onChange(defaultOpeningHours())}
            className="text-[#2563EB] text-sm font-semibold hover:underline"
          >
            + Set weekly opening hours
          </button>
        );
      }
      const update = (index, patch) =>
        field.onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
      return (
        <div className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <div
              key={row.day}
              className="grid grid-cols-[110px_1fr_1fr_auto] items-end gap-3"
            >
              <span className="pb-2.5 text-[13px] font-pmedium text-slate-700">
                {WEEKDAYS.find((d) => d.key === row.day)?.label || row.day}
              </span>
              <WebsiteFormField
                label={index === 0 ? "Opens" : undefined}
                type="time"
                disabled={row.closed}
                value={row.open}
                onChange={(event) => update(index, { open: event.target.value })}
              />
              <WebsiteFormField
                label={index === 0 ? "Closes" : undefined}
                type="time"
                disabled={row.closed}
                value={row.close}
                onChange={(event) => update(index, { close: event.target.value })}
              />
              <CheckboxField
                field={{ value: row.closed, onChange: (checked) => update(index, { closed: checked }) }}
                label="Closed"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => field.onChange([])}
            className="w-fit text-xs font-semibold text-red-500 hover:text-red-700"
          >
            Clear hours
          </button>
        </div>
      );
    }}
  />
);

const ReservationEditor = ({ control }) => (
  <Controller
    name="reservation"
    control={control}
    render={({ field }) => {
      const value = { ...defaultReservation(), ...(field.value || {}) };
      const update = (patch) => field.onChange({ ...value, ...patch });
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CheckboxField
            field={{ value: value.enabled, onChange: (checked) => update({ enabled: checked }) }}
            label="Accept table reservations"
          />
          <WebsiteFormField
            label="Max guests per booking"
            type="number"
            min={1}
            value={value.maxGuests}
            onChange={(event) => update({ maxGuests: Number(event.target.value) || 1 })}
          />
          <WebsiteFormField
            select
            label="Time slot interval"
            value={String(value.slotIntervalMinutes)}
            onChange={(event) => update({ slotIntervalMinutes: Number(event.target.value) })}
          >
            {[15, 30, 45, 60].map((minutes) => (
              <option key={minutes} value={minutes}>
                Every {minutes} minutes
              </option>
            ))}
          </WebsiteFormField>
          <ChipPicker
            field={{
              value: value.seatingOptions,
              onChange: (list) => update({ seatingOptions: list }),
            }}
            label="Seating options"
            suggestions={["Indoor", "Outdoor", "Bar", "Window", "Rooftop", "Private"]}
          />
          <div className="md:col-span-2">
            <WebsiteFormField
              label="Confirmation note"
              placeholder="We'll call you to confirm your table."
              value={value.confirmationNote}
              onChange={(event) => update({ confirmationNote: event.target.value })}
            />
          </div>
        </div>
      );
    }}
  />
);

const StayPolicyEditor = ({ control, showMinNights = true }) => (
  <Controller
    name="stayPolicy"
    control={control}
    render={({ field }) => {
      const value = { ...defaultStayPolicy(), ...(field.value || {}) };
      const update = (patch) => field.onChange({ ...value, ...patch });
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <WebsiteFormField
            label="Check-in time"
            type="time"
            value={value.checkInTime}
            onChange={(event) => update({ checkInTime: event.target.value })}
          />
          <WebsiteFormField
            label="Check-out time"
            type="time"
            value={value.checkOutTime}
            onChange={(event) => update({ checkOutTime: event.target.value })}
          />
          {showMinNights ? (
            <WebsiteFormField
              label="Minimum stay (nights)"
              type="number"
              min={1}
              value={value.minStayNights ?? ""}
              onChange={(event) =>
                update({
                  minStayNights: event.target.value === "" ? undefined : Number(event.target.value),
                })
              }
            />
          ) : null}
          <div className="md:col-span-2">
            <LineListInput
              field={{ value: value.houseRules, onChange: (list) => update({ houseRules: list }) }}
              label="House rules (one per line)"
              placeholder={"No smoking inside\nQuiet hours after 10 PM"}
            />
          </div>
          <div className="md:col-span-2">
            <WebsiteFormField
              label="Cancellation note"
              placeholder="Free cancellation up to 48 hours before check-in."
              value={value.cancellationNote}
              onChange={(event) => update({ cancellationNote: event.target.value })}
            />
          </div>
        </div>
      );
    }}
  />
);

const TourBookingEditor = ({ control }) => (
  <Controller
    name="tourBooking"
    control={control}
    render={({ field }) => (
      <CheckboxField
        field={{
          value: field.value?.enabled !== false,
          onChange: (checked) => field.onChange({ enabled: checked }),
        }}
        label={'Show a "Schedule a visit" form'}
      />
    )}
  />
);

// Business-level settings that go with a service type. `kind` is the service:
// cafe | hostel | coLiving | coWorking | workation | meeting. Rendered after that service's items.
const ServiceSettingsPanel = ({ control, kind }) => {
  if (kind === "cafe") {
    return (
      <div className="col-span-2 px-4 pb-4">
        <PanelShell
          title="Opening hours"
          hint="Shown on the site and used to offer reservation time slots."
        >
          <OpeningHoursEditor control={control} />
        </PanelShell>
        <PanelShell title="Table reservations" hint="Reservations arrive as leads.">
          <ReservationEditor control={control} />
        </PanelShell>
      </div>
    );
  }
  if (kind === "hostel") {
    return (
      <div className="col-span-2 px-4 pb-4">
        <PanelShell title="Stay policy" hint="Shown on room pages and the booking form.">
          <StayPolicyEditor control={control} />
        </PanelShell>
      </div>
    );
  }
  if (kind === "coLiving") {
    return (
      <div className="col-span-2 px-4 pb-4">
        <PanelShell title="Visits & policy">
          <div className="mb-4">
            <TourBookingEditor control={control} />
          </div>
          <StayPolicyEditor control={control} showMinNights={false} />
        </PanelShell>
      </div>
    );
  }
  if (kind === "coWorking") {
    return (
      <div className="col-span-2 px-4 pb-4">
        <PanelShell title="Visits" hint="Visit requests arrive as leads.">
          <TourBookingEditor control={control} />
        </PanelShell>
        <PanelShell
          title="Opening hours"
          hint="Shown on the site and used to offer visit time slots."
        >
          <OpeningHoursEditor control={control} />
        </PanelShell>
      </div>
    );
  }
  return null;
};

export default ServiceSettingsPanel;
