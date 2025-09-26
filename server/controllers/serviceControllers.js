import axios from "axios";
import HostCompany from "../models/Company.js";

export const getServices = async (req, res, next) => {
  try {
    const { companyId } = req.query;

    const company = await HostCompany.findOne({ companyId });

    if (!company) return res.status(400).json({ message: "Company not found" });

    return res.status(200).json(company);
  } catch (error) {
    next(error);
  }
};

export const requestServices = async (req, res, next) => {
  try {
    const { companyId, requestedServices = {} } = req.body;

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
    const validApps = new Set(serviceOptions[0].items);
    const validModules = new Set(serviceOptions[1].items);

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const { apps = [], modules = [] } = requestedServices;

    if (!apps.length || !modules.length) {
      return res
        .status(400)
        .json({ message: "At least one of apps or modules must be provided" });
    }

    const invalidApps = apps.filter((a) => !validApps.has(a.appName));
    const invalidModules = modules.filter(
      (m) => !validModules.has(m.moduleName)
    );

    if (invalidApps.length || invalidModules.length) {
      return res.status(400).json({
        message: "Invalid app/module names provided",
        invalidApps: invalidApps.map((a) => a.appName),
        invalidModules: invalidModules.map((m) => m.moduleName),
      });
    }

    const company = await HostCompany.findOne({ companyId });
    if (!company) return res.status(404).json({ message: "Company not found" });

    // Initialize selectedServices fully before mapping
    if (!company.selectedServices) {
      company.selectedServices = { apps: [], modules: [] };
    }

    const appsMap = new Map(
      (company?.selectedServices?.apps || []).map((a) => [a.appName, a])
    );
    const modulesMap = new Map(
      (company.selectedServices.modules || []).map((m) => [m.moduleName, m])
    );

    apps.forEach((app) => {
      if (appsMap.has(app.appName)) {
        appsMap.get(app.appName).isRequested = true;
      } else {
        company.selectedServices.apps.push({ ...app, isRequested: true });
      }
    });

    modules.forEach((mod) => {
      if (modulesMap.has(mod.moduleName)) {
        modulesMap.get(mod.moduleName).isRequested = true;
      } else {
        company.selectedServices.modules.push({ ...mod, isRequested: true });
      }
    });

    await company.save();

    return res.status(200).json({
      message: "Request submitted successfully",
      selectedServices: company.selectedServices,
    });
  } catch (error) {
    next(error);
  }
};
