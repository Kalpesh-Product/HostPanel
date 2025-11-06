import axios from "axios";

export const getLeads = async (req, res, next) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    console.log("Fetching leads for company:", companyId);

    const leads = await axios.get(
      `https://wononomadsbe.vercel.app/api/company/leads?companyId=${companyId}`
    );

    // If successful, return the data
    return res.status(200).json(leads.data);
  } catch (error) {
    console.error("Get Leads Error:", error);

    // Handle Axios errors (from external API)
    if (error.response) {
      // The external API responded with an error status code
      const statusCode = error.response.status;
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        "Failed to fetch leads";

      console.error(`External API error (${statusCode}):`, errorMessage);

      return res.status(statusCode).json({
        message: errorMessage,
        error: "External API error",
      });
    } else if (error.request) {
      // The request was made but no response was received (network error, timeout, etc.)
      console.error("No response from external API:", error.message);

      return res.status(503).json({
        message: "External API is not responding. Please try again later.",
        error: "Service unavailable",
      });
    } else {
      // Something else happened
      // console.error("Unexpected error:", error.message);

      return res.status(500).json({
        message: "An unexpected error occurred",
        error: error.message,
      });
    }
  }
};

export const updateLeads = async (req, res, next) => {
  try {
    const { status = "", comment = "", leadId } = req.body;

    if ((!leadId && typeof status !== boolean) || (!leadId && !comment)) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const leads = await axios.patch(
      `https://wononomadsbe.vercel.app/api/company/update-lead`,
      req.body
    );

    if (leads.status !== 200)
      return res.status(200).json({ message: "No leads found" });

    return res.status(200).json({ message: "Leads updated successfully" });
  } catch (error) {
    next(error);
  }
};
