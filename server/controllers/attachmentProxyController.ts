import type { NextFunction, Request, Response } from "express";
import { getFileFromS3ByUrl } from "../config/s3config.js";

const getBucketBaseUrl = () => {
  const bucket = process.env.PROJECT_S3_BUCKET_NAME;
  const region = process.env.PROJECT_AWS_REGION;
  if (!bucket || !region) return "";
  return `https://${bucket}.s3.${region}.amazonaws.com/`;
};

export const proxyTicketAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawUrl = String(req.query.url || "");
    const bucketBaseUrl = getBucketBaseUrl();

    if (!rawUrl || !bucketBaseUrl || !rawUrl.startsWith(bucketBaseUrl)) {
      return res.status(400).json({ message: "Invalid attachment URL." });
    }

    const { data, contentType } = await getFileFromS3ByUrl(rawUrl);

    res.setHeader("Content-Type", contentType || "application/octet-stream");
    res.setHeader("Content-Length", String(data.length));
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.status(200).send(data);
  } catch (error) {
    next(error);
  }
};
