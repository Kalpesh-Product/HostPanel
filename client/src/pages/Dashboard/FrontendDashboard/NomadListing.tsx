// @ts-nocheck
import { useRef } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import UploadMultipleFilesInput from "../../../components/UploadMultipleFilesInput";
import useAuth from "../../../hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useNomadListingCapacity, {
  normalizeNomadListingType,
} from "../../../hooks/useNomadListingCapacity";

// Dummy inclusions
const inclusionOptions = [
  "Private Desk",
  "Private Storage",
  "Air Conditioning",
  "High Speed Wi-Fi",
  "IT Support",
  "Tea & Coffee",
  "Reception Support",
  "Housekeeping",
  "Community",
  "Meeting Room",
];

// Dummy company types
const companyTypes = [
  "Coworking",
  "Meeting Room",
  "Cafe",
  // "Private Stay",
  "Workation",
  "Coliving",
  "Hostel",
];

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
  const submitLockRef = useRef(false);

  const { auth } = useAuth(); // <-- get auth info
  const companyId = auth?.user?.companyId || ""; // <-- safe fallback
  const listingCompanyId = auth?.user?.effectiveNomadsCompanyId || companyId;
  const companyName = auth?.user?.companyName || "";
  const {
    limit,
    used,
    remaining,
    isAtLimit,
    addedTypes,
    limitMessage,
    refetchListings,
  } = useNomadListingCapacity(listingCompanyId);

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    watch,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    defaultValues: {
      // businessId: `BIZ_${Date.now()}`,
      companyId: companyId, // set default so RHF knows
      companyType: "",
      ratings: "",
      totalReviews: "",
      productName: "",
      cost: "",
      description: "",
      latitude: "",
      longitude: "",
      inclusions: [],
      about: "",
      address: "",
      images: [],
      reviews: [defaultReview], // ✅ initialize with one review
      mapUrl: "",
    },
  });

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
    if (addedTypes.has(normalizeNomadListingType(values.companyType))) {
      toast.error("This Nomad listing type has already been added.", {
        position: "bottom-right",
      });
      return;
    }

    submitLockRef.current = true;
    const formEl = formRef.current;
    const fd = new FormData(formEl);

    fd.set("companyId", companyId); // <-- always send from token
    fd.set("companyName", companyName); // ← SEND THIS
    // fd.set("businessId", values.businessId);
    fd.set("companyType", values.companyType);
    fd.set("ratings", values.ratings);
    fd.set("totalReviews", values.totalReviews);
    fd.set("productName", values.productName);
    fd.set("cost", values.cost);
    fd.set("description", values.description);
    fd.set("latitude", values.latitude);
    fd.set("longitude", values.longitude);
    fd.set("about", values.about);
    fd.set("address", values.address);
    fd.set("mapUrl", values.mapUrl);

    // ✅ inclusions as comma-separated string
    const inclusionsArr = Array.isArray(values.inclusions)
      ? values.inclusions
      : [];
    fd.set("inclusions", inclusionsArr.join(", "));

    // ✅ reviews JSON
    fd.set("reviews", JSON.stringify(values.reviews || []));
    for (const key of Array.from(fd.keys())) {
      if (/^reviews\.\d+\./.test(key)) fd.delete(key);
    }

    fd.delete("images");
    if (values.images?.length) {
      values.images.forEach((file) => fd.append("images", file));
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
      ratings: "",
      totalReviews: "",
      productName: "",
      cost: "",
      description: "",
      latitude: "",
      longitude: "",
      inclusions: [],
      about: "",
      address: "",
      images: [],
      reviews: [defaultReview],
      mapUrl: "",
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
          onSubmit={handleSubmit(onSubmit, () => onSubmit(getValues()))}
          className="md:grid grid-cols-2 gap-4"
        >
          {/* Product Name */}
          {/* <Controller
            name="productName"
            control={control}
            render={({ field }) => (
              <TextField {...field} size="small" label="Product Name" />
            )}
          /> */}
          {/* Cost */}
          {/* <Controller
            name="cost"
            control={control}
            render={({ field }) => (
              <TextField {...field} size="small" label="Cost" type="number" />
            )}
          /> */}
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
                >
                  {companyTypes.map((type) => {
                    const alreadyAdded = addedTypes.has(normalizeNomadListingType(type));
                    return (
                      <MenuItem
                        key={type}
                        value={type.toLowerCase()}
                        disabled={alreadyAdded}
                        className="font-pmedium"
                      >
                        <span className="flex w-full items-center justify-between gap-4 font-pmedium">
                          <span>{type}</span>
                          {alreadyAdded && (
                            <span className="text-[10px] font-pmedium uppercase tracking-wide text-emerald-600">
                              Already added
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
          </div>
          <div className="mb-4 md:mb-0">
            {/* Inclusions */}
            <Controller
              name="inclusions"
              control={control}
              render={({ field }) => (
                <FormControl size="small" fullWidth>
                  <InputLabel>Inclusions</InputLabel>
                  {/* <Select
                  {...field}
                  multiple
                  input={<OutlinedInput label="Inclusions" />}
                  renderValue={(selected) => Array.isArray(selected) ? selected.join(", ") : selected}>
                  {inclusionOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      <Checkbox checked={field.value.indexOf(option) > -1} />
                      <ListItemText primary={option} />
                    </MenuItem>
                  ))}
                </Select> */}
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
                    renderValue={(selected) =>
                      Array.isArray(selected) ? selected.join(", ") : ""
                    }
                  >
                    {inclusionOptions.map((option) => (
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
              )}
            />
          </div>
          {/* Description */}
          {/* <div className="col-span-2">
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label="Description"
                  multiline
                  minRows={3}
                  fullWidth
                />
              )}
            />
          </div> */}
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
                max: { value: 100000, message: "Total reviews cannot exceed 100,000" },
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
                  inputProps={{ min: 0, max: 100000, step: 1 }}
                  error={!!errors.totalReviews}
                  helperText={errors?.totalReviews?.message}
                  fullWidth
                />
              )}
            />
          </div>
          <div className="mb-4 md:mb-0">
            {/* Latitude */}
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
            {/* Longitude */}
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
            {/* Map URL */}
            <Controller
              name="mapUrl"
              control={control}
              rules={{
                required: "Map URL is required",
                validate: (val) => {
                  const MAP_EMBED_REGEX =
                    /^https?:\/\/(www\.)?(google\.com|maps\.google\.com)\/maps\/embed(\/v1\/[a-z]+|\?pb=|\/?\?)/i;
                  const v = (val || "").trim();
                  return (
                    MAP_EMBED_REGEX.test(v) ||
                    "Enter a valid Google Maps embed URL"
                  );
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label="Embed Map URL"
                  fullWidth
                  helperText={errors?.mapUrl?.message}
                  error={!!errors.mapUrl}
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
              onClick={resetFormToEmpty}
              className="px-8 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </form>
      </PageFrame>
    </div>
  );
};

export default NomadListing;
