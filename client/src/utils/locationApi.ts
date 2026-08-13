import { Country, State, City } from "country-state-city";

type ApiResponse<T> = {
  error?: boolean;
  msg?: string;
  message?: string;
  data?: T;
};

function normalizeOptions(values: string[] = []) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

export async function getCountries() {
  const countries = Country.getAllCountries()
    .map((item) => String(item.name || "").trim())
    .filter(Boolean);
  return normalizeOptions(countries);
}

export function getCountryIsoCode(country: string) {
  const normalizedCountry = String(country || "").trim().toLowerCase();
  if (!normalizedCountry) return "";
  return Country.getAllCountries().find(
    (item) => item.name.toLowerCase() === normalizedCountry || item.isoCode.toLowerCase() === normalizedCountry,
  )?.isoCode || "";
}

export async function getStates(country: string) {
  const normalizedCountry = String(country || "").trim();
  if (!normalizedCountry) return [];

  const countryRecord = Country.getAllCountries().find(
    (item) => item.name.toLowerCase() === normalizedCountry.toLowerCase(),
  );
  if (!countryRecord?.isoCode) return [];

  const states = State.getStatesOfCountry(countryRecord.isoCode)
    .map((item) => String(item.name || "").trim())
    .filter(Boolean);

  return normalizeOptions(states);
}

export async function getCities(country: string, state: string) {
  const normalizedCountry = String(country || "").trim();
  const normalizedState = String(state || "").trim();
  if (!normalizedCountry || !normalizedState) return [];

  const countryRecord = Country.getAllCountries().find(
    (item) => item.name.toLowerCase() === normalizedCountry.toLowerCase(),
  );
  if (!countryRecord?.isoCode) return [];

  const stateRecord = State.getStatesOfCountry(countryRecord.isoCode).find(
    (item) => item.name.toLowerCase() === normalizedState.toLowerCase(),
  );
  if (!stateRecord?.isoCode) return [];

  const cities = City.getCitiesOfState(countryRecord.isoCode, stateRecord.isoCode)
    .map((item) => String(item.name || "").trim())
    .filter(Boolean);

  return normalizeOptions(cities);
}
