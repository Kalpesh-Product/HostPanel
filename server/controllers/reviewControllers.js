import axios from "axios";
import { response } from "express";

export const updateReviewStatus = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { status } = req.body;
    let data = { status };

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

    let response = {};
    try {
      const response = await axios.post(
        `https://wononomadsbe.vercel.app/api/reviews/${reviewId}`,
        data,
      );

      //   response = await axios.patch(
      //     `http://localhost:3000/api/review/${reviewId}`,
      //     data,
      //   );

      //   if (response.status !== 201) {
      //     return res.status(400).json({ message: `Failed to ${status} review` });
      //   }

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
