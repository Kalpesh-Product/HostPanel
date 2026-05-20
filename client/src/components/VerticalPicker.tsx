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
  businessType: string;
  verticalKey: VerticalType;
  icon: string;
  description: string;
};

const VERTICAL_META: Record<
  string,
  {
    icon: string;
    description: string;
  }
> = {
  "Co-Working": {
    icon: "\u{1F5A5}\uFE0F",
    description: "Desks, plans & workspace tours",
  },
  "Co-Living": {
    icon: "\u{1F3E0}",
    description: "Rooms, amenities & community",
  },
  Hostels: {
    icon: "\u{1F6CF}\uFE0F",
    description: "Dorms, facilities & bookings",
  },
  Workation: {
    icon: "\u{2708}\uFE0F",
    description: "Packages, spaces & retreats",
  },
  "Meeting Rooms": {
    icon: "\u{1F4C5}",
    description: "Rooms, pricing & availability",
  },
  Cafe: {
    icon: "\u{2615}",
    description: "Menu, ambience & location",
  },
};

const formatCompanyName = (name: string) =>
  String(name || "")
    .trim()
    .toLowerCase()
    .split("-")[0]
    .replace(/\s+/g, "");

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
  const [workspaceBusinessName, setWorkspaceBusinessName] = useState("");

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

  const saveAndNavigate = async (verticalKey: VerticalType, businessType: string, businessName: string) => {
    localStorage.setItem("selectedVertical", verticalKey);
    localStorage.setItem("selectedVerticalLabel", businessType);
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
        const businessName = String(workspace?.businessName || "").trim();
        if (companyId || businessName) {
          try {
            const websitesResponse = await axios.get("/api/editor/get-websites", {
              params: { companyId },
            });
            const websitesPayload =
              websitesResponse?.data?.data ?? websitesResponse?.data;
            const websites = Array.isArray(websitesPayload)
              ? websitesPayload
              : Array.isArray(websitesPayload?.websites)
                ? websitesPayload.websites
                : websitesPayload && (websitesPayload?._id || websitesPayload?.companyName)
                  ? [websitesPayload]
                  : [];
            const existingWebsite = websites.find((item: any) => item);
            const matchedWebsite = websites.find((item: any) =>
              String(item?.companyId || "").trim() === String(companyId).trim() ||
              String(item?.companyName || "").trim().toLowerCase() ===
                businessName.toLowerCase(),
            );
            const existingVertical = String(matchedWebsite?.vertical || "").trim();

            if (matchedWebsite && existingVertical) {
              localStorage.setItem("selectedVertical", existingVertical);
              localStorage.setItem(
                "selectedVerticalLabel",
                String(matchedWebsite?.verticalLabel || matchedWebsite?.companyName || ""),
              );
              const websiteSlug =
                matchedWebsite?.searchKey ||
                matchedWebsite?.companyName ||
                formatCompanyName(businessName);
              const editRoute = websiteSlug
                ? `${builderBasePath}/edit-website/${encodeURIComponent(websiteSlug)}`
                : `${builderBasePath}/edit-website`;
              navigate(editRoute);
              return;
            }
          } catch {
            // If existing website lookup fails, continue with picker flow.
          }
        }

        const rawBusinessTypes = Array.isArray(workspace?.businessTypes)
          ? workspace.businessTypes
          : workspace?.businessType
            ? [workspace.businessType]
            : [];

        const mappedOptions: VerticalOption[] = rawBusinessTypes
          .map((businessType: unknown) => String(businessType || "").trim())
          .filter(Boolean)
          .map((businessType: string) => {
            const verticalKey = BUSINESS_TYPE_TO_VERTICAL_KEY[businessType];
            if (!verticalKey) return null;
            const meta = VERTICAL_META[businessType] || {
              icon: "\u{1F3E2}",
              description: "Build your website experience",
            };
            return {
              businessType,
              verticalKey,
              icon: meta.icon,
              description: meta.description,
            };
          })
          .filter((item): item is VerticalOption => Boolean(item));

        const uniqueOptions = mappedOptions.filter(
          (item, index, list) =>
            list.findIndex(
              (candidate) => candidate.verticalKey === item.verticalKey,
            ) === index,
        );

        if (uniqueOptions.length === 1) {
          void saveAndNavigate(
            uniqueOptions[0].verticalKey,
            uniqueOptions[0].businessType,
            businessName,
          );
          return;
        }

        if (uniqueOptions.length === 0) {
          setErrorMessage("No supported business types found for this workspace.");
          setOptions([]);
          return;
        }

        setOptions(uniqueOptions);
        setWorkspaceBusinessName(businessName);
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
  }, [axios, auth?.user?.primaryWorkspace, workspaceId]);

  const heading = useMemo(
    () => (options.length > 1 ? "Choose a vertical" : "Preparing builder"),
    [options.length],
  );

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
              onClick={() => {
                void saveAndNavigate(
                  option.verticalKey,
                  option.businessType,
                  workspaceBusinessName ||
                    selectedCompany?.companyName ||
                    auth?.user?.companyName ||
                    "",
                );
              }}
              className="group relative flex w-full flex-col items-start justify-center rounded-2xl bg-white p-6 text-left shadow-md transition-all hover:border-[0.2px] hover:border-primary hover:shadow-xl"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl transition-transform duration-300 group-hover:scale-110">
                {option.icon}
              </div>
              <p className="text-base font-bold">{option.businessType}</p>
              <p className="text-small mt-1">{option.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
