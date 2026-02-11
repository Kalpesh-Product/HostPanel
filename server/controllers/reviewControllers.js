import axios from "axios";
import { response } from "express";
import HostUser from "../models/HostUser.js";
import AdminUser from "../models/AdminUser.js";

const REVIEW_API_BASE_URL =
  process.env.REVIEW_API_BASE_URL || "https://wononomadsbe.vercel.app";

export const updateReviewStatus = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { status } = req.body;
    let data = { status, userType: "HOST" };

    if (!reviewId) {
      return res.status(400).json({ message: "Review id is required" });
    }

    const allowedStatuses = ["approved", "rejected"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid review status" });
    }

    if (status === "approved") {
      data = { ...data, userId: req.user, date: new Date() };
    } else {
      data = { ...data, userId: req.user, date: new Date() };
    }

    let response;

    try {
      // const response = await axios.post(
      //   `https://wononomadsbe.vercel.app/api/reviews/${reviewId}`,
      //   data,
      // );

      response = await axios.patch(
        `${REVIEW_API_BASE_URL}/api/review/${reviewId}`,
        data,
      );

      if (![200, 204].includes(response.status)) {
        return res
          .status(400)
          .json({ message: `Failed to update review status` });
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
      message: `Review ${status} successfully`,
      review: response.data.review,
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewsByCompany = async (req, res, next) => {
  try {
    const { companyId, companyType = "", status = "pending" } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: "Company Id is required" });
    }

    let response;
    let enrichedReviews;
    try {
      // response = await axios.get(`https://wononomadsbe.vercel.app/api/review`, {
      //   params: {
      //     companyId,
      //     companyType,
      //     status,
      //   },
      // });

      response = await axios.get(`${REVIEW_API_BASE_URL}/api/review`, {
        params: {
          companyId,
          companyType,
          status,
        },
      });

      if (![200, 204].includes(response.status)) {
        return res.status(400).json({ message: `Failed to fetch reviews` });
      }

      console.log("reviews", response.data.data);
      const reviews = response.data.data;

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

      enrichedReviews = reviews.map((r) => ({
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
      return res.status(err.response?.status || 500).json({
        message:
          err.response?.data?.message ||
          err.message ||
          "Failed to fetch reviews",
      });
    }

    return res.status(200).json({
      reviews: enrichedReviews,
    });
  } catch (error) {
    next(error);
  }
};
