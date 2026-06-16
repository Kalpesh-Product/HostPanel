// @ts-nocheck
import express from "express";
import multer from "multer";
import {
  listTenantCompanies,
  getTenantCompanySectors,
  getTenantCompany,
  createTenantCompany,
  updateTenantCompany,
  renewTenantCompany,
  assignTenantCompanySpace,
  addTenantCompanyEmployee,
  updateTenantCompanyEmployee,
  updateTenantCompanyEmployeeStatus,
  deleteTenantCompanyEmployee,
  assignTenantCompanyManager,
  uploadTenantCompanyAgreementDocuments,
  getMyTenantCompanyCreditRequests,
  createMyTenantCompanyCreditRequest,
  submitMyTenantCompanyCreditRequestPayment,
  updateTenantCompanyCreditRequest,
} from "../controllers/tenant-company.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Self-service credit request routes (must precede /:id routes)
router.get("/my/credit-requests", getMyTenantCompanyCreditRequests);
router.post("/my/credit-requests", createMyTenantCompanyCreditRequest);
router.post("/my/credit-requests/:requestId/payment", upload.single("paymentProof"), submitMyTenantCompanyCreditRequestPayment);

// Sectors
router.get("/sectors", getTenantCompanySectors);

// CRUD
router.get("/", listTenantCompanies);
router.post("/", createTenantCompany);
router.get("/:id", getTenantCompany);
router.patch("/:id", updateTenantCompany);

// Renew
router.post("/:id/renew", renewTenantCompany);

// Space
router.post("/:id/space", assignTenantCompanySpace);

// Employees
router.post("/:id/employees", addTenantCompanyEmployee);
router.patch("/:id/employees/:employeeId", updateTenantCompanyEmployee);
router.patch("/:id/employees/:employeeId/status", updateTenantCompanyEmployeeStatus);
router.delete("/:id/employees/:employeeId", deleteTenantCompanyEmployee);

// Manager
router.patch("/:id/manager", assignTenantCompanyManager);

// Agreement documents
router.post("/:id/agreement-documents", upload.array("documents"), uploadTenantCompanyAgreementDocuments);

// Credit requests
router.patch("/:id/credit-requests/:requestId", updateTenantCompanyCreditRequest);

export default router;
