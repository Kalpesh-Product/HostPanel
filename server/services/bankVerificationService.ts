import axios from "axios";

export interface BankDirectoryOption {
  code: string;
  name: string;
  countryCode: string;
  swiftCode?: string;
  city?: string;
  state?: string;
}

const INDIA_FALLBACK_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Yes Bank",
  "Bank of Baroda",
  "Punjab National Bank",
  "Canara Bank",
  "Union Bank of India",
];

const normalizeCountryCode = (value = "") => String(value || "").trim().toUpperCase().slice(0, 2);
const normalizeText = (value: unknown) => String(value || "").trim();

export const listBanksByCountry = async ({
  countryCode,
}: {
  countryCode: string;
  state?: string;
  city?: string;
}) => {
  const country = normalizeCountryCode(countryCode);
  if (!country) throw Object.assign(new Error("Country code is required."), { statusCode: 400 });
  const banks = country === "IN"
    ? INDIA_FALLBACK_BANKS.map((name) => ({ code: name, name, countryCode: country }))
    : [];
  return {
    banks,
    source: banks.length ? "india-built-in" : "manual-entry",
    isFallback: true,
  };
};

const lookupIndianIfsc = async (ifscCode: string) => {
  const ifsc = normalizeText(ifscCode).toUpperCase();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    throw Object.assign(new Error("Enter a valid 11-character IFSC code."), { statusCode: 400 });
  }
  let response;
  try {
    response = await axios.get(`https://ifsc.razorpay.com/${encodeURIComponent(ifsc)}`, { timeout: 10000 });
  } catch (error: any) {
    if (error?.response?.status === 404) {
      throw Object.assign(new Error("IFSC code was not found."), { statusCode: 400 });
    }
    throw Object.assign(new Error("IFSC validation service is temporarily unavailable."), { statusCode: 503 });
  }
  return {
    ifscCode: ifsc,
    bankName: normalizeText(response.data?.BANK),
    branchName: normalizeText(response.data?.BRANCH),
    state: normalizeText(response.data?.STATE),
    city: normalizeText(response.data?.CITY || response.data?.DISTRICT),
    address: normalizeText(response.data?.ADDRESS),
  };
};

const looselyMatches = (expected = "", actual = "") => {
  const left = normalizeText(expected).toLowerCase().replace(/[^a-z0-9]/g, "");
  const right = normalizeText(actual).toLowerCase().replace(/[^a-z0-9]/g, "");
  return !left || !right || left.includes(right) || right.includes(left);
};


const locationContainsCity = (city = "", branch: { city?: string; branchName?: string; address?: string }) => {
  const expected = normalizeText(city).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!expected) return true;
  return [branch.city, branch.branchName, branch.address].some((value) => {
    const candidate = normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
    return Boolean(candidate && (candidate.includes(expected) || expected.includes(candidate)));
  });
};

export const verifyBankDetails = async (payload: Record<string, unknown>) => {
  const countryCode = normalizeCountryCode(payload.countryCode as string);
  const bankName = normalizeText(payload.bankName);
  const ifscCode = normalizeText(payload.ifscCode).toUpperCase();
  const state = normalizeText(payload.state);
  const city = normalizeText(payload.city);

  if (countryCode !== "IN") {
    throw Object.assign(new Error("Automatic bank validation is available only for Indian bank accounts."), { statusCode: 400 });
  }

  if (!countryCode || !bankName || !ifscCode) {
    throw Object.assign(new Error("Country, bank, and IFSC code are required."), { statusCode: 400 });
  }

  if (countryCode === "IN") {
    const branch = await lookupIndianIfsc(ifscCode);
    if (!looselyMatches(bankName, branch.bankName)) {
      throw Object.assign(new Error(`This IFSC belongs to ${branch.bankName}, not ${bankName}.`), { statusCode: 400 });
    }
    if (state && branch.state && !looselyMatches(state, branch.state)) {
      throw Object.assign(new Error(`This IFSC belongs to ${branch.state}, not the selected state.`), { statusCode: 400 });
    }
    const cityMatched = locationContainsCity(city, branch);
    const locationMessage = cityMatched
      ? `Branch location matched ${city}.`
      : `The IFSC directory reports ${branch.city || "the district"}; the selected locality ${city} could not be matched exactly, but the bank and state are valid.`;

    return {
      verified: true,
      verificationLevel: "branch",
      message: `Verified. The IFSC and bank branch are genuine. ${locationMessage}`,
      branch,
      cityMatched,
    };
  }

};
