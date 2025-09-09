import React, { useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  TextField,
  MenuItem,
  CircularProgress,
  Select,
  InputLabel,
  FormControl,
  OutlinedInput,
  Checkbox,
  ListItemText,
} from "@mui/material";
import PageFrame from "../../../components/Pages/PageFrame";
import PrimaryButton from "../../../components/PrimaryButton";
import SecondaryButton from "../../../components/SecondaryButton";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import UploadFileInput from "../../../components/UploadFileInput";
import UploadMultipleFilesInput from "../../../components/UploadMultipleFilesInput";
import { Country, State, City } from "country-state-city";

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

const NomadListing = () => {
  const axios = useAxiosPrivate();
  const formRef = useRef(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      businessId: `BIZ_${Date.now()}`, // auto generated
      companyName: "",
      registeredEntityName: "",
      website: "",
      address: "",
      country: "",
      state: "",
      city: "",
      about: "",
      latitude: "",
      longitude: "",
      ratings: "",
      totalReviews: "",
      inclusions: [],
      services: "",
      companyType: "",
      logo: null,
      images: [],
    },
  });

  const selectedCountry = watch("country");
  const selectedState = watch("state");

  const { mutate: createCompany, isLoading } = useMutation({
    mutationFn: async (fd) => {
      const res = await axios.post("/api/companies/create", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Company added successfully!");
      reset();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to add company");
    },
  });

  const onSubmit = (values, e) => {
    const formEl = e?.target || formRef.current;
    const fd = new FormData(formEl);

    fd.set("businessId", values.businessId);
    fd.set("inclusions", JSON.stringify(values.inclusions));

    if (values.logo) fd.append("logo", values.logo);
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

  return (
    <div className="p-4">
      <PageFrame>
        <div className="flex items-center justify-between pb-4">
          <span className="text-title font-pmedium text-primary uppercase">
            Nomad Listing
          </span>
        </div>

        <form
          ref={formRef}
          encType="multipart/form-data"
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-2 gap-4">
          {/* Company Name */}
          <Controller
            name="companyName"
            control={control}
            rules={{ required: "Company Name is required" }}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                label="Company Name"
                helperText={errors?.companyName?.message}
                error={!!errors.companyName}
              />
            )}
          />

          {/* Registered Entity */}
          <Controller
            name="registeredEntityName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                label="Registered Entity Name"
              />
            )}
          />

          {/* Website */}
          <Controller
            name="website"
            control={control}
            render={({ field }) => (
              <TextField {...field} size="small" label="Website" />
            )}
          />

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

          {/* Country */}
          <Controller
            name="country"
            control={control}
            rules={{ required: "Country is required" }}
            render={({ field }) => (
              <TextField {...field} select size="small" label="Country">
                {Country.getAllCountries().map((c) => (
                  <MenuItem key={c.isoCode} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          {/* State */}
          <Controller
            name="state"
            control={control}
            render={({ field }) => (
              <TextField {...field} select size="small" label="State">
                {selectedCountry &&
                  State.getStatesOfCountry(
                    Country.getAllCountries().find(
                      (c) => c.name === selectedCountry
                    )?.isoCode
                  ).map((s) => (
                    <MenuItem key={s.isoCode} value={s.name}>
                      {s.name}
                    </MenuItem>
                  ))}
              </TextField>
            )}
          />

          {/* City */}
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <TextField {...field} select size="small" label="City">
                {selectedCountry &&
                  selectedState &&
                  City.getCitiesOfState(
                    Country.getAllCountries().find(
                      (c) => c.name === selectedCountry
                    )?.isoCode,
                    State.getStatesOfCountry(
                      Country.getAllCountries().find(
                        (c) => c.name === selectedCountry
                      )?.isoCode
                    ).find((s) => s.name === selectedState)?.isoCode
                  ).map((city) => (
                    <MenuItem key={city.name} value={city.name}>
                      {city.name}
                    </MenuItem>
                  ))}
              </TextField>
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

          {/* Company Type */}
          <Controller
            name="companyType"
            control={control}
            rules={{ required: "Company Type is required" }}
            render={({ field }) => (
              <TextField {...field} select size="small" label="Company Type">
                {companyTypes.map((type) => (
                  <MenuItem key={type} value={type.toLowerCase()}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          {/* Inclusions - Multi select */}
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
                  renderValue={(selected) => selected.join(", ")}>
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

          {/* Services */}
          <Controller
            name="services"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                label="Services"
                multiline
                minRows={2}
                fullWidth
              />
            )}
          />

          {/* About */}
          <div className="col-span-2">
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

          {/* Address */}
          <div className="col-span-2">
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  label="Address"
                  multiline
                  minRows={2}
                  fullWidth
                />
              )}
            />
          </div>

          {/* Logo Upload */}
          <Controller
            name="logo"
            control={control}
            render={({ field }) => (
              <UploadFileInput
                id="logo"
                value={field.value}
                label="Company Logo"
                onChange={field.onChange}
              />
            )}
          />

          {/* Images Upload */}
          <div className="col-span-2">
            <Controller
              name="images"
              control={control}
              render={({ field }) => (
                <UploadMultipleFilesInput
                  {...field}
                  label="Company Images"
                  maxFiles={5}
                  allowedExtensions={["jpg", "jpeg", "png", "webp"]}
                  id="images"
                />
              )}
            />
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

export default NomadListing;
