import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { MenuItem, Select, TextField } from "@mui/material";
import { Country, State, City } from "country-state-city";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PrimaryButton from "./PrimaryButton";
import SecondaryButton from "./SecondaryButton";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import usePageDepartment from "../hooks/usePageDepartment";
import PageFrame from "./Pages/PageFrame";
import {
  isAlphanumeric,
  isValidBankAccount,
  isValidEmail,
  isValidGSTIN,
  isValidIFSC,
  noOnlyWhitespace,
} from "../utils/validators";

type VendorFormValues = Record<string, string>;

const Vendor = () => {
  const axios = useAxiosPrivate();
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset } = useForm<VendorFormValues>({
    mode: "onChange",
  });
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");

  useEffect(() => {
    setCountries(Country.getAllCountries());
  }, []);

  const department = usePageDepartment();
  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setStates(State.getStatesOfCountry(countryCode));
  };

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setCities(City.getCitiesOfState(selectedCountry, state));
  };

  const { mutate: vendorDetails, isPending } = useMutation({
    mutationFn: async (data: VendorFormValues) => {
      const response = await axios.post(`/api/vendors/onboard-vendor`, {
        ...data,
        departmentId: department?._id,
      });

      return response.data;
    },
    onSuccess: (data: { message?: string }) => {
      reset();
      toast.success(data.message || "Vendor saved");
      if (department?._id) {
        queryClient.invalidateQueries({
          queryKey: ["vendors", department._id],
        });
      }
    },
    onError: (error: any) => {
      if (!department) {
        toast.error("Unauthorized, department doesn't match");
      }
      toast.error(error?.response?.data?.message || "Error saving vendor");
    },
  });

  const onSubmit = (data: VendorFormValues) => {
    vendorDetails(data);
  };

  const handleReset = () => {
    reset();
  };

  return (
    <div className="flex flex-col gap-8">
      <PageFrame>
        <div className="h-[65vh] overflow-y-auto">
          <div className="flex justify-between items-center">
            <span className="text-title text-primary font-pmedium">
              VENDOR ONBOARDING FORM
            </span>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="">
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-1 gap-4">
              <div>
                <div className="py-4 border-b-default border-borderGray">
                  <span className="text-subtitle font-pmedium">
                    Basic Information
                  </span>
                </div>
                <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-4 gap-4 p-4">
                  <Controller
                    name="name"
                    control={control}
                    defaultValue=""
                    rules={{
                      required: "Vendor Name is required",
                      validate: { noOnlyWhitespace, isAlphanumeric },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Vendor Name"
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                  <Controller
                    name="email"
                    control={control}
                    defaultValue=""
                    rules={{
                      required: "Email is required",
                      validate: { noOnlyWhitespace, isValidEmail },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Email"
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                  <Controller
                    name="mobile"
                    control={control}
                    defaultValue=""
                    rules={{
                      required: "Mobile No is required",
                      validate: { noOnlyWhitespace },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Mobile No"
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                  <Controller
                    name="address"
                    control={control}
                    defaultValue=""
                    rules={{
                      required: "Address is required",
                      validate: { noOnlyWhitespace },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Address"
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                  <Controller
                    name="country"
                    control={control}
                    defaultValue=""
                    rules={{ required: "Country is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <Select
                        {...field}
                        fullWidth
                        displayEmpty
                        onChange={(e) => {
                          field.onChange(e);
                          handleCountryChange(e.target.value);
                        }}
                        size="small"
                        error={!!error}
                      >
                        <MenuItem value="">Select Country</MenuItem>
                        {countries.map((country) => (
                          <MenuItem key={country.isoCode} value={country.isoCode}>
                            {country.name}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                  <Controller
                    name="state"
                    control={control}
                    defaultValue=""
                    rules={{ required: "State is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <Select
                        {...field}
                        fullWidth
                        displayEmpty
                        onChange={(e) => {
                          field.onChange(e);
                          handleStateChange(e.target.value);
                        }}
                        size="small"
                        disabled={!selectedCountry}
                        error={!!error}
                      >
                        <MenuItem value="">Select State</MenuItem>
                        {states.map((state) => (
                          <MenuItem key={state.isoCode} value={state.isoCode}>
                            {state.name}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                  <Controller
                    name="city"
                    control={control}
                    defaultValue=""
                    rules={{ required: "City is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <Select
                        {...field}
                        fullWidth
                        displayEmpty
                        onChange={(e) => {
                          field.onChange(e);
                        }}
                        size="small"
                        disabled={!selectedState}
                        error={!!error}
                      >
                        <MenuItem value="">Select City</MenuItem>
                        {cities.map((city) => (
                          <MenuItem key={city.isoCode} value={city.name}>
                            {city.name}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                  <Controller
                    name="pinCode"
                    control={control}
                    defaultValue=""
                    rules={{
                      required: "Pin Code is required",
                      validate: { noOnlyWhitespace },
                      pattern: {
                        value: /^[1-9][0-9]{5}$/,
                        message: "Invalid Pin Code (e.g., 560001)",
                      },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Pin Code"
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                </div>
              </div>
              <div>
                <div className="py-4 border-b-default border-borderGray">
                  <span className="text-subtitle font-pmedium">
                    Other Information
                  </span>
                </div>
                <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  <Controller
                    name="partyType"
                    control={control}
                    defaultValue=""
                    rules={{ required: "Party Type is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <Select {...field} size="small" displayEmpty error={!!error}>
                        <MenuItem value="" disabled>
                          Party Type
                        </MenuItem>
                        <MenuItem value="Domestic">Domestic</MenuItem>
                        <MenuItem value="International">International</MenuItem>
                      </Select>
                    )}
                  />
                  <Controller
                    name="companyName"
                    control={control}
                    defaultValue=""
                    rules={{
                      required: "Company Name is required",
                      validate: { noOnlyWhitespace, isAlphanumeric },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Company Name"
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                  <Controller
                    name="gstIn"
                    control={control}
                    defaultValue=""
                    rules={{ validate: { noOnlyWhitespace, isValidGSTIN } }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="GST IN"
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                  <Controller
                    name="panIdNo"
                    control={control}
                    defaultValue=""
                    rules={{
                      validate: { noOnlyWhitespace },
                      pattern: {
                        value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
                        message: "Invalid PAN (e.g., ABCDE1234F)",
                      },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="PAN ID No"
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                </div>
                <div className="py-4 border-b-default border-borderGray">
                  <span className="text-subtitle font-pmedium">
                    Bank Information
                  </span>
                </div>
                <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-3 gap-4 p-4">
                  <Controller
                    name="ifscCode"
                    control={control}
                    defaultValue=""
                    rules={{
                      required: "IFSC Code is required",
                      validate: { noOnlyWhitespace, isValidIFSC },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="IFSC Code"
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                  <Controller
                    name="bankName"
                    control={control}
                    defaultValue=""
                    rules={{
                      required: "Bank Name is required",
                      validate: { noOnlyWhitespace, isAlphanumeric },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Bank Name"
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                  <Controller
                    name="branchName"
                    control={control}
                    defaultValue=""
                    rules={{
                      required: "Branch Name is required",
                      validate: { noOnlyWhitespace, isAlphanumeric },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Branch Name"
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />

                  <Controller
                    name="nameOnAccount"
                    control={control}
                    defaultValue=""
                    rules={{
                      required: "Name On Account is required",
                      validate: { noOnlyWhitespace, isAlphanumeric },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Name On Account"
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                  <Controller
                    name="accountNumber"
                    control={control}
                    defaultValue=""
                    rules={{
                      required: "Account Number is required",
                      validate: { noOnlyWhitespace, isValidBankAccount },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Account Number"
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4">
              <PrimaryButton type="submit" title={"Submit"} isLoading={isPending} />
              <SecondaryButton
                handleSubmit={handleReset}
                title={"Reset"}
                type="button"
              />
            </div>
          </form>
        </div>
      </PageFrame>
    </div>
  );
};

export default Vendor;