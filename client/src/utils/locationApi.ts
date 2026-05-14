const COUNTRIES_NOW_BASE_URL = "https://countriesnow.space/api/v0.1/countries";

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

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok) {
    throw new Error(
      payload?.msg ||
        payload?.message ||
        `Location request failed with status ${response.status}.`,
    );
  }
  if (payload?.error) {
    throw new Error(payload?.msg || "Location request failed.");
  }
  return payload || {};
}

export async function getCountries() {
  const response = await fetch(`${COUNTRIES_NOW_BASE_URL}/positions`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const payload = await parseResponse<Array<{ name?: string }>>(response);
  const countries = (Array.isArray(payload?.data) ? payload.data : [])
    .map((item) => String(item?.name || "").trim())
    .filter(Boolean);

  return normalizeOptions(countries);
}

export async function getStates(country: string) {
  const normalizedCountry = String(country || "").trim();
  if (!normalizedCountry) return [];

  const response = await fetch(`${COUNTRIES_NOW_BASE_URL}/states`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ country: normalizedCountry }),
  });

  const payload = await parseResponse<{ states?: Array<{ name?: string }> }>(response);
  const states = (Array.isArray(payload?.data?.states) ? payload.data.states : [])
    .map((item) => String(item?.name || "").trim())
    .filter(Boolean);

  return normalizeOptions(states);
}

export async function getCities(country: string, state: string) {
  const normalizedCountry = String(country || "").trim();
  const normalizedState = String(state || "").trim();
  if (!normalizedCountry || !normalizedState) return [];

  const response = await fetch(`${COUNTRIES_NOW_BASE_URL}/state/cities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      country: normalizedCountry,
      state: normalizedState,
    }),
  });

  const payload = await parseResponse<string[]>(response);
  const cities = Array.isArray(payload?.data) ? payload.data : [];

  return normalizeOptions(cities);
}
