import { useEffect, useState } from "react";
import { Country, State, City } from "country-state-city";
import { Controller } from "react-hook-form";
import { MenuItem, Select } from "@mui/material";

interface CountryStateCitySelectorProps {
  control: any;
  getValues: (fieldName: string) => string;
  setValue: (fieldName: string, value: string) => void;
  errors?: Record<string, unknown>;
}

const CountryStateCitySelector = ({
  control,
  getValues,
  setValue,
  errors,
}: CountryStateCitySelectorProps) => {
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const selectedCountry = getValues("country");
  const selectedState = getValues("state");

  useEffect(() => {
    setCountries(Country.getAllCountries());
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      const fetchedStates = State.getStatesOfCountry(selectedCountry);
      setStates(fetchedStates);
    }
  }, [selectedCountry]);

  useEffect(() => {
    if (selectedCountry && selectedState) {
      const fetchedCities = City.getCitiesOfState(selectedCountry, selectedState);
      setCities(fetchedCities);
    }
  }, [selectedCountry, selectedState]);

  return (
    <>
      <Controller
        name="country"
        control={control}
        rules={{ required: "Country is required" }}
        render={({ field }: any) => (
          <Select
            {...field}
            fullWidth
            displayEmpty
            size="small"
            error={!!errors?.country}
            onChange={(e: any) => {
              field.onChange(e);
              setValue("state", "");
              setValue("city", "");
              setStates([]);
              setCities([]);
            }}
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
        rules={{ required: "State is required" }}
        render={({ field }: any) => (
          <Select
            {...field}
            fullWidth
            displayEmpty
            size="small"
            disabled={!selectedCountry}
            error={!!errors?.state}
            onChange={(e: any) => {
              field.onChange(e);
              setValue("city", "");
              setCities([]);
            }}
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
        rules={{ required: "City is required" }}
        render={({ field }: any) => (
          <Select
            {...field}
            fullWidth
            displayEmpty
            size="small"
            disabled={!selectedState}
            error={!!errors?.city}
          >
            <MenuItem value="">Select City</MenuItem>
            {cities.map((city) => (
              <MenuItem key={city.name} value={city.name}>
                {city.name}
              </MenuItem>
            ))}
          </Select>
        )}
      />
    </>
  );
};

export default CountryStateCitySelector;