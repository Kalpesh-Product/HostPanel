// @ts-nocheck
import React, { useRef, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import {
  TextField,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import PageFrame from "../../../../components/Pages/PageFrame";
import PrimaryButton from "../../../../components/PrimaryButton";
import SecondaryButton from "../../../../components/SecondaryButton";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import UploadMultipleFilesInput from "../../../../components/UploadMultipleFilesInput";
import UploadFileInput from "../../../../components/UploadFileInput";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import useAuth from "../../../../hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import {
  VERTICAL_CONFIG,
  VERTICAL_KEYS,
  VERTICAL_KEY_TO_LABEL,
  type VerticalType,
} from "../../../../constants/verticalConfig";
import CreditsIndicator from "../../../../components/CreditsIndicator";
import RoomsSection from "./RoomsSection";
import PackagesSection from "./PackagesSection";
import DormsSection from "./DormsSection";
import MenuSection from "./MenuSection";

const defaultProduct = {
  type: "",
  name: "",
  cost: "",
  description: "",
};

const defaultTestimonial = {
  name: "",
  jobPosition: "",
  testimony: "",
  rating: 5,
};

const normalizeVerticalKey = (value: unknown): VerticalType => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "co-working";
  const compact = raw.replace(/\s+/g, "");
  const hyphen = raw.replace(/\s+/g, "-");
  const aliasMap: Record<string, VerticalType> = {
    coworking: "co-working",
    "co-working": "co-working",
    coliving: "co-living",
    "co-living": "co-living",
    meetingrooms: "meeting-rooms",
    "meeting-rooms": "meeting-rooms",
    hostel: "hostel",
    workation: "workation",
    cafe: "cafe",
  };
  return aliasMap[raw] || aliasMap[compact] || aliasMap[hyphen] || "co-working";
};

const toSearchKey = (value: unknown): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split("-")[0]
    .replace(/\s+/g, "");

const CreateWebsite = () => {
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef(null);
  const { auth } = useAuth();
  const [hostCompanyIdentity, setHostCompanyIdentity] = useState(null);
  const [workspaceBusinessName, setWorkspaceBusinessName] = useState("");
  const [isCheckingExistingWebsite, setIsCheckingExistingWebsite] = useState(true);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsLimit, setCreditsLimit] = useState(5);
  const [creditsResetDate, setCreditsResetDate] = useState(null);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [isRedirectingAfterCreate, setIsRedirectingAfterCreate] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues, // ✅ add this
    formState: { errors },
  } = useForm({
    defaultValues: {
      // hero/company
      companyId: "", // ✅ change from businessId
      companyName: "",
      title: "",
      subTitle: "",
      CTAButtonText: "",
      companyLogo: null,
      heroImages: [],
      gallery: [],
      // about
      about: [{ text: "" }],
      // products
      productTitle: "",
      products: [defaultProduct],
      // gallery
      galleryTitle: "",
      // testimonials
      testimonialTitle: "",
      testimonials: [defaultTestimonial],
      // contact
      contactTitle: "",
      mapUrl: "",
      websiteEmail: "",
      phone: "",
      address: "",
      // footer
      registeredCompanyName: "",
      copyrightText: "",
    },
  });

  const selectedCompany = useSelector((state) => state.company.selectedCompany);
  const builderBasePath = location.pathname.includes("/company-settings/website-builder")
    ? "/company-settings/website-builder"
    : "/dashboard/website-builder";
  const workspaceId =
    selectedCompany?.workspaceId ||
    auth?.user?.primaryWorkspace ||
    auth?.user?.workspaceId;
  const prefillCompanyId =
    selectedCompany?.companyId ||
    hostCompanyIdentity?.companyId ||
    auth?.user?.companyId ||
    "";
  const prefillCompanyName =
    selectedCompany?.companyName ||
    workspaceBusinessName ||
    hostCompanyIdentity?.companyName ||
    auth?.user?.companyName ||
    "";
  const [creditsRemaining, setCreditsRemaining] = useState(5);
  const selectedVerticalRaw = localStorage.getItem("selectedVertical") || "";
  const verticalFromState =
    selectedCompany?.vertical || auth?.user?.vertical || "co-working";
  const verticalCandidate = selectedVerticalRaw || verticalFromState;
  const vertical: VerticalType = (VERTICAL_KEYS as readonly string[]).includes(
    verticalCandidate,
  )
    ? (verticalCandidate as VerticalType)
    : "co-working";
  const activeSections =
    VERTICAL_CONFIG[vertical]?.sections ?? VERTICAL_CONFIG["co-working"].sections;
  const selectedVertical = vertical;
  const selectedVerticalLabel = VERTICAL_KEY_TO_LABEL[selectedVertical] || "Co-Working";
  const selectedVerticalBadgeText = `Selected Vertical: ${selectedVerticalLabel}`;
  const ctaPlaceholders: Record<string, string> = {
    "co-working": "Book a Desk",
    "co-living": "View Rooms",
    workation: "See Packages",
    hostel: "Book a Bed",
    "meeting-rooms": "Book a Room",
    cafe: "View Menu",
  };
  const ctaPlaceholder = ctaPlaceholders[selectedVertical] || "Get Started";
  const sectionTitles: Record<string, string> = {
    "co-working": "Our Plans",
    "co-living": "Our Rooms",
    workation: "Our Packages",
    hostel: "Our Dorms",
    "meeting-rooms": "Our Rooms & Pricing",
    cafe: "Our Menu",
  };

  const values = watch();
  const CHAR_LIMITS = {
    heroTitle: 100,
    heroSubTitle: 200,
    ctaButtonText: 50,
    aboutText: 200,
    productTitle: 100,
    productName: 100,
    productType: 100,
    productDescription: 200,
    galleryTitle: 100,
    testimonialTitle: 100,
    testimonialName: 100,
    testimonialJobPosition: 100,
    testimonialTestimony: 200,
    contactTitle: 100,
    mapUrl: 2048,
    websiteEmail: 100,
    phone: 30,
    address: 200,
    registeredCompanyName: 100,
    copyrightText: 200,
  };
  const getHelperText = (error, value, limit) =>
    error || (limit ? `${(value || "").length}/${limit}` : undefined);

  useEffect(() => {
    const fetchWorkspaceSettings = async () => {
      try {
        const res = await axios.get("/api/workspaces/settings");
        const businessName = String(
          res?.data?.data?.settings?.profile?.businessName || "",
        ).trim();
        setWorkspaceBusinessName(businessName);
      } catch (error) {
        setWorkspaceBusinessName("");
      }
    };

    fetchWorkspaceSettings();
  }, [axios, auth?.user?.primaryWorkspace]);

  useEffect(() => {
    const fetchHostCompanyIdentity = async () => {
      try {
        const res = await axios.get("/api/workspaces/host-company");
        setHostCompanyIdentity(res?.data?.data || null);
      } catch (error) {
        setHostCompanyIdentity(null);
      }
    };

    fetchHostCompanyIdentity();
  }, [axios, auth?.user?.primaryWorkspace]);

  useEffect(() => {
    if (prefillCompanyId || prefillCompanyName) {
      reset({
        ...getValues(),
        companyId: prefillCompanyId,
        companyName: prefillCompanyName,
      });
    }
  }, [prefillCompanyId, prefillCompanyName, reset, getValues]);

  useEffect(() => {
    if (prefillCompanyId) {
      setValue("companyId", prefillCompanyId, {
        shouldDirty: false,
        shouldTouch: false,
      });
    }
    if (prefillCompanyName) {
      setValue("companyName", prefillCompanyName, {
        shouldDirty: false,
        shouldTouch: false,
      });
    }
  }, [prefillCompanyId, prefillCompanyName, setValue]);

  useEffect(() => {
    const checkExistingWebsite = async () => {
      try {
        const response = await axios.get("/api/editor/get-websites", {
          params: { vertical: selectedVertical },
        });
        const templates = Array.isArray(response?.data) ? response.data : [];
        const found = templates.find((item) => {
          const itemCompanyId = String(item?.companyId || "").trim();
          const itemCompanyName = String(item?.companyName || "").trim().toLowerCase();
          const itemVertical = normalizeVerticalKey(item?.vertical || item?.verticalType);
          if (itemVertical !== selectedVertical) return false;
          if (prefillCompanyId) {
            return itemCompanyId === String(prefillCompanyId).trim();
          }
          return (
            !itemCompanyId &&
            prefillCompanyName &&
            itemCompanyName === String(prefillCompanyName).trim().toLowerCase()
          );
        });

        if (found) {
          const websiteSlug = found.searchKey || found.companyName || "";
          navigate(
            `${builderBasePath}/edit-website/${encodeURIComponent(websiteSlug)}?vertical=${encodeURIComponent(selectedVertical)}`,
            { replace: true, state: { searchKey: websiteSlug, vertical: selectedVertical } },
          );
          return;
        }
      } catch (error) {
        // no-op: show create flow when lookup fails
      } finally {
        setIsCheckingExistingWebsite(false);
      }
    };

    if (prefillCompanyId || prefillCompanyName) {
      checkExistingWebsite();
    } else {
      setIsCheckingExistingWebsite(false);
    }
  }, [
    axios,
    navigate,
    builderBasePath,
    prefillCompanyId,
    prefillCompanyName,
    selectedVertical,
    auth?.user?.primaryWorkspace,
  ]);

  useEffect(() => {
    const fetchCredits = async () => {
      if (!workspaceId) return;
      try {
        const res = await axios.get(`/api/subscription/${workspaceId}`, {
          headers: {
            Authorization: `Bearer ${auth?.accessToken || ""}`,
          },
        });
        setCreditsRemaining(Number(res?.data?.creditsRemaining ?? 5));
        setCreditsUsed(Number(res?.data?.creditsUsed ?? 0));
        setCreditsLimit(Number(res?.data?.creditsLimit ?? 5));
        setCreditsResetDate(res?.data?.creditsResetDate || null);
      } catch (error) {
        setCreditsRemaining(5);
        setCreditsUsed(0);
        setCreditsLimit(5);
        setCreditsResetDate(null);
      }
    };

    fetchCredits();
  }, [axios, workspaceId]);

  const {
    fields: aboutFields,
    append: appendAbout,
    remove: removeAbout,
  } = useFieldArray({ control, name: "about" });

  const {
    fields: productFields,
    append: appendProduct,
    remove: removeProduct,
  } = useFieldArray({ control, name: "products" });

  const {
    fields: testimonialFields,
    append: appendTestimonial,
    remove: removeTestimonial,
  } = useFieldArray({ control, name: "testimonials" });

  const submitCreateWebsite = (values, e) => {
    const selectedVertical = localStorage.getItem("selectedVertical") || "co-working";
    console.log("SUBMITTING WITH VERTICAL:", selectedVertical);

    const normalizeMapUrl = (rawValue) => {
      const raw = String(rawValue || "").trim();
      if (!raw) return "";
      const iframeSrc = raw.match(/src=["']([^"']+)["']/i)?.[1];
      return (iframeSrc || raw).trim().replace(/&amp;/g, "&");
    };

    const finalCompanyName = String(
      values.companyName ||
        prefillCompanyName ||
        workspaceBusinessName ||
        hostCompanyIdentity?.companyName ||
        selectedCompany?.companyName ||
        auth?.user?.companyName ||
        "",
    ).trim();
    if (!finalCompanyName) {
      toast.error("Please provide the company name.");
      return;
    }

    const formEl = e?.target || formRef.current;
    const fd = new FormData(formEl);

    // Replace structured arrays with JSON
    const productsMeta = (values.products || []).map((p) => ({
      type: p.type,
      name: p.name,
      subtitle: p.subtitle,
      cost: p.cost,
      description: p.description,
    }));
    const testimonialsMeta = (values.testimonials || []).map((t) => ({
      name: t.name,
      jobPosition: t.jobPosition,
      testimony: t.testimony,
      rating: Number(t.rating) || 0,
    }));
    fd.set("about", JSON.stringify(values.about.map((p) => p.text)));
    fd.set("testimonials", JSON.stringify(testimonialsMeta));
    if (selectedVertical === "cafe") {
      fd.set("menuItems", JSON.stringify(values.menuItems || []));
      fd.set("products", JSON.stringify([]));
      fd.set("rooms", JSON.stringify([]));
      fd.set("packages", JSON.stringify([]));
      fd.set("dorms", JSON.stringify([]));
    } else if (selectedVertical === "co-living" || selectedVertical === "meeting-rooms") {
      fd.set("rooms", JSON.stringify(values.rooms || []));
      fd.set("products", JSON.stringify([]));
      fd.set("menuItems", JSON.stringify([]));
      fd.set("packages", JSON.stringify([]));
      fd.set("dorms", JSON.stringify([]));
    } else if (selectedVertical === "workation") {
      fd.set("packages", JSON.stringify(values.packages || []));
      fd.set("products", JSON.stringify([]));
      fd.set("menuItems", JSON.stringify([]));
      fd.set("rooms", JSON.stringify([]));
      fd.set("dorms", JSON.stringify([]));
    } else if (selectedVertical === "hostel") {
      fd.set("dorms", JSON.stringify(values.dorms || []));
      fd.set("products", JSON.stringify([]));
      fd.set("menuItems", JSON.stringify([]));
      fd.set("rooms", JSON.stringify([]));
      fd.set("packages", JSON.stringify([]));
    } else {
      fd.set("products", JSON.stringify(productsMeta));
      fd.set("menuItems", JSON.stringify([]));
      fd.set("rooms", JSON.stringify([]));
      fd.set("packages", JSON.stringify([]));
      fd.set("dorms", JSON.stringify([]));
    }

    for (const key of Array.from(fd.keys())) {
      if (/^(products|testimonials)\.\d+\./.test(key)) fd.delete(key);
    }

    fd.set("about", JSON.stringify(values.about.map((p) => p.text)));
    fd.append("companyLogo", values.companyLogo);

    fd.delete("heroImages");
    (values.heroImages || []).forEach((file) => fd.append("heroImages", file));

    fd.delete("gallery");
    (values.gallery || []).forEach((file) => fd.append("gallery", file));

    fd.delete("productImages");
    if (selectedVertical === "cafe") {
      (values.menuItems || []).forEach((item, i) => {
        if (item?.image) fd.append(`productImages_${i}`, item.image);
      });
    } else if (selectedVertical === "co-living" || selectedVertical === "meeting-rooms") {
      (values.rooms || []).forEach((room, i) => {
        (room?.images || []).forEach((f) => fd.append(`productImages_${i}`, f));
      });
    } else if (selectedVertical === "workation") {
      (values.packages || []).forEach((pkg, i) => {
        (pkg?.images || []).forEach((f) => fd.append(`productImages_${i}`, f));
      });
    } else if (selectedVertical === "hostel") {
      (values.dorms || []).forEach((dorm, i) => {
        (dorm?.images || []).forEach((f) => fd.append(`productImages_${i}`, f));
      });
    } else {
      (values.products || []).forEach((p, i) => {
        (p.files || []).forEach((f) => fd.append(`productImages_${i}`, f));
      });
    }

    fd.delete("testimonialImages");
    (values.testimonials || []).forEach((t, i) => {
      if (t?.file) fd.append(`testimonialImages_${i}`, t.file);
    });

    // ✅ Add companyId here
    fd.set("companyName", finalCompanyName);
    fd.set("companyId", values.companyId || prefillCompanyId || "");
    fd.append("workspaceId", workspaceId || "");
    fd.set("vertical", selectedVertical);
    fd.set("verticalType", selectedVertical);
    fd.set("mapUrl", normalizeMapUrl(values.mapUrl));
    if (!String(values.registeredCompanyName || "").trim()) {
      fd.set("registeredCompanyName", finalCompanyName);
    }

    // const srcFromIframe = raw.match(/src=["']([^"']+)["']/i)?.[1];
    // const srcUrl = values.mapUrl.split(" ")[1].split(" ")[1];
    // values.mapUrl = srcUrl;
    // console.log("src", srcUrl);

    createWebsite(fd);
  };

  const { mutate: createWebsite, isLoading: isCreateWebsiteLoading } =
    useMutation({
      mutationKey: ["create-website"],
      mutationFn: async (fd) => {
        console.log("FORMDATA VERTICAL:", fd.get("vertical"));
        const res = await axios.post("/api/editor/create-website", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
      },
      onSuccess: async (data) => {
        setIsRedirectingAfterCreate(true);
        const createdTemplateId = String(data?.template?._id || "").trim();
        const resolvedWorkspaceId = String(
          workspaceId || data?.template?.workspaceId || "",
        ).trim();
        let publishSucceeded = false;
        if (createdTemplateId && resolvedWorkspaceId) {
          try {
            await axios.post("/api/editor/publish-website", {
              workspaceId: resolvedWorkspaceId,
              websiteId: createdTemplateId,
            });
            publishSucceeded = true;
          } catch (publishError) {
            toast.error(
              publishError?.response?.data?.message ||
                "Website created, but publish failed.",
            );
          }
        }
        if (publishSucceeded) {
          toast.success("Website created and published successfully");
        } else {
          toast.success("Website created successfully");
        }
        window.dispatchEvent(new Event("credits:refresh"));
        const createdSearchKey = String(data?.template?.searchKey || "").trim();
        const nextSearchKey = createdSearchKey || toSearchKey(prefillCompanyName);
        navigate(
          `${builderBasePath}/edit-website/${encodeURIComponent(nextSearchKey)}?vertical=${encodeURIComponent(selectedVertical)}`,
          { state: { searchKey: nextSearchKey, vertical: selectedVertical } },
        );
      },
      onError: (err) => {
        setIsRedirectingAfterCreate(false);
        if (err?.response?.status === 403 && err?.response?.data?.error === "no_credits_remaining") {
          const resetDate = err?.response?.data?.resetDate
            ? new Date(err.response.data.resetDate).toLocaleDateString()
            : "-";
          toast.error(
            `You've used all 5 credits for this month. Your credits reset on ${resetDate}.`,
          );
          return;
        }
        toast.error(err?.response?.data?.message || "Failed to create website");
        console.log(err?.response?.data?.message || err.message);
      },
    });

  const handleReset = () => {
    const node = formRef.current;
    node && node.reset();
    reset();
  };

  const resetFormToEmpty = () => {
    formRef.current?.reset(); // clears native file inputs

    reset({
      companyId: prefillCompanyId,
      companyName: prefillCompanyName,

      title: "",
      subTitle: "",
      CTAButtonText: "",
      companyLogo: null,
      heroImages: [],
      gallery: [],

      about: [{ text: "" }],

      productTitle: "",
      products: [defaultProduct],

      galleryTitle: "",

      testimonialTitle: "",
      testimonials: [defaultTestimonial],

      contactTitle: "",
      mapUrl: "",
      websiteEmail: "",
      phone: "",
      address: "",

      registeredCompanyName: "",
      copyrightText: "",
    });
  };

  const daysLeftForRenew = creditsResetDate
    ? Math.max(0, Math.floor((() => {
        const reset = new Date(creditsResetDate);
        const now = new Date();
        const resetStart = new Date(
          reset.getFullYear(),
          reset.getMonth(),
          reset.getDate(),
          0,
          0,
          0,
          0,
        );
        const nowStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0,
        );
        return (resetStart.getTime() - nowStart.getTime()) / (1000 * 60 * 60 * 24);
      })()))
    : "-";
  const creditResetText = creditsResetDate
    ? (() => {
        const d = new Date(creditsResetDate);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}, 12:00 AM`;
      })()
    : "-";

  if (isCheckingExistingWebsite) {
    return (
      <div className="p-4 flex items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="pb-2">
      <div className="p-4 flex flex-col gap-4">
        <PageFrame>
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-title font-pmedium text-primary uppercase">
                Create Website
              </h2>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                {selectedVerticalBadgeText}
              </span>
            </div>

            <form
              ref={formRef}
              encType="multipart/form-data"
              onSubmit={(e) => e.preventDefault()}
            >
          <div className="md:grid grid-cols-2 sm:grid-cols-1 md:grid-cols-2 gap-4">
            {/* HERO / COMPANY */}
            {activeSections.includes("hero") && (
            <div>
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">Hero Section</span>
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="companyName"
                  control={control}
                  rules={{ required: "Company name is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Company Name"
                      fullWidth
                      InputProps={{ readOnly: true }}
                      helperText={errors?.companyName?.message}
                      error={!!errors.companyName}
                    />
                  )}
                />

                <Controller
                  name="title"
                  control={control}
                  // rules={{ required: "Title is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Hero Title"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.heroTitle }}
                      helperText={getHelperText(
                        errors?.title?.message,
                        values?.title,
                        CHAR_LIMITS.heroTitle,
                      )}
                      error={!!errors.title}
                    />
                  )}
                />
                <Controller
                  name="subTitle"
                  control={control}
                  // rules={{ required: "Sub Title is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Hero Sub Title"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.heroSubTitle }}
                      helperText={getHelperText(
                        errors?.subTitle?.message,
                        values?.subTitle,
                        CHAR_LIMITS.heroSubTitle,
                      )}
                      error={!!errors.subTitle}
                    />
                  )}
                />
                <Controller
                  name="CTAButtonText"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="CTA Button Text"
                      placeholder={ctaPlaceholder}
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.ctaButtonText }}
                      helperText={getHelperText(
                        errors?.CTAButtonText?.message,
                        values?.CTAButtonText,
                        CHAR_LIMITS.ctaButtonText,
                      )}
                    />
                  )}
                />

                {/* companyLogo (single) */}

                <Controller
                  name="companyLogo"
                  control={control}
                  render={({ field }) => (
                    <UploadFileInput
                      id="companyLogo"
                      value={field.value}
                      label="Company Logo"
                      onChange={field.onChange}
                    />
                  )}
                />

                {/* heroImages (multiple) */}
                <Controller
                  name="heroImages"
                  control={control}
                  render={({ field }) => (
                    <UploadMultipleFilesInput
                      {...field}
                      name="heroImages" // important so FormData picks the files
                      label="Carousel Images"
                      maxFiles={5}
                      allowedExtensions={["jpg", "jpeg", "png", "pdf", "webp"]}
                      id="heroImages"
                    />
                  )}
                />
              </div>
            </div>
            )}

            {/* ABOUT */}
            {/* <div>
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">About</span>
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="about"
                  control={control}
                  rules={{ required: "About is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="About"
                      fullWidth
                      multiline
                      minRows={3}
                      helperText={errors?.about?.message}
                      error={!!errors.about}
                    />
                  )}
                />
              </div>
            </div> */}

            {/* ABOUT */}
            {activeSections.includes("about") && (
            <div>
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">About</span>
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                {aboutFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-xl border border-borderGray p-4 mb-3"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-pmedium">Para #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeAbout(index)}
                        className="text-sm text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                    <Controller
                      name={`about.${index}.text`}
                      control={control}
                      // rules={{ required: "About paragraph is required" }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          size="small"
                          label="About Paragraph"
                          fullWidth
                          multiline
                          minRows={3}
                          inputProps={{ maxLength: CHAR_LIMITS.aboutText }}
                          helperText={getHelperText(
                            errors?.about?.[index]?.text?.message,
                            values?.about?.[index]?.text,
                            CHAR_LIMITS.aboutText,
                          )}
                          error={!!errors?.about?.[index]?.text}
                        />
                      )}
                    />
                  </div>
                ))}
                <div>
                  <button
                    type="button"
                    onClick={() => appendAbout({ text: "" })}
                    className="text-sm text-primary"
                  >
                    + Add Para
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* PRODUCTS */}
            {selectedVertical === "co-working" && (
            <div className="col-span-2">
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">Products</span>
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="productTitle"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label={sectionTitles[selectedVertical] || "Products Section Title"}
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.productTitle }}
                      helperText={getHelperText(
                        errors?.productTitle?.message,
                        values?.productTitle,
                        CHAR_LIMITS.productTitle,
                      )}
                    />
                  )}
                />

                {productFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-xl border border-borderGray p-4 mb-3"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-pmedium">Product {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeProduct(index)}
                        className="text-sm text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Controller
                        name={`products.${index}.name`}
                        control={control}
                        // rules={{ required: "Name is required" }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            label="Product Name"
                            fullWidth
                            inputProps={{ maxLength: CHAR_LIMITS.productName }}
                            helperText={getHelperText(
                              errors?.products?.[index]?.name?.message,
                              values?.products?.[index]?.name,
                              CHAR_LIMITS.productName,
                            )}
                            error={!!errors?.products?.[index]?.name}
                          />
                        )}
                      />
                      <Controller
                        name={`products.${index}.type`}
                        control={control}
                        // rules={{ required: "Type is required" }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            label="Product Type"
                            fullWidth
                            inputProps={{ maxLength: CHAR_LIMITS.productType }}
                            helperText={getHelperText(
                              errors?.products?.[index]?.type?.message,
                              values?.products?.[index]?.type,
                              CHAR_LIMITS.productType,
                            )}
                            error={!!errors?.products?.[index]?.type}
                          />
                        )}
                      />

                      <Controller
                        name={`products.${index}.description`}
                        control={control}
                        // rules={{ required: "Description is required" }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            label="Product Description"
                            fullWidth
                            // multiline
                            // minRows={3}
                            inputProps={{
                              maxLength: CHAR_LIMITS.productDescription,
                            }}
                            helperText={getHelperText(
                              errors?.products?.[index]?.description?.message,
                              values?.products?.[index]?.description,
                              CHAR_LIMITS.productDescription,
                            )}
                            error={!!errors?.products?.[index]?.description}
                          />
                        )}
                      />

                      <Controller
                        name={`products.${index}.cost`}
                        control={control}
                        // rules={{ required: "Cost is required" }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            label="Product Cost"
                            fullWidth
                            helperText={
                              errors?.products?.[index]?.cost?.message
                            }
                            error={!!errors?.products?.[index]?.cost}
                          />
                        )}
                      />
                    </div>
                    {/* productImages_${index} (multiple) */}
                    <div className="pt-4">
                      <Controller
                        name={`products.${index}.files`}
                        control={control}
                        render={({ field }) => (
                          <UploadMultipleFilesInput
                            {...field}
                            label="Product Images"
                            maxFiles={10}
                            allowedExtensions={[
                              "jpg",
                              "jpeg",
                              "png",
                              "webp",
                              "pdf",
                            ]}
                            id={`products.${index}.files`}
                          />
                        )}
                      />
                    </div>
                  </div>
                ))}

                <div>
                  <button
                    type="button"
                    onClick={() => appendProduct({ ...defaultProduct })}
                    className="text-sm text-primary"
                  >
                    + Add Product
                  </button>
                </div>
              </div>
            </div>
            )}
            {selectedVertical === "co-living" && (
              <RoomsSection
                control={control}
                register={register}
                priceLabel="Price per night"
              />
            )}
            {selectedVertical === "workation" && (
              <PackagesSection control={control} register={register} />
            )}
            {selectedVertical === "hostel" && (
              <DormsSection control={control} register={register} />
            )}
            {selectedVertical === "meeting-rooms" && (
              <RoomsSection
                control={control}
                register={register}
                priceLabel="Price per hour"
              />
            )}
            {selectedVertical === "cafe" && (
              <MenuSection control={control} register={register} />
            )}

            {/* GALLERY */}
            {activeSections.includes("gallery") && (
            <div>
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">Gallery</span>
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="galleryTitle"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Gallery Section Title"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.galleryTitle }}
                      helperText={getHelperText(
                        errors?.galleryTitle?.message,
                        values?.galleryTitle,
                        CHAR_LIMITS.galleryTitle,
                      )}
                    />
                  )}
                />

                <Controller
                  name="gallery"
                  control={control}
                  render={({ field }) => (
                    <UploadMultipleFilesInput
                      {...field}
                      name="gallery"
                      label="Gallery Images"
                      maxFiles={40}
                      allowedExtensions={["jpg", "jpeg", "png", "pdf", "webp"]}
                      id="gallery"
                    />
                  )}
                />
              </div>
            </div>
            )}

            {/* TESTIMONIALS */}
            {activeSections.includes("testimonials") && (
            <div className="col-span-2">
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">Testimonials</span>
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="testimonialTitle"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Testimonials Section Title"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.testimonialTitle }}
                      helperText={getHelperText(
                        errors?.testimonialTitle?.message,
                        values?.testimonialTitle,
                        CHAR_LIMITS.testimonialTitle,
                      )}
                    />
                  )}
                />

                {testimonialFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-xl border border-borderGray p-4 mb-3"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-pmedium">
                        Testimonial #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTestimonial(index)}
                        className="text-sm text-red-600"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Controller
                        name={`testimonials.${index}.name`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            label="Name"
                            fullWidth
                            inputProps={{
                              maxLength: CHAR_LIMITS.testimonialName,
                            }}
                            helperText={getHelperText(
                              errors?.testimonials?.[index]?.name?.message,
                              values?.testimonials?.[index]?.name,
                              CHAR_LIMITS.testimonialName,
                            )}
                            error={!!errors?.testimonials?.[index]?.name}
                          />
                        )}
                      />
                      <Controller
                        name={`testimonials.${index}.jobPosition`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            label="Job Position"
                            fullWidth
                            inputProps={{
                              maxLength: CHAR_LIMITS.testimonialJobPosition,
                            }}
                            helperText={getHelperText(
                              errors?.testimonials?.[index]?.jobPosition
                                ?.message,
                              values?.testimonials?.[index]?.jobPosition,
                              CHAR_LIMITS.testimonialJobPosition,
                            )}
                            error={!!errors?.testimonials?.[index]?.jobPosition}
                          />
                        )}
                      />
                      <Controller
                        name={`testimonials.${index}.rating`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            type="number"
                            size="small"
                            label="Rating (1-5)"
                            fullWidth
                            inputProps={{ min: 1, max: 5 }}
                            helperText={
                              errors?.testimonials?.[index]?.rating?.message
                            }
                            error={!!errors?.testimonials?.[index]?.rating}
                          />
                        )}
                      />
                      <Controller
                        name={`testimonials.${index}.testimony`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            size="small"
                            label="Testimony"
                            fullWidth
                            multiline
                            minRows={3}
                            inputProps={{
                              maxLength: CHAR_LIMITS.testimonialTestimony,
                            }}
                            helperText={getHelperText(
                              errors?.testimonials?.[index]?.testimony?.message,
                              values?.testimonials?.[index]?.testimony,
                              CHAR_LIMITS.testimonialTestimony,
                            )}
                            error={!!errors?.testimonials?.[index]?.testimony}
                          />
                        )}
                      />
                    </div>

                    {/* testimonialImages_${index} (single) */}
                    <Controller
                      name={`testimonials.${index}.file`}
                      control={control}
                      render={({ field }) => (
                        <UploadFileInput
                          value={field.value}
                          label="Testimonial Image"
                          onChange={field.onChange}
                          id={`testimonial-file-${index}`}
                        />
                      )}
                    />
                  </div>
                ))}

                <div>
                  <button
                    type="button"
                    onClick={() => appendTestimonial({ ...defaultTestimonial })}
                    className="text-sm text-primary"
                  >
                    + Add Testimonial
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* CONTACT */}
            {activeSections.includes("contact") && (
            <div>
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">Contact</span>
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="contactTitle"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Contact Section Title"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.contactTitle }}
                      helperText={getHelperText(
                        errors?.contactTitle?.message,
                        values?.contactTitle,
                        CHAR_LIMITS.contactTitle,
                      )}
                    />
                  )}
                />
                <Controller
                  name="mapUrl"
                  control={control}
                  // rules={{
                  //   required: "Map URL is required",
                  //   validate: (val) => {
                  //     const MAP_EMBED_REGEX =
                  //       /^https?:\/\/(www\.)?(google\.com|maps\.google\.com)\/maps\/embed(\/v1\/[a-z]+|\?pb=|\/?\?)/i;

                  //     const v = (val || "").trim();

                  //     // If they pasted a full iframe, fail validation (or you can auto-extract)
                  //     // if (/<\s*iframe/i.test(v)) {
                  //     //   return 'Paste only the "src" URL from the embed code (not the full <iframe>).';
                  //     // }

                  //     return (
                  //       MAP_EMBED_REGEX.test(v) ||
                  //       "Ewnter a valid Google Maps *embed* URL (e.g. https://www.google.com/maps/embed?pb=...)"
                  //     );
                  //   },
                  // }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      onChange={(e) => {
                        // Optional: auto-extract src if a whole iframe was pasted
                        const extractIframeSrc = (val = "") =>
                          val.match(/src=["']([^"']+)["']/i)?.[1] || val;
                        const raw = e.target.value;
                        const cleaned = extractIframeSrc(raw).trim();

                        field.onChange(cleaned);
                      }}
                      size="small"
                      label="Embed Map URL"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.mapUrl }}
                      helperText={getHelperText(
                        errors?.mapUrl?.message,
                        values?.mapUrl,
                        CHAR_LIMITS.mapUrl,
                      )}
                      error={!!errors.mapUrl}
                    />
                  )}
                />
                <Controller
                  name="websiteEmail"
                  control={control}
                  // rules={{ required: "Email is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Email"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.websiteEmail }}
                      helperText={getHelperText(
                        errors?.websiteEmail?.message,
                        values?.websiteEmail,
                        CHAR_LIMITS.websiteEmail,
                      )}
                      error={!!errors.websiteEmail}
                    />
                  )}
                />
                <Controller
                  name="phone"
                  control={control}
                  // rules={{ required: "Phone is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Phone"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.phone }}
                      helperText={getHelperText(
                        errors?.phone?.message,
                        values?.phone,
                        CHAR_LIMITS.phone,
                      )}
                      error={!!errors.phone}
                    />
                  )}
                />
                <Controller
                  name="address"
                  control={control}
                  // rules={{ required: "Address is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Address"
                      fullWidth
                      multiline
                      minRows={2}
                      inputProps={{ maxLength: CHAR_LIMITS.address }}
                      helperText={getHelperText(
                        errors?.address?.message,
                        values?.address,
                        CHAR_LIMITS.address,
                      )}
                      error={!!errors.address}
                    />
                  )}
                />
              </div>
            </div>
            )}

            {/* FOOTER */}
            {activeSections.includes("footer") && (
            <div>
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">Footer</span>
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="registeredCompanyName"
                  control={control}
                  // rules={{ required: "Registered company name is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Registered Company Name"
                      fullWidth
                      inputProps={{
                        maxLength: CHAR_LIMITS.registeredCompanyName,
                      }}
                      helperText={getHelperText(
                        errors?.registeredCompanyName?.message,
                        values?.registeredCompanyName,
                        CHAR_LIMITS.registeredCompanyName,
                      )}
                      error={!!errors.registeredCompanyName}
                    />
                  )}
                />
                <Controller
                  name="copyrightText"
                  control={control}
                  // rules={{ required: "Copyright text is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Copyright Text"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.copyrightText }}
                      helperText={getHelperText(
                        errors?.copyrightText?.message,
                        values?.copyrightText,
                        CHAR_LIMITS.copyrightText,
                      )}
                      error={!!errors.copyrightText}
                    />
                  )}
                />
              </div>
            </div>
            )}
          </div>

              {/* Submit / Reset */}
              <div className="flex justify-center mb-3">
                {workspaceId ? <CreditsIndicator workspaceId={workspaceId} /> : null}
              </div>
              <div className="flex items-center justify-center gap-4">
                <PrimaryButton
                  type="button"
                  title={"Submit"}
                  onClick={() => setShowConfirmPopup(true)}
                  isLoading={isCreateWebsiteLoading}
                  disabled={isCreateWebsiteLoading || isRedirectingAfterCreate}
                />
                <button
                  type="button"
                  onClick={resetFormToEmpty}
                  className="px-6 py-2 bg-gray-200 text-black rounded-md"
                >
                  Reset
                </button>
              </div>
            </form>

            <Dialog
              open={showConfirmPopup}
              onClose={() => {
                if (!isCreateWebsiteLoading && !isRedirectingAfterCreate) setShowConfirmPopup(false);
              }}
              fullWidth
              maxWidth="sm"
              PaperProps={{
                sx: { borderRadius: 3, overflow: "hidden" },
              }}
            >
              <DialogTitle sx={{ pb: 1 }}>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-slate-900">
                    Confirm Website Creation
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    First Time Free
                  </span>
                </div>
              </DialogTitle>
              <DialogContent>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">
                    Your website will be created for {selectedVerticalLabel}. This
                    vertical cannot be changed later. Do you want to continue?
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    First-time website creation is free. Credits are charged only when
                    you submit updates from the Edit Website page.
                  </p>
                </div>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button
                  onClick={() => setShowConfirmPopup(false)}
                  disabled={isCreateWebsiteLoading || isRedirectingAfterCreate}
                  sx={{
                    borderRadius: "6px",
                    textTransform: "none",
                    px: 3,
                    py: 1,
                    backgroundColor: "#e5e7eb",
                    color: "#111111",
                    "&:hover": {
                      backgroundColor: "#d1d5db",
                    },
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  disabled={isCreateWebsiteLoading || isRedirectingAfterCreate}
                  sx={{
                    borderRadius: "6px",
                    textTransform: "none",
                    px: 3,
                    py: 1,
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    "&:hover": {
                      backgroundColor: "#1d4ed8",
                    },
                  }}
                  onClick={() => {
                    if (isCreateWebsiteLoading || isRedirectingAfterCreate) return;
                    setShowConfirmPopup(false);
                    void handleSubmit((values, e) => {
                      submitCreateWebsite(values, e);
                    })();
                  }}
                >
                  {isCreateWebsiteLoading ? "Submitting..." : "Confirm & Create"}
                </Button>
              </DialogActions>
            </Dialog>
          </div>
        </PageFrame>
      </div>
    </div>
  );
};

export default CreateWebsite;



