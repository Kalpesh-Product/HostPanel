// @ts-nocheck
import WorkspaceSubscription from "../models/WorkspaceSubscription.js";
import WebsiteCreditsRequest from "../models/WebsiteCreditsRequest.js";
import recordWebsiteCreditEvent from "../utils/websiteCreditLedger.js";

export const requestCredits = async (req, res) => {
  try {
    const { companyId, workspaceId, requestedCredits } = req.body || {};
    const credits = Number(requestedCredits);

    if (!companyId || !workspaceId) {
      return res.status(400).json({ message: "companyId and workspaceId are required" });
    }

    if (!Number.isFinite(credits) || credits < 1 || credits > 5) {
      return res
        .status(400)
        .json({ message: "requestedCredits must be between 1 and 5" });
    }

    const subscription = await WorkspaceSubscription.findOne({
      $or: [{ companyId: String(companyId) }, { workspaceId: String(workspaceId) }],
    })
      .select("creditsUsed creditsLimit")
      .lean()
      .exec();

    if (!subscription) {
      return res.status(404).json({ message: "Workspace subscription not found" });
    }

    const existingPending = await WebsiteCreditsRequest.findOne({
      companyId: String(companyId),
      status: "pending",
    })
      .lean()
      .exec();

    if (existingPending) {
      return res
        .status(400)
        .json({ message: "You already have a pending credit request" });
    }

    const createdRequest = await WebsiteCreditsRequest.create({
      companyId: String(companyId),
      workspaceId: String(workspaceId),
      requestedCredits: credits,
      status: "pending",
    });

    return res.status(201).json({
      message: "Credit request submitted successfully",
      request: createdRequest,
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Failed to submit credit request" });
  }
};

export const getCreditsRequests = async (_req, res) => {
  try {
    const requests = await WebsiteCreditsRequest.find({ status: "pending" })
      .sort({ requestedAt: -1 })
      .exec();

    return res.status(200).json(requests);
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Failed to fetch credit requests" });
  }
};

export const approveCreditsRequest = async (req, res) => {
  try {
    const { requestId } = req.params || {};

    const creditRequest = await WebsiteCreditsRequest.findById(requestId).exec();
    if (!creditRequest) {
      return res.status(404).json({ message: "Credit request not found" });
    }

    creditRequest.status = "approved";
    creditRequest.approvedAt = new Date();
    creditRequest.approvedBy = req?.user?._id || req?.user || null;
    await creditRequest.save();

    const subscription = await WorkspaceSubscription.findOne({
      companyId: String(creditRequest.companyId),
    }).exec();

    if (!subscription) {
      return res.status(404).json({ message: "Workspace subscription not found" });
    }

    // creditsLimit is plan-based (professional: 8, basic: 5) and managed by
    // the credit middleware — approving add-on credits must not reset it.
    subscription.addOnCreditsPurchased =
      Number(subscription.addOnCreditsPurchased || 0) + Number(creditRequest.requestedCredits || 0);
    await subscription.save();

    // Fire-and-forget: record the grant in the credits ledger.
    void recordWebsiteCreditEvent({
      req,
      type: "added",
      credits: Number(creditRequest.requestedCredits || 0),
      subscription,
      workspaceId: creditRequest.workspaceId,
      companyId: creditRequest.companyId,
      description: "Credits added via approved credit request",
    });

    return res.status(200).json(subscription);
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Failed to approve credit request" });
  }
};
