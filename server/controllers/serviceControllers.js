import axios from "axios";

export const getServices = async (req, res, next) => {
  try {
    const { companyId } = req.query;
    const response = await axios.get(
      `https://wonomasterbe.vercel.app/api/hosts/company?companyId=${companyId}`
    );

    const company = response.data;

    if (!company) throw new Error("Company not found");

    return res.status(200).json(company);
  } catch (error) {
    next(error);
  }
};

const serviceOptions = [
  {
    items: [
      "Tickets",
      "Meetings",
      "Tasks",
      "Performance",
      "Visitors",
      "Assets",
    ],
  },
  {
    items: ["Finance", "Sales", "HR", "Admin", "Maintenance", "IT"],
  },
];

export const updateServices = async (req, res, next) => {
  try {
    const { companyId, selectedServices } = req.body;

    const validApps = new Set(serviceOptions[0].items);
    const validModules = new Set(serviceOptions[1].items);

    // validate incoming apps/modules
    const invalidApps = selectedServices.apps.filter(
      (a) => !validApps.has(a.appName)
    );
    const invalidModules = selectedServices.modules.filter(
      (m) => !validModules.has(m.moduleName)
    );

    if (invalidApps.length || invalidModules.length) {
      return res.status(400).json({
        message: "Invalid app/module names provided",
        invalidApps: invalidApps.map((a) => a.appName),
        invalidModules: invalidModules.map((m) => m.moduleName),
      });
    }

    const response = await axios.patch(
      `https://wonomasterbe.vercel.app/api/hosts/update-services`,
      { companyId, selectedServices }
    );

    const company = response.data;

    if (!company) throw new Error("Company not found");

    return res.status(200).json({ message: "Services added successfully" });
  } catch (error) {
    next(error);
  }
};
