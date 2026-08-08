// @ts-nocheck
import { useRef, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { Country, State, City } from "country-state-city";
import {
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  OutlinedInput,
  Select,
  Checkbox,
  ListItemText,
} from "@mui/material";
import PageFrame from "../../../components/Pages/PageFrame";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import publicAxios from "axios";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import UploadMultipleFilesInput from "../../../components/UploadMultipleFilesInput";
import useAuth from "../../../hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useNomadListingCapacity, {
  normalizeNomadListingType,
} from "../../../hooks/useNomadListingCapacity";

// Company types
const companyTypes = [
  "Coworking",
  "Meeting Room",
  "Cafe",
  // "Private Stay",
  "Workation",
  "Coliving",
  "Hostel",
];

// Fixed amenities per company type — mirrors Nomads' own public site
// (frontend/src/components/AmenitiesList.jsx). Kept as a local constant
// (like companyTypes above) instead of fetched, so it always works
// regardless of whether the Nomads backend serving this environment has
// been redeployed with the newer /api/company/amenities endpoint.
const AMENITIES_BY_TYPE = {
  coworking: [
    "Private Desk", "Private Storage", "Air Conditioning", "High Speed Wi-Fi", "Wi-Fi",
    "IT Support", "Tea & Coffee", "Reception Support", "Admin Support", "Housekeeping",
    "Community", "Maintenance", "Power Backup", "Meeting Room", "Cafeteria",
    "Printing Services", "CCTV Secure", "Purified Water", "Custom Solutions",
  ],
  coliving: [
    "Shared Space", "Private Space", "Private Storage", "Air Conditioning", "Wi-Fi",
    "High Speed Wi-Fi", "IT Support", "Tea & Coffee", "Reception Support", "Admin Support",
    "Housekeeping", "Community", "Maintenance", "Power Backup", "Cafeteria",
    "Printing Services", "Laundry Facilities", "CCTV Secure", "Swimming Pool",
  ],
  workation: [
    "Shared Space", "Private Space", "Private Storage", "Air Conditioning", "Wi-Fi",
    "High Speed Wi-Fi", "IT Support", "Tea & Coffee", "Reception Support", "Admin Support",
    "Housekeeping", "Community", "Maintenance", "Power Backup", "Cafeteria",
    "Printing Services", "Laundry Facilities", "CCTV Secure", "Swimming Pool",
  ],
  privatestay: [
    "Private Space", "Private Storage", "Television", "Air Conditioning", "Wi-Fi",
    "High Speed Wi-Fi", "IT Support", "Tea & Coffee", "Reception Support", "Admin Support",
    "Housekeeping", "Community", "Maintenance", "Power Backup", "Cafeteria",
    "Printing Services", "Washing Machine", "CCTV Secure", "Swimming Pool",
  ],
  hostel: [
    "Shared Space", "Private Space", "Private Storage", "Air Conditioning", "Wi-Fi",
    "High Speed Wi-Fi", "IT Support", "Tea & Coffee", "Reception Support", "Admin Support",
    "Housekeeping", "Community", "Maintenance", "Power Backup", "Cafeteria",
    "Printing Services", "Laundry Facilities", "CCTV Secure", "Swimming Pool",
  ],
  cafe: [
    "Private Desk", "Private Storage", "Air Conditioning", "High Speed Wi-Fi", "Wi-Fi",
    "IT Support", "Tea & Coffee", "Reception Support", "Admin Support", "Housekeeping",
    "Community", "Maintenance", "Power Backup", "Visitor allowed", "Cafeteria",
    "Printing Services", "CCTV Secure", "Water Purifier", "Custom Solutions",
  ],
  meetingroom: [
    "Private Meeting Room", "Smart Television", "Air Conditioning", "High Speed Wi-Fi", "Wi-Fi",
    "IT Support", "Tea & Coffee", "Reception Support", "Admin Support", "Housekeeping",
    "Community", "Maintenance", "Power Backup", "Visitor allowed", "Cafeteria",
    "Printing Services", "CCTV Secure", "Water Purifier", "Custom Solutions",
  ],
};

const MULTI_SELECT_MENU_PROPS = {
  PaperProps: {
    sx: {
      mt: 0.5,
      maxHeight: 320,
      border: "1px solid #e2e8f0",
      borderRadius: "10px",
      boxShadow: "0 12px 28px rgba(15, 23, 42, 0.14)",
      "& .MuiMenu-list": {
        padding: "6px",
      },
      "& .MuiMenuItem-root": {
        minHeight: 38,
        marginBottom: "2px",
        borderRadius: "8px",
        fontSize: "0.875rem",
        whiteSpace: "normal",
        overflowWrap: "anywhere",
        "&:last-of-type": {
          marginBottom: 0,
        },
        "&.Mui-selected": {
          backgroundColor: "#eff6ff",
        },
        "&.Mui-selected:hover": {
          backgroundColor: "#dbeafe",
        },
      },
    },
  },
};
const getMultiSelectMenuProps = (anchorRef) => ({
  ...MULTI_SELECT_MENU_PROPS,
  PaperProps: {
    ...MULTI_SELECT_MENU_PROPS.PaperProps,
    ref: (paperElement) => {
      const anchorWidth = anchorRef.current?.getBoundingClientRect().width;
      if (!paperElement || !anchorWidth) return;
      const exactWidth = `${anchorWidth}px`;
      paperElement.style.width = exactWidth;
      paperElement.style.minWidth = exactWidth;
      paperElement.style.maxWidth = exactWidth;
    },
  },
});
// Best-effort extraction of coordinates from a pasted Google Maps URL.
// Handles the common "@lat,lng", "q=lat,lng", "ll=lat,lng" and embed
// "!3dlat!4dlng" formats. Short goo.gl links don't carry coordinates in
// the URL itself (they redirect), so those can't be auto-filled this way.
const extractLatLngFromMapUrl = (url) => {
  const v = String(url || "");
  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  ];
  for (const pattern of patterns) {
    const m = v.match(pattern);
    if (m) return { lat: m[1], lng: m[2] };
  }
  return null;
};

// ✅ Default review structure
const defaultReview = {
  name: "",
  review: "",
  rating: 5,
};

const NomadListing = () => {
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const inclusionsSelectRef = useRef(null);
  // Removed: services/units selectors no longer needed
  // const servicesSelectRef = useRef(null);
  // const unitsSelectRef = useRef(null);
  const submitLockRef = useRef(false);

  const { auth } = useAuth(); // <-- get auth info
  const companyId = auth?.user?.companyId || ""; // <-- safe fallback
  const listingCompanyId = auth?.user?.effectiveNomadsCompanyId || companyId;
  const companyName = auth?.user?.companyName || "";
  // Fallback preview when no per-listing logo is uploaded — the listing
  // then just uses this, the host's own company profile logo.
  const profileLogoUrl =
    (typeof auth?.user?.logo === "object" ? auth?.user?.logo?.url : auth?.user?.logo) || "";

  // Removed: Services/Units field options no longer needed
  // const { data: serviceOptions = [] } = useQuery({
  //   queryKey: ["nomad-field-options", "services"],
  //   queryFn: async () => {
  //     const res = await publicAxios.get("https://wono.co/api/company/field-options", {
  //       params: { field: "services" },
  //     });
  //     return Array.isArray(res.data) ? res.data : [];
  //   },
  // });
  // const { data: unitOptions = [] } = useQuery({
  //   queryKey: ["nomad-field-options", "units"],
  //   queryFn: async () => {
  //     const res = await publicAxios.get("https://wono.co/api/company/field-options", {
  //       params: { field: "units" },
  //     });
  //     return Array.isArray(res.data) ? res.data : [];
  //   },
  // });

  const {
    limit,
    used,
    remaining,
    isAtLimit,
    addedTypes,
    limitMessage,
    typeLimit,
    usedTypes,
    remainingTypes,
    canAddNewType,
    typeLimitMessage,
    refetchListings,
  } = useNomadListingCapacity(listingCompanyId);

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    defaultValues: {
      // businessId: `BIZ_${Date.now()}`,
      companyId: companyId, // set default so RHF knows
      companyType: "",
      companyTitle: "",
      website: "",
      ratings: "",
      totalReviews: "",
      // totalSeats: "",
      latitude: "",
      longitude: "",
      country: "",
      state: "",
      city: "",
      inclusions: [],
      // services: [],
      // units: [],
      about: "",
      address: "",
      images: [],
      logo: [],
      reviews: [defaultReview], // ✅ initialize with one review
      googleMap: "",
    },
  });

  // Removed: "Add new" boxes beside the Services/Units dropdowns no longer needed
  // const [newServiceText, setNewServiceText] = useState("");
  // const [newUnitText, setNewUnitText] = useState("");
  // const handleAddService = () => {
  //   const trimmed = newServiceText.trim();
  //   if (!trimmed) return;
  //   const current = getValues("services") || [];
  //   if (!current.includes(trimmed)) setValue("services", [...current, trimmed]);
  //   setNewServiceText("");
  // };
  // const handleAddUnit = () => {
  //   const trimmed = newUnitText.trim();
  //   if (!trimmed) return;
  //   const current = getValues("units") || [];
  //   if (!current.includes(trimmed)) setValue("units", [...current, trimmed]);
  //   setNewUnitText("");
  // };

  // ✅ Field Array for reviews
  const {
    fields: reviewFields,
    append: appendReview,
    remove: removeReview,
  } = useFieldArray({ control, name: "reviews" });

  const selectedCompanyType = watch("companyType");
  const selectedTypeIsAlreadyAdded = addedTypes.has(
    normalizeNomadListingType(selectedCompanyType),
  );
  const projectedUsed =
    selectedCompanyType && !selectedTypeIsAlreadyAdded ? used + 1 : used;
  const projectedRemaining =
    limit === null ? null : Math.max(limit - projectedUsed, 0);

  const { mutate: createCompany, isPending: isCreating } = useMutation({
    mutationFn: async (fd) => {
      const res = await axios.post("/api/listings/add-company-listing", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Company added successfully!");
      reset();
      void refetchListings();
      navigate("/company-settings/nomad-listings");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to add company");
    },
    onSettled: () => {
      submitLockRef.current = false;
    },
  });

  const onSubmit = (values) => {
    if (submitLockRef.current || isCreating) return;
    if (isAtLimit) {
      toast.error(limitMessage, { position: "bottom-right" });
      return;
    }
    const isBrandNewType = !addedTypes.has(normalizeNomadListingType(values.companyType));
    if (isBrandNewType && !canAddNewType) {
      toast.error(typeLimitMessage, { position: "bottom-right" });
      return;
    }

    submitLockRef.current = true;
    const formEl = formRef.current;
    const fd = new FormData(formEl);

    fd.set("companyId", companyId); // <-- always send from token
    fd.set("companyName", companyName); // ← SEND THIS
    // fd.set("businessId", values.businessId);
    fd.set("companyType", values.companyType);
    fd.set("companyTitle", values.companyTitle);
    fd.set("website", values.website);
    fd.set("ratings", values.ratings);
    fd.set("totalReviews", values.totalReviews);
    // fd.set("totalSeats", values.totalSeats);
    fd.set("latitude", values.latitude);
    fd.set("longitude", values.longitude);
    fd.set("about", values.about);
    // Falls back to "city, state, country" when left blank.
    fd.set(
      "address",
      values.address?.trim() ||
        [values.city, values.state, values.country].filter(Boolean).join(", "),
    );
    fd.set("googleMap", values.googleMap);
    fd.set("country", values.country);
    fd.set("state", values.state);
    fd.set("city", values.city);

    // ✅ inclusions as comma-separated string (services/units removed)
    const toCommaString = (arr) => (Array.isArray(arr) ? arr : []).join(", ");
    fd.set("inclusions", toCommaString(values.inclusions));
    // fd.set("services", toCommaString(values.services));
    // fd.set("units", toCommaString(values.units));

    // ✅ reviews JSON
    fd.set("reviews", JSON.stringify(values.reviews || []));
    for (const key of Array.from(fd.keys())) {
      if (/^reviews\.\d+\./.test(key)) fd.delete(key);
    }

    fd.delete("images");
    if (values.images?.length) {
      values.images.forEach((file) => fd.append("images", file));
    }

    // Optional per-listing logo — falls back to the company profile logo
    // server-side when nothing is uploaded here.
    fd.delete("logo");
    if (values.logo?.[0] instanceof File) {
      fd.append("logo", values.logo[0]);
    }

    createCompany(fd);
  };

  const handleReset = () => {
    const node = formRef.current;
    node && node.reset();
    reset();
  };

  const resetFormToEmpty = () => {
    formRef.current?.reset(); // clears native inputs
    reset({
      companyType: "",
      companyTitle: "",
      ratings: "",
      totalReviews: "",
      // totalSeats: "",
      latitude: "",
      longitude: "",
      country: "",
      state: "",
      city: "",
      inclusions: [],
      // services: [],
      // units: [],
      about: "",
      address: "",
      images: [],
      logo: [],
      reviews: [defaultReview],
      googleMap: "",
    });
  };

  return (
    <div className="p-4">
      <PageFrame>
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5 mb-4">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
              Add Product
            </h2>
            <p className="text-xs font-pmedium text-slate-500 mt-1">
              Create a new listing for your co-working or co-living space on Wono Nomads.
            </p>
          </div>
        </div>
        <form
          ref={formRef}
          encType="multipart/form-data"
          onSubmit={handleSubmit(onSubmit)}
          className="md:grid grid-cols-2 gap-4"
        >
          <div className="mb-4 md:mb-0">
            {/* Company Title */}
            <Controller
              name="companyTitle"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label="Company Title"
                  helperText="Defaults to your company name if left blank"
                  fullWidth
                />
              )}
            />
          </div>
          <div className="mb-4 md:mb-0">
            {/* Website URL */}
            <Controller
              name="website"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label="Website URL"
                  helperText="Defaults to your company's registered website if left blank"
                  fullWidth
                />
              )}
            />
          </div>
          <div className="mb-4 md:mb-0">
            {/* Company Type */}
            <Controller
              name="companyType"
              control={control}
              rules={{ required: "Company Type is required" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  size="small"
                  label="Company Type"
                  fullWidth
                  error={!!errors.companyType}
                  onChange={(e) => {
                    field.onChange(e);
                    // Inclusions are fixed per company type — drop any
                    // selected ones that don't apply to the new type.
                    const allowed = new Set(AMENITIES_BY_TYPE[e.target.value] || []);
                    const current = getValues("inclusions") || [];
                    setValue("inclusions", current.filter((v) => allowed.has(v)));
                  }}
                >
                  {companyTypes.map((type) => {
                    const normalizedType = normalizeNomadListingType(type);
                    const isBrandNewType = !addedTypes.has(normalizedType);
                    const disabledForTypeLimit = isBrandNewType && !canAddNewType;
                    return (
                      <MenuItem
                        key={type}
                        value={type.toLowerCase().replace(/\s+/g, "")}
                        disabled={disabledForTypeLimit}
                        className="font-pmedium"
                      >
                        <span className="flex w-full items-center justify-between gap-4 font-pmedium">
                          <span>{type}</span>
                          {!isBrandNewType && (
                            <span className="text-[10px] font-pmedium uppercase tracking-wide text-emerald-600">
                              Added
                            </span>
                          )}
                          {disabledForTypeLimit && (
                            <span className="text-[10px] font-pmedium uppercase tracking-wide text-rose-600">
                              Type limit reached
                            </span>
                          )}
                        </span>
                      </MenuItem>
                    );
                  })}
                </TextField>
              )}
            />
            <p className={`mt-1.5 text-[11px] font-pmedium ${isAtLimit ? "text-rose-600" : "text-slate-500"}`}>
              {limit === null
                ? `${used} listings added · Unlimited plan`
                : selectedCompanyType && !selectedTypeIsAlreadyAdded
                  ? `${Math.min(projectedUsed, limit)}/${limit} listings selected. ${
                      projectedRemaining > 0
                        ? `You can add ${projectedRemaining} more.`
                        : "This uses your final listing slot."
                    }`
                  : `${used}/${limit} listings added. ${
                      remaining > 0
                        ? `You can add ${remaining} more.`
                        : "Delete one to add another."
                    }`}
            </p>
            {typeLimit !== null && (
              <p className="mt-1 text-[11px] font-pmedium text-slate-500">
                {usedTypes}/{typeLimit} product types used
                {remainingTypes > 0
                  ? ` · ${remainingTypes} new type${remainingTypes === 1 ? "" : "s"} available`
                  : " · add more locations under an existing type, or upgrade to unlock another type"}
              </p>
            )}
          </div>
          <div className="mb-4 md:mb-0">
            {/* Inclusions — fixed list per company type, curated on Nomads;
                hosts can pick from it but not add new ones. */}
            <Controller
              name="inclusions"
              control={control}
              render={({ field }) => {
                const options = AMENITIES_BY_TYPE[selectedCompanyType] || [];
                return (
                  <FormControl size="small" fullWidth disabled={!selectedCompanyType} ref={inclusionsSelectRef}>
                    <InputLabel>Inclusions</InputLabel>
                    <Select
                      {...field}
                      multiple
                      value={
                        Array.isArray(field.value)
                          ? field.value
                          : field.value
                          ? [field.value]
                          : []
                      }
                      input={<OutlinedInput label="Inclusions" />}
                      MenuProps={getMultiSelectMenuProps(inclusionsSelectRef)}
                      renderValue={(selected) =>
                        Array.isArray(selected) ? selected.join(", ") : ""
                      }
                    >
                      {options.map((option) => (
                        <MenuItem key={option} value={option}>
                          <Checkbox
                            checked={
                              Array.isArray(field.value) &&
                              field.value.includes(option)
                            }
                          />
                          <ListItemText primary={option} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              }}
            />
            {!selectedCompanyType && (
              <p className="mt-1.5 text-[11px] font-pmedium text-slate-500">
                Select a Company Type first to see its available inclusions.
              </p>
            )}
          </div>
          {/* ===== Services / Units / Total Seats (removed — not needed) =====
          <div className="mb-4 md:mb-0">
            Services — pick from what other hosts have already used, or
            type a new one below and click Add.
            <Controller
              name="services"
              control={control}
              render={({ field }) => {
                const options = Array.from(
                  new Set([...(serviceOptions || []), ...(field.value || [])]),
                ).sort((a, b) => a.localeCompare(b));
                return (
                  <FormControl size="small" fullWidth ref={servicesSelectRef}>
                    <InputLabel>Services</InputLabel>
                    <Select
                      {...field}
                      multiple
                      value={field.value || []}
                      input={<OutlinedInput label="Services" />}
                      MenuProps={getMultiSelectMenuProps(servicesSelectRef)}
                      renderValue={(selected) =>
                        Array.isArray(selected) ? selected.join(", ") : ""
                      }
                    >
                      {options.map((option) => (
                        <MenuItem key={option} value={option}>
                          <Checkbox checked={field.value?.includes(option)} />
                          <ListItemText primary={option} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              }}
            />
            <div className="mt-1.5 flex items-center gap-2">
              <TextField
                size="small"
                fullWidth
                placeholder="Type a new service, then click Add"
                value={newServiceText}
                onChange={(e) => setNewServiceText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddService();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddService}
                className="shrink-0 px-3 py-2 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg text-[11px] font-pmedium uppercase tracking-wide"
              >
                Add
              </button>
            </div>
          </div>
          <div className="mb-4 md:mb-0">
            Units — same dropdown + add-new pattern as Services.
            <Controller
              name="units"
              control={control}
              render={({ field }) => {
                const options = Array.from(
                  new Set([...(unitOptions || []), ...(field.value || [])]),
                ).sort((a, b) => a.localeCompare(b));
                return (
                  <FormControl size="small" fullWidth ref={unitsSelectRef}>
                    <InputLabel>Units</InputLabel>
                    <Select
                      {...field}
                      multiple
                      value={field.value || []}
                      input={<OutlinedInput label="Units" />}
                      MenuProps={getMultiSelectMenuProps(unitsSelectRef)}
                      renderValue={(selected) =>
                        Array.isArray(selected) ? selected.join(", ") : ""
                      }
                    >
                      {options.map((option) => (
                        <MenuItem key={option} value={option}>
                          <Checkbox checked={field.value?.includes(option)} />
                          <ListItemText primary={option} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              }}
            />
            <div className="mt-1.5 flex items-center gap-2">
              <TextField
                size="small"
                fullWidth
                placeholder="Type a new unit, then click Add"
                value={newUnitText}
                onChange={(e) => setNewUnitText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddUnit();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddUnit}
                className="shrink-0 px-3 py-2 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg text-[11px] font-pmedium uppercase tracking-wide"
              >
                Add
              </button>
            </div>
          </div>
          <div className="mb-4 md:mb-0">
            Total Seats
            <Controller
              name="totalSeats"
              control={control}
              rules={{
                min: { value: 0, message: "Total seats cannot be negative" },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label="Total Seats"
                  type="number"
                  inputProps={{ min: 0, step: 1 }}
                  error={!!errors.totalSeats}
                  helperText={errors?.totalSeats?.message}
                  fullWidth
                />
              )}
            />
          </div>
          */}
          <div className="mb-4 md:mb-0">
            {/* Address */}
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label="Address"
                  multiline
                  minRows={3}
                  fullWidth
                />
              )}
            />
          </div>
          <div className="mb-4 md:mb-0">
            {/* About */}
            <Controller
              name="about"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label="About"
                  multiline
                  minRows={3}
                  fullWidth
                />
              )}
            />
          </div>
          <div className="mb-4 md:mb-0">
            {/* Ratings */}
            <Controller
              name="ratings"
              control={control}
              rules={{
                min: { value: 1, message: "Rating must be between 1 and 5" },
                max: { value: 5, message: "Rating must be between 1 and 5" },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label="Ratings"
                  type="number"
                  inputProps={{ min: 1, max: 5, step: 0.1 }}
                  error={!!errors.ratings}
                  helperText={errors?.ratings?.message}
                  fullWidth
                />
              )}
            />
          </div>
          <div className="mb-4 md:mb-0">
            {/* Total Reviews */}
            <Controller
              name="totalReviews"
              control={control}
              rules={{
                min: { value: 0, message: "Total reviews cannot be negative" },
                max: { value: 500000, message: "Total reviews cannot exceed 500,000" },
                validate: (value) =>
                  value === "" ||
                  Number.isInteger(Number(value)) ||
                  "Total reviews must be a whole number",
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label="Total Reviews"
                  type="number"
                  inputProps={{ min: 0, max: 500000, step: 1 }}
                  error={!!errors.totalReviews}
                  helperText={errors?.totalReviews?.message}
                  fullWidth
                />
              )}
            />
          </div>
          <div className="mb-4 md:mb-0">
            {/* Country — each listing has its own location, independent of
                the host's registered company address. */}
            <Controller
              name="country"
              control={control}
              rules={{ required: "Country is required" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  size="small"
                  label="Country"
                  fullWidth
                  error={!!errors.country}
                  helperText={errors?.country?.message}
                  onChange={(e) => {
                    field.onChange(e);
                    setValue("state", "");
                    setValue("city", "");
                  }}
                >
                  {Country.getAllCountries().map((c) => (
                    <MenuItem key={c.isoCode} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </div>
          <div className="mb-4 md:mb-0">
            {/* State */}
            <Controller
              name="state"
              control={control}
              rules={{ required: "State is required" }}
              render={({ field }) => {
                const countryName = watch("country");
                const countryObj = Country.getAllCountries().find(
                  (c) => c.name === countryName,
                );
                const states = countryObj
                  ? State.getStatesOfCountry(countryObj.isoCode)
                  : [];
                return (
                  <TextField
                    {...field}
                    select
                    size="small"
                    label="State"
                    fullWidth
                    disabled={!countryObj}
                    error={!!errors.state}
                    helperText={errors?.state?.message}
                    onChange={(e) => {
                      field.onChange(e);
                      setValue("city", "");
                    }}
                  >
                    {states.map((s) => (
                      <MenuItem key={s.isoCode} value={s.name}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </TextField>
                );
              }}
            />
          </div>
          <div className="mb-4 md:mb-0">
            {/* City */}
            <Controller
              name="city"
              control={control}
              rules={{ required: "City is required" }}
              render={({ field }) => {
                const countryName = watch("country");
                const stateName = watch("state");
                const countryObj = Country.getAllCountries().find(
                  (c) => c.name === countryName,
                );
                const stateObj =
                  countryObj &&
                  State.getStatesOfCountry(countryObj.isoCode).find(
                    (s) => s.name === stateName,
                  );
                const cities =
                  countryObj && stateObj
                    ? City.getCitiesOfState(countryObj.isoCode, stateObj.isoCode)
                    : [];
                return (
                  <TextField
                    {...field}
                    select
                    size="small"
                    label="City"
                    fullWidth
                    disabled={!stateObj}
                    error={!!errors.city}
                    helperText={errors?.city?.message}
                  >
                    {cities.map((c) => (
                      <MenuItem key={c.name} value={c.name}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </TextField>
                );
              }}
            />
          </div>
          <div className="mb-4 md:mb-0">
            {/* Images */}
            <Controller
              name="images"
              control={control}
              render={({ field }) => (
                <UploadMultipleFilesInput
                  {...field}
                  label="Product Images"
                  maxFiles={10}
                  allowedExtensions={["jpg", "jpeg", "png", "webp"]}
                  id="images"
                />
              )}
            />
          </div>
          <div className="mb-4 md:mb-0">
            {/* Logo — optional; falls back to your company profile logo */}
            <Controller
              name="logo"
              control={control}
              render={({ field }) => (
                <UploadMultipleFilesInput
                  {...field}
                  label="Company Logo (optional)"
                  maxFiles={1}
                  allowedExtensions={["jpg", "jpeg", "png", "webp"]}
                  id="logo"
                />
              )}
            />
            {!watch("logo")?.length && profileLogoUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={profileLogoUrl}
                  alt="Company logo"
                  className="h-24 w-24 rounded-lg object-contain border p-1"
                />
                <p className="text-[11px] font-pmedium text-slate-500">
                  Using your company profile logo. Upload one above to override it for this listing.
                </p>
              </div>
            )}
          </div>
          <div className="mb-4 md:mb-0">
            {/* Google Map URL */}
            <Controller
              name="googleMap"
              control={control}
              rules={{
                validate: (val) => {
                  const v = (val || "").trim();
                  if (!v) return true; // optional
                  const GOOGLE_MAP_REGEX =
                    /^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/i;
                  return GOOGLE_MAP_REGEX.test(v) || "Enter a valid Google Maps URL";
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    const coords = extractLatLngFromMapUrl(e.target.value);
                    if (coords) {
                      setValue("latitude", coords.lat);
                      setValue("longitude", coords.lng);
                    }
                  }}
                  size="small"
                  label="Google Map URL"
                  fullWidth
                  helperText={errors?.googleMap?.message}
                  error={!!errors.googleMap}
                />
              )}
            />
          </div>
          <div className="mb-4 md:mb-0">
            {/* Latitude — auto-filled from the Google Map URL above when possible */}
            <Controller
              name="latitude"
              control={control}
              rules={{
                min: { value: -90, message: "Latitude must be between -90 and 90" },
                max: { value: 90, message: "Latitude must be between -90 and 90" },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label="Latitude"
                  type="number"
                  inputProps={{ min: -90, max: 90, step: "any" }}
                  error={!!errors.latitude}
                  helperText={errors?.latitude?.message}
                  fullWidth
                />
              )}
            />
          </div>
          <div className="mb-4 md:mb-0">
            {/* Longitude — auto-filled from the Google Map URL above when possible */}
            <Controller
              name="longitude"
              control={control}
              rules={{
                min: { value: -180, message: "Longitude must be between -180 and 180" },
                max: { value: 180, message: "Longitude must be between -180 and 180" },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label="Longitude"
                  type="number"
                  inputProps={{ min: -180, max: 180, step: "any" }}
                  error={!!errors.longitude}
                  helperText={errors?.longitude?.message}
                  fullWidth
                />
              )}
            />
          </div>
          {/* Reviews */}
          <div className="col-span-2">
            <div className="py-4 border-b border-gray-300">
              <span className="text-lg font-pmedium text-primary">Reviews</span>
            </div>
            {reviewFields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-lg border border-gray-300 p-4 my-3"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-pmedium">Review {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeReview(index)}
                    className="text-red-500 hover:text-red-700 text-xs font-pmedium"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <Controller
                    name={`reviews.${index}.name`}
                    control={control}
                    rules={{ required: "Name is required" }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Reviewer Name"
                        fullWidth
                        helperText={errors?.reviews?.[index]?.name?.message}
                        error={!!errors?.reviews?.[index]?.name}
                      />
                    )}
                  />
                  {/* Rating */}
                  <Controller
                    name={`reviews.${index}.rating`}
                    control={control}
                    rules={{
                      min: { value: 1, message: "Rating must be between 1 and 5" },
                      max: { value: 5, message: "Rating must be between 1 and 5" },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        size="small"
                        label="Rating (1-5)"
                        fullWidth
                        inputProps={{ min: 1, max: 5 }}
                        error={!!errors?.reviews?.[index]?.rating}
                        helperText={errors?.reviews?.[index]?.rating?.message}
                      />
                    )}
                  />
                </div>
                {/* Review text */}
                <Controller
                  name={`reviews.${index}.review`}
                  control={control}
                  // rules={{ required: "Review is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Review"
                      fullWidth
                      multiline
                      minRows={3}
                      helperText={errors?.reviews?.[index]?.review?.message}
                      error={!!errors?.reviews?.[index]?.review}
                      sx={{ mt: 2 }}
                    />
                  )}
                />
              </div>
            ))}
            <div>
              <button
                type="button"
                onClick={() => appendReview({ ...defaultReview })}
                className="text-[#2563EB] text-sm font-pmedium hover:underline inline-flex items-center gap-1"
              >
                + Add Review
              </button>
            </div>
          </div>
          {/* Submit / Reset */}
          <div className="col-span-2 flex items-center justify-center gap-4">
            <button
              type="submit"
              disabled={isCreating}
              className="px-8 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Submitting...
                </>
              ) : (
                "Submit"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("All entered data will be reset. Are you sure you want to continue?")) {
                  resetFormToEmpty();
                }
              }}
              className="px-8 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => navigate("/company-settings/nomad-listings")}
              className="px-8 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </PageFrame>
    </div>
  );
};

export default NomadListing;
