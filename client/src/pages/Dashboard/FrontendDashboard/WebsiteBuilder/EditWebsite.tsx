// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import {
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import PrimaryButton from "../../../../components/PrimaryButton";
import SecondaryButton from "../../../../components/SecondaryButton";
import { toast } from "sonner";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import { useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import useAuth from "../../../../hooks/useAuth";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import UploadMultipleFilesInput from "../../../../components/UploadMultipleFilesInput";
import UploadFileInput from "../../../../components/UploadFileInput";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FiTrash2, FiX } from "react-icons/fi";
import PageFrame from "../../../../components/Pages/PageFrame";
import CreditsIndicator from "../../../../components/CreditsIndicator";

dayjs.extend(customParseFormat);

const defaultProduct = {
  _id: null,
  type: "",
  name: "",
  cost: "",
  description: "",
  images: [],
  files: [], // File[] to append
};

const defaultTestimonial = {
  _id: null,
  name: "",
  jobPosition: "",
  testimony: "",
  rating: 5,
  image: null,
  file: null, // File to add/replace
};

const fileUrl = (file) => (file ? URL.createObjectURL(file) : "");

const EditWebsite = () => {
  const axios = useAxiosPrivate();
  const { state } = useLocation();
  const formRef = useRef(null);
  const tenant = "spring";
  const { auth } = useAuth();
  const selectedCompany = useSelector((state) => state.company.selectedCompany);
  const workspaceId =
    selectedCompany?.workspaceId ||
    auth?.user?.primaryWorkspace ||
    auth?.user?.workspaceId;
  const [creditsRemaining, setCreditsRemaining] = useState(5);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsLimit, setCreditsLimit] = useState(5);
  const [creditsResetDate, setCreditsResetDate] = useState(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [pendingSubmitValues, setPendingSubmitValues] = useState(null);
  // const website = useSelector((state) => state.company.selectedCompany);
  //  const tpl = website || "";
  //  const isLoading = state.isLoading || false;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      companyName: "",
      title: "",
      subTitle: "",
      CTAButtonText: "",
      about: [],
      productTitle: "",
      galleryTitle: "",
      testimonialTitle: "",
      contactTitle: "",
      mapUrl: "",
      email: "",
      phone: "",
      address: "",
      registeredCompanyName: "",
      copyrightText: "",

      companyLogoExisting: null,
      heroImagesExisting: [],
      galleryExisting: [],
      products: [defaultProduct],
      testimonials: [defaultTestimonial],

      // NEW: deletion queues
      deletedHeroImageIds: [],
      deletedGalleryImageIds: [],
      deletedProductImages: [], // [{ productId, imageId }]
      deletedTestimonialImageIds: [], // [imageId]
    },
  });

  const { website } = useParams();

  const formatCompanyName = (name) => {
    if (!name) return "";
    return name.toLowerCase().split("-")[0].replace(/\s+/g, "");
  };

  const { data: tpl, isLoading } = useQuery({
    queryKey: ["website-data", website],
    queryFn: async () => {
      const formatted = formatCompanyName(website);
      const res = await axios.get(`/api/editor/get-website/${formatted}`);
      return res.data;
    },
  });

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
    fields: productFields,
    append: appendProduct,
    remove: removeProduct,
  } = useFieldArray({ control, name: "products" });

  const {
    fields: testimonialFields,
    append: appendTestimonial,
    remove: removeTestimonial,
  } = useFieldArray({ control, name: "testimonials" });

  const {
    fields: aboutFields,
    append: appendAbout,
    remove: removeAbout,
  } = useFieldArray({ control, name: "about" });

  // queue delete of an existing image (works for arrays or single-object fields)
  const queueDelete = (pathExisting, pathDeletedIds, img) => {
    const current = watch(pathExisting);
    const deleted = new Set([...(watch(pathDeletedIds) || [])]);

    if (Array.isArray(current)) {
      // array field (heroImagesExisting, galleryExisting, products[i].images)
      const nextExisting = current.filter((x) => x?.id !== img?.id);
      setValue(pathExisting, nextExisting, { shouldDirty: true });
    } else if (current && typeof current === "object") {
      // single object field (testimonials[i].image)
      setValue(pathExisting, null, { shouldDirty: true });
    }

    if (img?.id) {
      deleted.add(img.id);
      setValue(pathDeletedIds, Array.from(deleted), { shouldDirty: true });
    }
  };

  // remove one newly selected file from a multi-file field (hero, gallery, product.files)
  const removeNewFileAt = (pathFiles, idx) => {
    const next = [...(watch(pathFiles) || [])];
    next.splice(idx, 1);
    setValue(pathFiles, next, { shouldDirty: true });
  };

  // 3) Load template -> form
  useEffect(() => {
    if (isLoading || !tpl) return;

    reset({
      companyName: tpl?.companyName ?? "",
      title: tpl?.title ?? "",
      subTitle: tpl?.subTitle ?? "",
      CTAButtonText: tpl?.CTAButtonText ?? "",

      about:
        Array.isArray(tpl?.about) && tpl.about.length
          ? tpl.about.map((para) => ({ text: para }))
          : [{ text: "" }],

      productTitle: tpl?.productTitle ?? "",
      galleryTitle: tpl?.galleryTitle ?? "",
      testimonialTitle: tpl?.testimonialTitle ?? "",
      contactTitle: tpl?.contactTitle ?? "",
      mapUrl: tpl?.mapUrl ?? "",
      email: tpl?.email ?? "",
      phone: tpl?.phone ?? "",
      address: tpl?.address ?? "",
      registeredCompanyName: tpl?.registeredCompanyName ?? "",
      copyrightText: tpl?.copyrightText ?? "",

      // safely handle logo & images
      companyLogoExisting: tpl?.companyLogo ?? null,
      heroImagesExisting: Array.isArray(tpl?.heroImages) ? tpl.heroImages : [],
      galleryExisting: Array.isArray(tpl?.gallery) ? tpl.gallery : [],

      companyLogo: null,
      heroImages: [],
      gallery: [],

      products:
        Array.isArray(tpl?.products) && tpl.products.length
          ? tpl.products.map((p) => ({
              _id: p?._id ?? null,
              type: p?.type ?? "",
              name: p?.name ?? "",
              cost: p?.cost ?? "",
              description: p?.description ?? "",
              images: Array.isArray(p?.images) ? p.images : [],
              files: [],
            }))
          : [defaultProduct],

      testimonials:
        Array.isArray(tpl?.testimonials) && tpl.testimonials.length
          ? tpl.testimonials.map((t) => ({
              _id: t?._id ?? null,
              name: t?.name ?? "",
              jobPosition: t?.jobPosition ?? "",
              testimony: t?.testimony ?? "",
              rating: t?.rating ?? 5,
              image: t?.image ?? null, // backend didn’t return image → safe null
              file: null,
            }))
          : [defaultTestimonial],
    });
  }, [tpl, isLoading, reset]);

  const values = watch();
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
    mapUrl: 200,
    email: 100,
    phone: 30,
    address: 200,
    registeredCompanyName: 100,
    copyrightText: 200,
  };
  const getHelperText = (error, value, limit) =>
    error || (limit ? `${(value || "").length}/${limit}` : undefined);

  // 4) Submit -> FormData for /api/editor/edit-template
  const { mutate: updateTemplate, isPending: isUpdating } = useMutation({
    mutationKey: ["website-update", tenant],
    mutationFn: async (fd) => {
      const res = await axios.patch(`/api/editor/edit-website`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Website updated successfully");
      setCreditsRemaining((prev) => Math.max(0, prev - 1));
    },
    onError: (err) => {
      if (err?.response?.status === 403 && err?.response?.data?.error === "no_credits_remaining") {
        const resetDate = err?.response?.data?.resetDate
          ? new Date(err.response.data.resetDate).toLocaleDateString()
          : "-";
        toast.error(
          `You've used all 5 credits for this month. Your credits reset on ${resetDate}.`,
        );
        return;
      }
      toast.error(err?.response?.data?.message || "Update failed");
    },
  });

  const submitWebsiteUpdate = (vals) => {
    const fd = new FormData();
    fd.append("workspaceId", workspaceId || "");

    // text fields used by server (companyName builds searchKey)
    fd.append(
      "companyName",
      vals.companyName || selectedCompany?.companyName || auth?.user?.companyName || "",
    );
    fd.append("title", vals.title || "");
    fd.append("subTitle", vals.subTitle || "");
    fd.append("CTAButtonText", vals.CTAButtonText || "");

    fd.append("productTitle", vals.productTitle || "");
    fd.append("galleryTitle", vals.galleryTitle || "");
    fd.append("testimonialTitle", vals.testimonialTitle || "");
    fd.append("contactTitle", vals.contactTitle || "");
    fd.append("mapUrl", vals.mapUrl || "");
    fd.append("email", vals.email || "");
    fd.append("phone", vals.phone || "");
    fd.append("address", vals.address || "");
    fd.append("registeredCompanyName", vals.registeredCompanyName || "");
    fd.append("copyrightText", vals.copyrightText || "");

    // NEW: keep-lists for hero & gallery (computed from remaining existing arrays)
    fd.append("about", JSON.stringify(vals.about.map((a) => a.text)));
    const heroKeepIds = (vals.heroImagesExisting || []).map((x) => x.id);
    const galleryKeepIds = (vals.galleryExisting || []).map((x) => x.id);
    fd.append("heroImageIds", JSON.stringify(heroKeepIds));
    fd.append("galleryImageIds", JSON.stringify(galleryKeepIds));

    // JSON payloads (keep _id for merge-by-id)
    // NEW: include imageIds for each product from its remaining existing images
    const productsMeta = (vals.products || []).map((p) => ({
      _id: p._id || undefined,
      type: p.type,
      name: p.name,
      cost: p.cost,
      description: p.description,
      imageIds: (p.images || []).map((img) => img.id), // NEW
    }));

    // NEW: include imageId for each testimonial (null if no image should be kept)
    const testimonialsMeta = (vals.testimonials || []).map((t) => ({
      _id: t._id || undefined,
      name: t.name,
      jobPosition: t.jobPosition,
      testimony: t.testimony,
      rating: Number(t.rating) || 0,
      imageId: t.image?.id ?? null, // NEW
    }));

    fd.append(
      "companyLogoId",
      JSON.stringify(vals.companyLogoExisting?.id ?? null),
    );
    fd.append("products", JSON.stringify(productsMeta));
    fd.append("testimonials", JSON.stringify(testimonialsMeta));

    // files: logo (replace), hero/gallery (append)
    if (vals.companyLogo) fd.append("companyLogo", vals.companyLogo);
    (vals.heroImages || []).forEach((f) => fd.append("heroImages", f));
    (vals.gallery || []).forEach((f) => fd.append("gallery", f));

    // --- Map product images by FINAL index ---
    const existingProducts = tpl?.products || [];
    const idxById = new Map(existingProducts.map((p, i) => [String(p._id), i]));
    const baseLen = existingProducts.length;
    let newCounter = 0;

    (vals.products || []).forEach((p) => {
      const files = p.files || [];
      if (!files.length) return;

      let targetIndex;
      if (p._id && idxById.has(String(p._id))) {
        targetIndex = idxById.get(String(p._id));
      } else {
        targetIndex = baseLen + newCounter;
        newCounter++;
      }

      files.forEach((file) => {
        fd.append(`productImages_${targetIndex}`, file);
      });
    });

    // --- Map testimonial image by FINAL index ---
    const existingTestimonials = tpl?.testimonials || [];
    const tIdxById = new Map(
      existingTestimonials.map((t, i) => [String(t._id), i]),
    );
    const tBaseLen = existingTestimonials.length;
    let tNewCounter = 0;

    (vals.testimonials || []).forEach((t) => {
      const file = t.file;
      if (!file) return;

      let targetIndex;
      if (t._id && tIdxById.has(String(t._id))) {
        targetIndex = tIdxById.get(String(t._id));
      } else {
        targetIndex = tBaseLen + tNewCounter;
        tNewCounter++;
      }

      fd.append(`testimonialImages_${targetIndex}`, file);
    });

    updateTemplate(fd);
  };

  const onSubmit = (vals) => {
    setPendingSubmitValues(vals);
    setConfirmSubmitOpen(true);
  };

  const handleReset = () => {
    // const node = formRef.current;
    // node && node.reset();
    // if (tpl) {
    //   // re-run the reset with tpl to restore server state
    //   const evt = new Event("reset", { bubbles: true });
    //   node.dispatchEvent(evt);
    // }
    reset();
  };

  const resetFormToEmpty = () => {
    const currentCompanyName = watch("companyName"); // keep original

    formRef.current?.reset(); // clears native inputs like file fields

    reset({
      companyName: currentCompanyName, // <-- keep it
      title: "",
      subTitle: "",
      CTAButtonText: "",
      about: [{ text: "" }],

      productTitle: "",
      galleryTitle: "",
      testimonialTitle: "",
      contactTitle: "",
      mapUrl: "",
      email: "",
      phone: "",
      address: "",
      registeredCompanyName: "",
      copyrightText: "",

      // existing images cleared
      companyLogoExisting: null,
      heroImagesExisting: [],
      galleryExisting: [],

      // new file fields cleared
      companyLogo: null,
      heroImages: [],
      gallery: [],

      // product & testimonials reset to one empty each
      products: [defaultProduct],
      testimonials: [defaultTestimonial],

      // deletion queues reset
      deletedHeroImageIds: [],
      deletedGalleryImageIds: [],
      deletedProductImages: [],
      deletedTestimonialImageIds: [],
    });
  };

  // 5) Render
  return (
    <div className="pb-2">
      <div className="p-4 flex flex-col gap-4">
        <PageFrame>
          <div className="flex flex-col gap-5">
            <h2 className="text-title font-pmedium text-primary uppercase">
              Edit Website
            </h2>

            <form
              ref={formRef}
              encType="multipart/form-data"
              onSubmit={handleSubmit(onSubmit)}
            >
          <div className="md:grid grid-cols-2 sm:grid-cols-1 md:grid-cols-2 gap-4">
            {/* HERO / COMPANY */}
            <div>
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">Hero Section</span>
              </div>

              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="companyName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Company Name"
                      fullWidth
                      helperText={errors?.companyName?.message}
                      error={!!errors.companyName}
                      InputProps={{ readOnly: true }} // <-- ADDED
                    />
                  )}
                />

                <Controller
                  name="title"
                  control={control}
                  rules={{ required: "Title is required" }}
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
                  rules={{ required: "Sub Title is required" }}
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

                <div className="text-xs text-gray-500">
                  Current logo: {values?.companyLogoExisting ? "Yes" : "No"}
                </div>
                {values.companyLogoExisting && (
                  <ExistingImagesGrid
                    items={values.companyLogoExisting} // single object works now
                    onDelete={() =>
                      setValue("companyLogoExisting", null, {
                        shouldDirty: true,
                      })
                    }
                  />
                )}

                {/* companyLogo (single) */}
                <Controller
                  name="companyLogo"
                  control={control}
                  render={({ field }) => (
                    <UploadFileInput
                      id="companyLogo"
                      value={field.value}
                      label="Replace Company Logo"
                      onChange={field.onChange}
                    />
                  )}
                />

                <div className="text-xs text-gray-500 mt-2">
                  Existing carousel images:{" "}
                  {values.heroImagesExisting?.length || 0}
                </div>
                <ExistingImagesGrid
                  items={values.heroImagesExisting}
                  onDelete={(img) =>
                    queueDelete(
                      "heroImagesExisting",
                      "deletedHeroImageIds",
                      img,
                    )
                  }
                />

                <Controller
                  name="heroImages"
                  control={control}
                  render={({ field }) => (
                    <UploadMultipleFilesInput
                      {...field}
                      name="heroImages"
                      label="Add Carousel Images"
                      maxFiles={5}
                      allowedExtensions={["jpg", "jpeg", "png", "webp", "pdf"]}
                      id="heroImages"
                    />
                  )}
                />
              </div>
            </div>

            {/* ABOUT */}
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
                      rules={{ required: "About paragraph is required" }}
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

            {/* PRODUCTS */}
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
                      label="Products Section Title"
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
                      <span className="font-pmedium">Product #{index + 1}</span>
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

                      {/* Existing images count */}
                      <div className="text-xs text-gray-500 md:col-span-2">
                        Existing images:{" "}
                        {values?.products?.[index]?.images?.length || 0}
                      </div>
                      <ExistingImagesGrid
                        items={values.products[index].images}
                        onDelete={(img) =>
                          queueDelete(
                            `products.${index}.images`,
                            "deletedProductImages",
                            img,
                          )
                        }
                      />
                    </div>
                    <div className="pt-4">
                      {/* productImages_${finalIndex} */}
                      <Controller
                        name={`products.${index}.files`}
                        control={control}
                        render={({ field }) => (
                          <UploadMultipleFilesInput
                            {...field}
                            label="Add Product Images"
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

            {/* GALLERY */}
            <div>
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">Gallery</span>
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <div className="text-xs text-gray-500">
                  Existing gallery images: {values.galleryExisting?.length || 0}
                </div>
                <ExistingImagesGrid
                  items={values.galleryExisting}
                  onDelete={(img) =>
                    queueDelete(
                      "galleryExisting",
                      "deletedGalleryImageIds",
                      img,
                    )
                  }
                />
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
                      label="Add Gallery Images"
                      maxFiles={40}
                      allowedExtensions={["jpg", "jpeg", "png", "pdf", "webp"]}
                      id="gallery"
                    />
                  )}
                />
              </div>
            </div>

            {/* TESTIMONIALS */}
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

                    <div className="text-xs text-gray-500">
                      Current image:{" "}
                      {values?.testimonials?.[index]?.image ? "Yes" : "No"}
                    </div>
                    {values.testimonials[index].image && (
                      <ExistingImagesGrid
                        items={[values.testimonials[index].image]}
                        onDelete={(img) =>
                          queueDelete(
                            `testimonials.${index}.image`,
                            "deletedTestimonialImageIds",
                            img,
                          )
                        }
                      />
                    )}

                    <Controller
                      name={`testimonials.${index}.file`}
                      control={control}
                      render={({ field }) => (
                        <UploadFileInput
                          value={field.value}
                          label="Add/Replace Testimonial Image"
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

            {/* CONTACT */}
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
                  //     const rgx =
                  //       /^https?:\/\/(www\.)?(google\.com|maps\.google\.com)\/maps\/embed/i;
                  //     const v = (val || "").trim();
                  //     return (
                  //       rgx.test(v) || "Enter a valid Google Maps embed URL"
                  //     );
                  //   },
                  // }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      onChange={(e) => {
                        const extract = (s = "") =>
                          s.match(/src=["']([^"']+)["']/i)?.[1] || s;
                        field.onChange(extract(e.target.value).trim());
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
                  name="email"
                  control={control}
                  // rules={{ required: "Email is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      size="small"
                      label="Email"
                      fullWidth
                      inputProps={{ maxLength: CHAR_LIMITS.email }}
                      helperText={getHelperText(
                        errors?.email?.message,
                        values?.email,
                        CHAR_LIMITS.email,
                      )}
                      error={!!errors.email}
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

            {/* FOOTER */}
            <div>
              <div className="py-4 border-b-default border-borderGray">
                <span className="text-subtitle font-pmedium">Footer</span>
              </div>
              <div className="grid grid-cols sm:grid-cols-1 md:grid-cols-1 gap-4 p-4 ">
                <Controller
                  name="registeredCompanyName"
                  control={control}
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
          </div>

              {/* Submit / Reset */}
              <div className="flex justify-center mb-3">
                {workspaceId ? <CreditsIndicator workspaceId={workspaceId} /> : null}
              </div>
              <div className="flex items-center justify-center gap-4">
                <PrimaryButton
                  type="submit"
                  title={isUpdating ? "Updating..." : "Submit"}
                  isLoading={isUpdating}
                  disabled={isUpdating || creditsRemaining <= 0}
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
              open={confirmSubmitOpen}
              onClose={() => {
                if (!isUpdating) setConfirmSubmitOpen(false);
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
                    Confirm Submission
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    1 Credit
                  </span>
                </div>
              </DialogTitle>
              <DialogContent>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">
                    You are about to submit this website update.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Credits are deducted only after successful submission.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-white p-3 border border-slate-200">
                      <div className="text-xs text-slate-500">Used</div>
                      <div className="text-base font-semibold text-slate-900">{creditsUsed}</div>
                    </div>
                    <div className="rounded-lg bg-white p-3 border border-slate-200">
                      <div className="text-xs text-slate-500">Remaining</div>
                      <div className="text-base font-semibold text-slate-900">{creditsRemaining}</div>
                    </div>
                    <div className="rounded-lg bg-white p-3 border border-slate-200">
                      <div className="text-xs text-slate-500">Monthly Limit</div>
                      <div className="text-base font-semibold text-slate-900">{creditsLimit}</div>
                    </div>
                    <div className="rounded-lg bg-white p-3 border border-slate-200">
                      <div className="text-xs text-slate-500">Days Left</div>
                      <div className="text-base font-semibold text-slate-900">{daysLeftForRenew}</div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-white p-3 border border-slate-200 text-xs text-slate-600">
                    Resets on <span className="font-semibold text-slate-900">{creditResetText}</span>
                  </div>
                </div>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button
                  onClick={() => setConfirmSubmitOpen(false)}
                  disabled={isUpdating}
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
                  disabled={isUpdating}
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
                    if (pendingSubmitValues) {
                      submitWebsiteUpdate(pendingSubmitValues);
                    }
                    setConfirmSubmitOpen(false);
                    setPendingSubmitValues(null);
                  }}
                >
                  {isUpdating ? "Submitting..." : "Confirm & Submit"}
                </Button>
              </DialogActions>
            </Dialog>
          </div>
        </PageFrame>
      </div>
    </div>
  );
};

const ExistingImagesGrid = ({ items = [], onDelete }) => {
  const [previewImg, setPreviewImg] = useState(null);
  const list = Array.isArray(items) ? items : items ? [items] : [];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
        {list.map((img) => (
          <div
            key={img.id}
            className="relative rounded-lg overflow-hidden border group cursor-pointer"
            onClick={() => setPreviewImg(img.url)}
          >
            <img src={img.url} alt="" className="w-full h-36 object-cover" />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium">
              View Image
            </div>

            <div className="px-2 py-1 text-xs truncate bg-white/80 relative z-10">
              {img.id?.split("/").pop()}
            </div>

            {/* Delete button */}
            <button
              type="button"
              className="absolute bottom-2 right-2 bg-white/90 hover:bg-white p-2 rounded-full shadow z-20"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(img);
              }}
              title="Delete"
            >
              <FiTrash2 />
            </button>
          </div>
        ))}
      </div>

      {/* Full screen modal */}
      {previewImg && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImg}
              alt=""
              className="rounded-lg object-contain max-h-[90vh] mx-auto"
            />

            {/* X close icon */}
            <button type="button"
              className="absolute -top-4 -right-4 bg-white text-black p-2 rounded-full shadow text-lg flex items-center justify-center"
              title="Close preview"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImg(null);
              }}
            >
              <FiX />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default EditWebsite;


