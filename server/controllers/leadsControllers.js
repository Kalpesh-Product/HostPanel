import axios from "axios";

export const getLeads = async (req, res, next) => {
  try {
    const { companyId } = req.query;

    console.log("object");
    const leads = await axios.get(
      `https://wononomadsbe.vercel.app/api/company/leads?companyId=${companyId}`
    );

    if (leads.status !== 200)
      return res.status(200).json({ message: "No leads found" });

    return res.status(200).json(leads.data);
  } catch (error) {
    next(error);
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
