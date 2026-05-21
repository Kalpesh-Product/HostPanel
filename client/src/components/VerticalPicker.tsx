import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import useAuth from "../hooks/useAuth";
import {
  BUSINESS_TYPE_TO_VERTICAL_KEY,
  type VerticalType,
} from "../constants/verticalConfig";

type VerticalPickerProps = {
  workspaceId: string;
};

type VerticalOption = {
  verticalKey: VerticalType;
  label: string;
  icon: string;
  description: string;
  isRecommended: boolean;
  isDisabled: boolean;
};

const ALL_VERTICALS: Array<{
  key: VerticalType;
  label: string;
  icon: string;
  desc: string;
}> = [
  {
    key: "co-working",
    label: "Co-Working",
    icon: "\u{1F5A5}\uFE0F",
    desc: "Desks, plans & workspace tours",
  },
  {
    key: "co-living",
    label: "Co-Living",
    icon: "\u{1F3E0}",
    desc: "Rooms, amenities & community",
  },
  {
    key: "hostel",
    label: "Hostels",
    icon: "\u{1F6CF}\uFE0F",
    desc: "Dorms, facilities & bookings",
  },
  {
    key: "workation",
    label: "Workation",
    icon: "\u{2708}\uFE0F",
    desc: "Packages, spaces & retreats",
  },
  {
    key: "meeting-rooms",
    label: "Meeting Rooms",
    icon: "\u{1F4C5}",
    desc: "Rooms, pricing & availability",
  },
  {
    key: "cafe",
    label: "Cafe",
    icon: "\u{2615}",
    desc: "Menu, ambience & location",
  },
];

const ALL_VERTICAL_KEYS = new Set<VerticalType>(
  ALL_VERTICALS.map((item) => item.key),
);

export default function VerticalPicker({ workspaceId }: VerticalPickerProps) {
  const axios = useAxiosPrivate();
  const { auth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedCompany = useSelector(
    (state: any) => state.company?.selectedCompany,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [options, setOptions] = useState<VerticalOption[]>([]);

  const builderBasePath = location.pathname.includes(
    "/company-settings/website-builder",
  )
    ? "/company-settings/website-builder"
    : "/dashboard/website-builder";

  const contextCompanyId = auth?.user?.companyId || "";
  const reduxCompanyId = selectedCompany?.companyId || "";
  const userDataRaw = localStorage.getItem("user");
  const userData = userDataRaw ? JSON.parse(userDataRaw) : null;
  const realCompanyId = userData?.companyId || "";
  const companyId = realCompanyId || reduxCompanyId || contextCompanyId || "";
  const currentCompanyId = companyId;

  const saveAndNavigate = async (verticalKey: VerticalType, label: string) => {
    localStorage.setItem("selectedVertical", verticalKey);
    localStorage.setItem("selectedVerticalLabel", label);
    navigate(`${builderBasePath}/static/create-website`);
  };

  useEffect(() => {
    let mounted = true;

    const loadWorkspace = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const res = await axios.get("/api/profile/me");
        if (!mounted) return;

        const workspace = res?.data?.data?.workspace || {};
        const businessName = String(
          workspace?.businessName ||
            selectedCompany?.companyName ||
            auth?.user?.companyName ||
            "",
        ).trim();
        const rawBusinessTypes = Array.isArray(workspace?.businessTypes)
          ? workspace.businessTypes
          : workspace?.businessType
            ? [workspace.businessType]
            : [];

        const recommendedVerticalKeys = new Set<VerticalType>(
          rawBusinessTypes
            .map((businessType: unknown) => String(businessType || "").trim())
            .filter(Boolean)
            .map(
              (businessType: string) =>
                BUSINESS_TYPE_TO_VERTICAL_KEY[businessType],
            )
            .filter((key): key is VerticalType => Boolean(key)),
        );

        let existingVerticalKeys = new Set<VerticalType>();
        try {
          const websitesResponse = await axios.get("/api/editor/get-websites", {
            params: { businessName },
          });
          const websitesPayload =
            websitesResponse?.data?.data ?? websitesResponse?.data;
          const websites = Array.isArray(websitesPayload)
            ? websitesPayload
            : Array.isArray(websitesPayload?.websites)
              ? websitesPayload.websites
              : websitesPayload &&
                  (websitesPayload?._id || websitesPayload?.companyName)
                ? [websitesPayload]
                : [];

          const existingWebsites = websites.filter(
            (website: any) =>
              String(website?.companyId || "").trim() === String(currentCompanyId).trim() ||
              String(website?.companyName || "").trim().toLowerCase() ===
                businessName.toLowerCase(),
          );

          existingVerticalKeys = new Set<VerticalType>(
            existingWebsites
              .map((item: any) => {
                const vertical = String(item?.vertical || "").trim() as VerticalType;
                const label = String(item?.verticalLabel || "").trim();
                const mapped = BUSINESS_TYPE_TO_VERTICAL_KEY[label];
                const resolved = mapped || vertical;
                return ALL_VERTICAL_KEYS.has(resolved) ? resolved : null;
              })
              .filter((key): key is VerticalType => Boolean(key)),
          );
        } catch {
          existingVerticalKeys = new Set<VerticalType>();
        }

        const allOptions: VerticalOption[] = ALL_VERTICALS.map((item) => ({
          verticalKey: item.key,
          label: item.label,
          icon: item.icon,
          description: item.desc,
          isRecommended: recommendedVerticalKeys.has(item.key),
          isDisabled: existingVerticalKeys.has(item.key),
        }));

        const sortedOptions = [...allOptions].sort((a, b) => {
          if (a.isRecommended && !b.isRecommended) return -1;
          if (!a.isRecommended && b.isRecommended) return 1;
          return 0;
        });

        setOptions(sortedOptions);
      } catch (error: any) {
        if (!mounted) return;
        setErrorMessage(
          error?.response?.data?.message ||
            "Unable to load workspace business types right now.",
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadWorkspace();

    return () => {
      mounted = false;
    };
  }, [axios, auth?.user?.primaryWorkspace, auth?.user?.companyName, selectedCompany?.companyName, workspaceId]);

  const heading = useMemo(() => "Choose a vertical", []);

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <div className="border-2 border-gray-200 rounded-xl bg-white p-4">
          <p className="text-subtitle font-pmedium">Loading workspace details...</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <div className="border-2 border-red-200 rounded-xl bg-red-50 p-4">
          <p className="text-subtitle font-pmedium text-red-600">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="bg-white border-2 border-gray-200 rounded-xl p-4 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 className="text-title font-pmedium text-primary uppercase">{heading}</h2>
          <p className="text-subtitle">
            Pick the business vertical to continue into the static website builder.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {options.map((option) => (
            <button
              key={option.verticalKey}
              type="button"
              disabled={option.isDisabled}
              onClick={() => {
                if (option.isDisabled) return;
                void saveAndNavigate(option.verticalKey, option.label);
              }}
              className={`group relative flex w-full flex-col items-start justify-center rounded-2xl p-6 text-left shadow-md transition-all ${
                option.isDisabled
                  ? "cursor-not-allowed bg-gray-100 text-gray-500"
                  : option.isRecommended
                    ? "bg-white border border-primary hover:shadow-xl"
                    : "bg-white hover:border-[0.2px] hover:border-primary hover:shadow-xl"
              }`}
            >
              {option.isRecommended && !option.isDisabled && (
                <div className="absolute right-4 top-4">
                  <span className="rounded-full border border-primary bg-primary/10 px-2 py-1 text-xs font-pmedium text-primary">
                    {"\u2B50 Recommended"}
                  </span>
                </div>
              )}
              {option.isDisabled && (
                <span className="absolute right-4 top-4 rounded-full bg-gray-200 px-2 py-1 text-xs font-pmedium text-gray-700">
                  Website exists
                </span>
              )}
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl transition-transform duration-300 group-hover:scale-110">
                {option.icon}
              </div>
              <p className="text-base font-bold">{option.label}</p>
              <p className="text-small mt-1">{option.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
