// @ts-nocheck
import axios from "axios";
import { response } from "express";
import HostUser from "../models/HostUser.js";
import AdminUser from "../models/AdminUser.js";
import Company from "../models/Company.js";
import WebsiteTemplate from "../models/website/WebsiteTemplate.js";
import Workspace from "../models/Workspace.js";
import WebsiteReview from "../models/WebsiteReview.js";

const REVIEW_API_BASE_URL =
  process.env.REVIEW_API_BASE_URL || "https://wononomadsbe.vercel.app";
const REVIEW_API_FALLBACK_URL = "https://wononomadsbe.vercel.app";

const sanitizeValue = (value) => String(value || "").trim();
const isSyntheticCompanyId = (value) => sanitizeValue(value).includes("-dev-");

const resolveHostCandidates = (req) => {
  const candidates = [];
  const collect = (raw) => {
    const value = sanitizeValue(raw).toLowerCase();
    if (!value) return;
    const cleaned = value.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
    if (!cleaned) return;
    candidates.push(cleaned);
  };

  collect(req.headers?.host);
  collect(req.headers?.origin);
  collect(req.headers?.referer);
  collect(req.body?.websiteUrl);
  collect(req.body?.siteUrl);
  collect(req.query?.websiteUrl);
  collect(req.query?.siteUrl);

  return Array.from(new Set(candidates));
};

const resolveSlugCandidates = (req) => {
  const values = [
    req.body?.searchKey,
    req.query?.searchKey,
    req.body?.websiteSlug,
    req.query?.websiteSlug,
    req.body?.companySlug,
    req.query?.companySlug,
    req.body?.slug,
    req.query?.slug,
  ]
    .map(sanitizeValue)
    .filter(Boolean);

  const urlLike = [
    req.headers?.referer,
    req.headers?.origin,
    req.body?.websiteUrl,
    req.body?.siteUrl,
    req.body?.pageUrl,
    req.body?.url,
    req.query?.websiteUrl,
    req.query?.siteUrl,
    req.query?.pageUrl,
    req.query?.url,
  ]
    .map(sanitizeValue)
    .filter(Boolean);

  for (const value of urlLike) {
    try {
      const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length > 0) values.push(parts[0]);
    } catch {
      // ignore parse failures
    }
  }

  return Array.from(
    new Set(
      values
        .map((value) => value.toLowerCase().trim())
        .filter(Boolean),
    ),
  );
};

const resolveTemplateFromRequest = async (req) => {
  const body = req.body || {};
  const query = req.query || {};

  const searchKeyCandidates = resolveSlugCandidates(req);
  for (const searchKey of searchKeyCandidates) {
    const template = await WebsiteTemplate.findOne({ searchKey }).lean().exec();
    if (template) return template;
  }

  const hostCandidates = resolveHostCandidates(req);
  for (const host of hostCandidates) {
    const hostSubdomain = host.split(".")[0];
    if (!hostSubdomain || ["www", "wono", "api"].includes(hostSubdomain)) continue;
    const template = await WebsiteTemplate.findOne({ searchKey: hostSubdomain })
      .lean()
      .exec();
    if (template) return template;
  }

  const workspaceId = sanitizeValue(body.workspaceId || query.workspaceId);
  if (workspaceId) {
    const template = await WebsiteTemplate.findOne({ workspaceId }).lean().exec();
    if (template) return template;
  }

  const companyId = sanitizeValue(body.companyId || query.companyId);
  if (companyId) {
    const template = await WebsiteTemplate.findOne({ companyId }).lean().exec();
    if (template) return template;
  }

  const companyName = sanitizeValue(body.companyName || query.companyName);
  if (companyName) {
    const escaped = companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const template = await WebsiteTemplate.findOne({
      companyName: { $regex: new RegExp(`^${escaped}$`, "i") },
    })
      .lean()
      .exec();
    if (template) return template;
  }

  return null;
};

const resolveCompanyIdFromWorkspace = async (workspaceId) => {
  const normalizedWorkspaceId = sanitizeValue(workspaceId);
  if (!normalizedWorkspaceId) return "";

  const template = await WebsiteTemplate.findOne({ workspaceId: normalizedWorkspaceId })
    .select("companyId")
    .lean()
    .exec();
  const templateCompanyId = sanitizeValue(template?.companyId);
  if (templateCompanyId && !isSyntheticCompanyId(templateCompanyId)) {
    return templateCompanyId;
  }

  const workspace = await Workspace.findById(normalizedWorkspaceId)
    .select("company companyId")
    .lean()
    .exec();
  if (workspace?.company) {
    const linkedCompany = await Company.findById(workspace.company)
      .select("companyId")
      .lean()
      .exec();
    const linkedCompanyId = sanitizeValue(linkedCompany?.companyId);
    if (linkedCompanyId) return linkedCompanyId;
  }

  return sanitizeValue(workspace?.companyId);
};

const resolveCompanyIdFromHostUser = async (userId) => {
  const normalizedUserId = sanitizeValue(userId);
  if (!normalizedUserId) return "";

  const user = await HostUser.findById(normalizedUserId)
    .select("company companyId primaryWorkspace")
    .lean()
    .exec();
  if (!user) return "";

  if (user.company) {
    const company = await Company.findById(user.company).select("companyId").lean().exec();
    const linkedCompanyId = sanitizeValue(company?.companyId);
    if (linkedCompanyId) return linkedCompanyId;
  }

  const workspaceCompanyId = await resolveCompanyIdFromWorkspace(user.primaryWorkspace);
  if (workspaceCompanyId) return workspaceCompanyId;

  return sanitizeValue(user.companyId);
};

const resolveCanonicalCompanyId = async (req, template = null) => {
  const requestedCompanyId = sanitizeValue(req.body?.companyId || req.query?.companyId);
  const requestedWorkspaceId = sanitizeValue(
    req.body?.workspaceId || req.query?.workspaceId || req.workspaceMembership?.workspace,
  );

  const candidates = [
    sanitizeValue(template?.companyId),
    template?.workspaceId ? await resolveCompanyIdFromWorkspace(template.workspaceId) : "",
    requestedWorkspaceId ? await resolveCompanyIdFromWorkspace(requestedWorkspaceId) : "",
    await resolveCompanyIdFromHostUser(req.user),
    requestedCompanyId,
  ].filter(Boolean);

  const stableCandidate = candidates.find((value) => !isSyntheticCompanyId(value));
  return stableCandidate || candidates[0] || "";
};

const parseReviewList = (response) => {
  const reviews =
    response?.data?.reviews ??
    response?.data?.data?.reviews ??
    response?.data?.data ??
    response?.data;
  return Array.isArray(reviews) ? reviews : [];
};

const buildReviewApiBases = () =>
  Array.from(
    new Set(
      [REVIEW_API_BASE_URL, REVIEW_API_FALLBACK_URL]
        .map(sanitizeValue)
        .filter(Boolean),
    ),
  );

const requestReviewApi = async (config) => {
  let lastError = null;

  for (const baseUrl of buildReviewApiBases()) {
    try {
      return await axios({
        ...config,
        baseURL: baseUrl,
        url: config.url,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const buildLocalReviewQuery = ({
  companyId = "",
  workspaceId = "",
  searchKey = "",
  status = "",
} = {}) => {
  const query = {};
  const normalizedStatus = sanitizeValue(status).toLowerCase();
  if (normalizedStatus) query.status = normalizedStatus;
  const validWorkspaceId = sanitizeValue(workspaceId);
  const validCompanyId = sanitizeValue(companyId);
  if (validWorkspaceId) {
    query.workspaceId = validWorkspaceId;
  }
  if (validCompanyId) {
    query.companyId = validCompanyId;
  }
  if (sanitizeValue(searchKey)) {
    query.searchKey = sanitizeValue(searchKey).toLowerCase();
  }
  return query;
};

const mapLocalReviewForResponse = (review) => ({
  ...review,
  _id: String(review?._id || ""),
  submittedAt: review?.createdAt || null,
});

const isWebsiteReviewRecord = (review) => {
  const source = sanitizeValue(review?.source).toLowerCase();
  const reviewSource = sanitizeValue(review?.reviewSource).toLowerCase();

  if (reviewSource.includes("nomad")) return false;
  if (reviewSource === "website reviews") return true;

  return (
    ["website", "website form", "website preview", "website reviews"].includes(source)
  );
};

const parseListingList = (response) => {
  const listings = response?.data?.listings ?? response?.data?.data ?? response?.data;
  return Array.isArray(listings) ? listings : [];
};

const getReviewCompanyRecordId = (review) =>
  sanitizeValue(review?.company?._id || review?.company);

const mergeReviews = (remoteReviews = [], localReviews = []) => {
  const seen = new Set();
  const merged = [];

  for (const item of [...remoteReviews, ...localReviews]) {
    const key =
      sanitizeValue(item?.upstreamReviewId) ||
      sanitizeValue(item?._id) ||
      `${sanitizeValue(item?.reviewerName)}|${sanitizeValue(item?.review)}|${sanitizeValue(
        item?.createdAt,
      )}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
};

export const createWebsiteReview = async (req, res, next) => {
  try {
    const body = req.body || {};
    const template = await resolveTemplateFromRequest(req);

    const reviewerName = sanitizeValue(
      body.reviewerName || body.fullName || body.name,
    );
    const review = sanitizeValue(body.review || body.comment || body.description);
    const role = sanitizeValue(body.role || body.designation || body.jobPosition);
    const rating = Number(
      body.starCount ?? body.rating ?? body.rate ?? body.ratingValue ?? 0,
    );
    const resolvedCompanyId = await resolveCanonicalCompanyId(req, template);
    const resolvedWorkspaceId = sanitizeValue(
      body.workspaceId || template?.workspaceId,
    );
    let resolvedCompanyName = sanitizeValue(
      body.companyName ||
        template?.companyName ||
        template?.registeredCompanyName ||
        template?.searchKey,
    );

    if (!reviewerName || !review || !(rating >= 1 && rating <= 5)) {
      return res.status(400).json({
        message: "reviewerName, review and rating between 1 and 5 are required",
      });
    }

    if (!resolvedCompanyName && resolvedWorkspaceId) {
      const workspace = await Workspace.findById(resolvedWorkspaceId)
        .select("businessName workspaceName")
        .lean()
        .exec();
      resolvedCompanyName = sanitizeValue(
        workspace?.businessName || workspace?.workspaceName,
      );
    }

    if (!resolvedCompanyId && !resolvedCompanyName) {
      return res.status(400).json({
        message: "Unable to resolve company for this website review",
      });
    }

    const payload = {
      ...body,
      reviewerName,
      reviewreName: sanitizeValue(body.reviewreName || reviewerName),
      name: sanitizeValue(body.name || reviewerName),
      fullName: sanitizeValue(body.fullName || reviewerName),
      review,
      comment: sanitizeValue(body.comment || review),
      description: sanitizeValue(body.description || review),
      role,
      designation: sanitizeValue(body.designation || role),
      jobPosition: sanitizeValue(body.jobPosition || role),
      starCount: rating,
      rating,
      rate: rating,
      companyId: resolvedCompanyId,
      workspaceId: resolvedWorkspaceId,
      companyName: resolvedCompanyName,
      companyType: sanitizeValue(body.companyType),
      source: "website",
      reviewSource: "Website Reviews",
      searchKey: sanitizeValue(body.searchKey || template?.searchKey),
      websiteUrl: sanitizeValue(body.websiteUrl || body.siteUrl || body.url),
      status: sanitizeValue(body.status || "pending").toLowerCase(),
    };

    const localReview = await WebsiteReview.create({
      ...payload,
      searchKey: sanitizeValue(body.searchKey || template?.searchKey).toLowerCase(),
      upstreamSynced: false,
      upstreamError: "",
      upstreamReviewId: "",
    });

    try {
      const response = await requestReviewApi({
        method: "post",
        url: "/api/review",
        data: payload,
      });
      const remoteReviewId = sanitizeValue(
        response?.data?.review?._id ||
          response?.data?.data?._id ||
          response?.data?._id,
      );
      await WebsiteReview.findByIdAndUpdate(localReview._id, {
        $set: {
          upstreamSynced: true,
          upstreamError: "",
          upstreamReviewId: remoteReviewId,
        },
      }).exec();
      return res.status(response.status || 201).json(response.data);
    } catch (syncError) {
      await WebsiteReview.findByIdAndUpdate(localReview._id, {
        $set: {
          upstreamSynced: false,
          upstreamError:
            syncError?.response?.data?.message ||
            syncError?.response?.data?.error ||
            syncError?.message ||
            "Upstream review sync failed",
        },
      }).exec();

      return res.status(201).json({
        message: "Review submitted successfully. It is pending approval.",
        review: mapLocalReviewForResponse(localReview.toObject()),
      });
    }
  } catch (error) {
    return res.status(error.response?.status || 500).json({
      message:
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to submit website review",
    });
  }
};

export const getApprovedWebsiteReviews = async (req, res, next) => {
  try {
    const template = await resolveTemplateFromRequest(req);
    const companyId = await resolveCanonicalCompanyId(req, template);
    const workspaceId = sanitizeValue(req.query?.workspaceId || template?.workspaceId);
    const searchKey = sanitizeValue(req.query?.searchKey || template?.searchKey).toLowerCase();

    if (!companyId) {
      return res.status(400).json({ message: "Company Id is required" });
    }

    let remoteReviews = [];
    try {
      const response = await requestReviewApi({
        method: "get",
        url: "/api/review",
        params: {
          companyId,
          companyType: sanitizeValue(req.query?.companyType),
          status: "approved",
          ...(workspaceId ? { workspaceId } : {}),
        },
      });
      remoteReviews = parseReviewList(response).filter(
        (review) => review?.isEnabled === true && isWebsiteReviewRecord(review),
      );
    } catch (error) {
      remoteReviews = [];
    }

    if (remoteReviews.length > 0) {
      if (workspaceId) {
        remoteReviews = remoteReviews.filter((r) => {
          const rWorkspaceId = sanitizeValue(r.workspaceId);
          return rWorkspaceId === workspaceId;
        });
      } else {
        remoteReviews = remoteReviews.filter((r) => {
          return !sanitizeValue(r.workspaceId);
        });
      }
    }

    const localReviews = await WebsiteReview.find({
      ...buildLocalReviewQuery({
        companyId,
        workspaceId,
        searchKey,
        status: "approved",
      }),
      isEnabled: true,
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return res.status(200).json({
      reviews: mergeReviews(
        remoteReviews,
        localReviews.map(mapLocalReviewForResponse),
      ),
    });
  } catch (error) {
    return res.status(error.response?.status || 500).json({
      message:
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to fetch approved website reviews",
    });
  }
};

export const updateReviewStatus = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { status, isEnabled } = req.body || {};
    const hasStatusUpdate = typeof status === "string";
    const hasVisibilityUpdate = typeof isEnabled === "boolean";
    const data = {
      ...(hasStatusUpdate ? { status } : {}),
      ...(hasVisibilityUpdate ? { isEnabled } : {}),
      userType: "HOST",
      userId: req.user,
      date: new Date(),
    };

    if (!reviewId) {
      return res.status(400).json({ message: "Review id is required" });
    }

    if (!hasStatusUpdate && !hasVisibilityUpdate) {
      return res.status(400).json({
        message: "Review status or isEnabled value is required",
      });
    }

    const allowedStatuses = ["approved", "rejected"];
    if (hasStatusUpdate && !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid review status" });
    }

    if (/^[a-f\d]{24}$/i.test(String(reviewId || ""))) {
      const localReview = await WebsiteReview.findById(reviewId).exec();
      if (localReview) {
        if (hasVisibilityUpdate && localReview.status !== "approved") {
          return res.status(400).json({
            message: "Only approved reviews can be enabled or disabled",
          });
        }

        if (hasStatusUpdate) {
          localReview.status = status;
          if (status === "approved") {
            localReview.approvedBy = data;
            localReview.rejectedBy = null;
          } else {
            localReview.rejectedBy = data;
            localReview.approvedBy = null;
          }
        }
        if (hasVisibilityUpdate) {
          localReview.isEnabled = isEnabled;
        }

        if (localReview.upstreamReviewId) {
          try {
            await requestReviewApi({
              method: "patch",
              url: `/api/review/${localReview.upstreamReviewId}`,
              data,
            });
            localReview.upstreamSynced = true;
            localReview.upstreamError = "";
          } catch (syncError) {
            localReview.upstreamSynced = false;
            localReview.upstreamError =
              syncError?.response?.data?.message ||
              syncError?.response?.data?.error ||
              syncError?.message ||
              "Failed to sync review status upstream";
          }
        }

        await localReview.save();

        return res.status(200).json({
          message: hasVisibilityUpdate
            ? `Review ${isEnabled ? "enabled" : "disabled"} successfully`
            : `Review ${status} successfully`,
          review: mapLocalReviewForResponse(localReview.toObject()),
        });
      }
    }

    let response;

    try {
      response = await requestReviewApi({
        method: "patch",
        url: `/api/review/website-review/${reviewId}`,
        data,
      });

      if (![200, 204].includes(response.status)) {
        return res
          .status(400)
          .json({ message: `Failed to update review` });
      }
    } catch (err) {
      return res.status(err.response?.status || 500).json({
        message:
          err.response?.data?.message ||
          err.message ||
          "Failed to update review",
      });
    }

    return res.status(200).json({
      message: hasVisibilityUpdate
        ? `Review ${isEnabled ? "enabled" : "disabled"} successfully`
        : `Review ${status} successfully`,
      review: response.data.review,
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewsByCompany = async (req, res, next) => {
  try {
    const { companyType = "", status = "", reviewScope = "" } = req.query;
    const normalizedReviewScope = sanitizeValue(reviewScope).toLowerCase();
    const companyId = await resolveCanonicalCompanyId(req);
    const template = await resolveTemplateFromRequest(req);
    const resolvedWorkspaceId = sanitizeValue(
      req.workspaceMembership?.workspace || req.query?.workspaceId || template?.workspaceId,
    );
    const searchKey = sanitizeValue(req.query?.searchKey || template?.searchKey).toLowerCase();

    if (!companyId) {
      return res.status(400).json({ message: "Company Id is required" });
    }

    let enrichedRemoteReviews = [];
    try {
      const response = await requestReviewApi({
        method: "get",
        url: "/api/review",
        params: {
          companyId,
          companyType,
          ...(status ? { status } : {}),
          ...(normalizedReviewScope !== "nomads" && resolvedWorkspaceId
            ? { workspaceId: resolvedWorkspaceId }
            : {}),
        },
      });

      if (![200, 204].includes(response.status)) {
        return res.status(400).json({ message: `Failed to fetch reviews` });
      }

      const reviews = parseReviewList(response);

      const adminIds = new Set();
      const hostIds = new Set();

      for (const r of reviews) {
        if (r.approvedBy?.userId) {
          r.approvedBy.userType === "MASTER"
            ? adminIds.add(r.approvedBy.userId)
            : hostIds.add(r.approvedBy.userId);
        }

        if (r.rejectedBy?.userId) {
          r.rejectedBy.userType === "MASTER"
            ? adminIds.add(r.rejectedBy.userId)
            : hostIds.add(r.rejectedBy.userId);
        }
      }

      const [admins, hosts] = await Promise.all([
        AdminUser.find({ _id: { $in: [...adminIds] } })
          .select("_id firstName lastName email")
          .lean(),
        HostUser.find({ _id: { $in: [...hostIds] } })
          .select("_id name phone email")
          .lean(),
      ]);

      const adminMap = Object.fromEntries(
        admins.map((a) => [a._id.toString(), a]),
      );
      const hostMap = Object.fromEntries(
        hosts.map((h) => [h._id.toString(), h]),
      );

      enrichedRemoteReviews = reviews.map((r) => ({
        ...r,
        approvedBy: r.approvedBy
          ? {
              ...r.approvedBy,
              user:
                r.approvedBy.userType === "MASTER"
                  ? adminMap[r.approvedBy.userId]
                  : hostMap[r.approvedBy.userId],
            }
          : null,
        rejectedBy: r.rejectedBy
          ? {
              ...r.rejectedBy,
              user:
                r.rejectedBy.userType === "MASTER"
                  ? adminMap[r.rejectedBy.userId]
                  : hostMap[r.rejectedBy.userId],
            }
          : null,
      }));
    } catch (err) {
      enrichedRemoteReviews = [];
    }

    if (enrichedRemoteReviews.length > 0 && normalizedReviewScope !== "nomads") {
      if (resolvedWorkspaceId) {
        enrichedRemoteReviews = enrichedRemoteReviews.filter((r) => {
          const rWorkspaceId = sanitizeValue(r.workspaceId);
          return rWorkspaceId === resolvedWorkspaceId;
        });
      } else {
        enrichedRemoteReviews = enrichedRemoteReviews.filter((r) => {
          return !sanitizeValue(r.workspaceId);
        });
      }
    }

    const storedLocalReviews = await WebsiteReview.find(
      buildLocalReviewQuery({
        companyId,
        workspaceId: resolvedWorkspaceId,
        searchKey,
        status,
      }),
    )
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const localUpstreamReviewIds = new Set(
      storedLocalReviews
        .map((review) => sanitizeValue(review?.upstreamReviewId))
        .filter(Boolean),
    );

    if (normalizedReviewScope === "website") {
      enrichedRemoteReviews = enrichedRemoteReviews.filter(isWebsiteReviewRecord);
    } else if (normalizedReviewScope === "nomads") {
      enrichedRemoteReviews = enrichedRemoteReviews.filter(
        (review) =>
          !isWebsiteReviewRecord(review) &&
          !localUpstreamReviewIds.has(sanitizeValue(review?._id)),
      );

      try {
        const listingsResponse = await requestReviewApi({
          method: "get",
          url: `/api/company/get-listings/${encodeURIComponent(companyId)}`,
        });
        const listingTypeById = new Map(
          parseListingList(listingsResponse)
            .map((listing) => [
              sanitizeValue(listing?._id),
              sanitizeValue(listing?.companyType),
            ])
            .filter(([listingId]) => Boolean(listingId)),
        );

        enrichedRemoteReviews = enrichedRemoteReviews.map((review) => ({
          ...review,
          companyType:
            listingTypeById.get(getReviewCompanyRecordId(review)) ||
            sanitizeValue(review?.companyType),
        }));
      } catch {
        // Reviews still load if the Nomads listing lookup is temporarily unavailable.
      }
    }

    const localReviews = normalizedReviewScope === "nomads"
      ? []
      : storedLocalReviews;

    return res.status(200).json({
      reviews: mergeReviews(
        enrichedRemoteReviews,
        localReviews.map(mapLocalReviewForResponse),
      ),
    });
  } catch (error) {
    next(error);
  }
};

