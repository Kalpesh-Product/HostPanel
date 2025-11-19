import { useEffect, useRef } from "react";
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
import PrimaryButton from "../../../components/PrimaryButton";
import SecondaryButton from "../../../components/SecondaryButton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import UploadMultipleFilesInput from "../../../components/UploadMultipleFilesInput";
import { useLocation } from "react-router-dom";
import axios from "axios";

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
const companyTypes = ["Coworking", "Meeting Room", "Cafe", "Private Stay"];

// ✅ Default review structure
const defaultReview = {
  name: "",
  review: "",
  rating: 5,
};

const EditNomadListing = () => {
  const axiosPriv = useAxiosPrivate();
  const formRef = useRef(null);
  const location = useLocation();
  const navState = location?.state || {};

  // Pull IDs from state or sessionStorage (works after refresh/back)
  const companyId =
    navState.companyId || sessionStorage.getItem("companyId") || "";
  const companyType = navState.website.companyType || "";
  const businessId =
    navState.website?.businessId || sessionStorage.getItem("businessId") || "";

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      businessId: `BIZ_${Date.now()}`,
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
    },
  });

  // ✅ Field Array for reviews
  const {
    fields: reviewFields,
    append: appendReview,
    remove: removeReview,
  } = useFieldArray({ control, name: "reviews" });

  // ---- Prefill logic -------------------------------------------------

  const { data: fetchedListing } = useQuery({
    queryKey: ["nomad-listing-detail", companyId, businessId],
    enabled: !!companyId && !!businessId,
    queryFn: async () => {
      const res = await axios.get(
        `https://wononomadsbe.vercel.app/api/company/get-listings/${companyId}?companyType=${companyType}`
      );
      const all = Array.isArray(res.data) ? res.data : [];
      return all.find((x) => x.businessId === businessId) || null;
    },
  });

  useEffect(() => {
    const src = fetchedListing || navState.website;
    if (!src) return;

    const reviews =
      Array.isArray(src.reviews) && src.reviews.length
        ? src.reviews.map((r) => ({
            name: r.name || "",
            review: r.description || r.review || r.testimony || "",

            rating: Number(r.rating ?? 5),
          }))
        : [defaultReview];

    const inclusionsArr = Array.isArray(src.inclusions)
      ? src.inclusions
      : typeof src.inclusions === "string" && src.inclusions.trim()
      ? src.inclusions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    reset({
      businessId: src.businessId || businessId || `BIZ_${Date.now()}`,
      productName: src.productName || src.name || "",
      cost: src.cost || "",
      description: src.description || "",
      companyType: src.companyType || "",
      ratings: src.ratings ?? "",
      totalReviews: src.totalReviews ?? "",
      latitude: src.latitude != null ? String(src.latitude) : "",
      longitude: src.longitude != null ? String(src.longitude) : "",
      inclusions: inclusionsArr,
      about: src.about || "",
      address: src.address || "",
      images: [],
      reviews,
    });
  }, [navState.website, fetchedListing, businessId, reset]);

  // --------------------------------------------------------------------

  const { mutate: saveListing, isLoading } = useMutation({
    mutationFn: async (fd) => {
      const res = await axiosPriv.patch(
        "/api/listings/edit-company-listing",
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return res.data;
    },
    onSuccess: () => {
      toast.success("Listing updated successfully!");
      reset();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update");
    },
  });

  const onSubmit = (values, e) => {
    const formEl = e?.target || formRef.current;
    const fd = new FormData(formEl);

    // required IDs
    fd.set("companyId", companyId);
    fd.set("businessId", values.businessId);

    // normalize inclusions
    const inclusionsArr = Array.isArray(values.inclusions)
      ? values.inclusions
      : typeof values.inclusions === "string"
      ? values.inclusions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    fd.set("inclusions", inclusionsArr.join(", "));

    // normalize reviews
    const mappedReviews = (values.reviews || []).map((r) => ({
      name: r.name,
      review: r.review,
      starCount: Number(r.rating ?? 0),
    }));
    fd.set("reviews", JSON.stringify(mappedReviews));

    // cleanup noise from RHF fieldArray
    for (const key of Array.from(fd.keys())) {
      if (/^reviews\.\d+\./.test(key)) fd.delete(key);
    }

    if (values.images?.length) {
      values.images.forEach((file) => fd.append("images", file));
    }

    saveListing(fd);
  };

  const handleReset = () => {
    const node = formRef.current;
    node && node.reset();
    reset();
  };

  return (
    <div className="p-4">
      <PageFrame>
        <form
          ref={formRef}
          encType="multipart/form-data"
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-2 gap-4"
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

          {/* Company Type */}
          <Controller
            name="companyType"
            control={control}
            rules={{ required: "Company Type is required" }}
            render={({ field }) => (
              <TextField {...field} select size="small" label="Company Type">
                {companyTypes.map((type) => (
                  <MenuItem
                    key={type}
                    value={type.toLowerCase().replace(/\s+/g, "")}
                  >
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          {/* Inclusions */}
          <Controller
            name="inclusions"
            control={control}
            render={({ field }) => (
              <FormControl size="small">
                <InputLabel>Inclusions</InputLabel>
                <Select
                  {...field}
                  multiple
                  input={<OutlinedInput label="Inclusions" />}
                  renderValue={(selected) => selected.join(", ")}
                >
                  {inclusionOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      <Checkbox checked={field.value.indexOf(option) > -1} />
                      <ListItemText primary={option} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />

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

          {/* Ratings */}
          <Controller
            name="ratings"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                label="Ratings"
                type="number"
              />
            )}
          />

          {/* Total Reviews */}
          <Controller
            name="totalReviews"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                label="Total Reviews"
                type="number"
              />
            )}
          />

          {/* Latitude */}
          <Controller
            name="latitude"
            control={control}
            render={({ field }) => (
              <TextField {...field} size="small" label="Latitude" />
            )}
          />

          {/* Longitude */}
          <Controller
            name="longitude"
            control={control}
            render={({ field }) => (
              <TextField {...field} size="small" label="Longitude" />
            )}
          />

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

          {/* Images */}
          <div className="col-span-2">
            {fetchedListing?.images?.length > 0 && (
              <div className="flex gap-3 flex-wrap mb-3">
                {fetchedListing.images.map((img) => (
                  <div
                    key={img._id}
                    className="relative w-24 h-24 border rounded overflow-hidden"
                  >
                    <img
                      src={img.url}
                      alt={`Image ${img.index}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
            <Controller
              name="images"
              control={control}
              render={({ field }) => (
                <UploadMultipleFilesInput
                  {...field}
                  label="Upload New Images"
                  maxFiles={11}
                  allowedExtensions={["jpg", "jpeg", "png", "webp"]}
                  id="images"
                />
              )}
            />
          </div>

          {/* Reviews */}
          <div className="col-span-2">
            <div className="py-4 border-b border-gray-300">
              <span className="text-lg font-medium text-primary">Reviews</span>
            </div>
            {reviewFields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-lg border border-gray-300 p-4 my-3"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold">Review {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeReview(index)}
                    className="text-sm text-red-500"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Controller
                    name={`reviews.${index}.rating`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        size="small"
                        label="Rating (1-5)"
                        fullWidth
                        inputProps={{ min: 1, max: 5 }}
                      />
                    )}
                  />
                </div>
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
                className="text-sm text-primary"
              >
                + Add Review
              </button>
            </div>
          </div>

          {/* Submit / Reset */}
          <div className="col-span-2 flex items-center justify-center gap-4">
            <PrimaryButton type="submit" title="Submit" isLoading={isLoading} />
            <SecondaryButton handleSubmit={handleReset} title="Reset" />
          </div>
        </form>
      </PageFrame>
    </div>
  );
};

export default EditNomadListing;
