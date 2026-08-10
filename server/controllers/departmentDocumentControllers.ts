// @ts-nocheck
import { getCurrentWorkspace } from "../services/core/hr.service.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import Department from "../models/Department.js";
import DepartmentDocument from "../models/DepartmentDocument.js";
import { uploadFileToS3, deleteFileFromS3ByUrl, getFileFromS3ByUrl } from "../config/s3config.js";

const normalizeFileName = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");

const getRoleName = (role: any) => {
  if (!role) return "";
  if (typeof role === "string") return role;
  return role?.name || "";
};

// Mirrors organizationControllers.ts's normalizeRoleForStorage — "founder"
// and "superadmin" are stored role names that must map to the "owner" /
// "super_admin" bands, or every owner/founder-only check below silently
// falls through to the "employee" band instead of raising a clear 403.
const normalizeRoleForStorage = (role = "") => {
  const normalized = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (normalized === "founder") return "owner";
  if (normalized === "superadmin") return "super_admin";
  return normalized;
};

// Mirrors the role-band derivation already used in organizationControllers.ts
// (kept as a small local duplicate — no shared exported version exists yet).
const getRoleBand = (role: any) => {
  const name = getRoleName(role);
  const normalized = normalizeRoleForStorage(name);
  if (normalized === "owner") return "owner";
  if (normalized === "super_admin") return "super_admin";
  if (normalized === "admin" || normalized === "admin_manager") return "admin";
  if (normalized === "manager") return "manager";
  return "employee";
};

const resolveWorkspaceOrThrow = async (req, res) => {
  const { workspace } = await getCurrentWorkspace(req.user);
  if (!workspace) {
    res.status(404).json({ success: false, message: "Workspace not found for this user." });
    return null;
  }
  return workspace;
};

const getActorMembership = async (req, workspace) =>
  WorkspaceMember.findOne({
    workspace: workspace._id,
    user: req.user,
    isActive: true,
  })
    .select("_id departments")
    .lean();

// Only owner/super_admin (unrestricted) or a manager acting on their own
// department may upload/rename/retire that department's SOP/Policy documents
// — mirrors the exact scoping already proven in updateOrganizationMemberAccess
// (organizationControllers.ts).
const assertDepartmentWriteAccess = async (req, res, workspace, departmentId) => {
  const actorRoleBand = getRoleBand(req.workspaceMembership?.role || "");
  if (actorRoleBand === "owner" || actorRoleBand === "super_admin") {
    return true;
  }
  if (actorRoleBand !== "manager") {
    res.status(403).json({
      success: false,
      message: "Only founder, super admin, or a department manager can access this.",
    });
    return false;
  }

  const actorMembership = await getActorMembership(req, workspace);
  const actorDepartmentIds = new Set(
    (Array.isArray(actorMembership?.departments) ? actorMembership.departments : []).map((d) => String(d)),
  );
  if (!departmentId || !actorDepartmentIds.has(String(departmentId))) {
    res.status(403).json({
      success: false,
      message: "You can only manage documents for your own department.",
    });
    return false;
  }
  return true;
};

// Reading a department's SOPs/Policies is open to any member of that
// department (not just its manager) — employees see these read-only on their
// My Profile page.
const assertDepartmentReadAccess = async (req, res, workspace, departmentId) => {
  const actorRoleBand = getRoleBand(req.workspaceMembership?.role || "");
  if (actorRoleBand === "owner" || actorRoleBand === "super_admin") {
    return true;
  }

  const actorMembership = await getActorMembership(req, workspace);
  const actorDepartmentIds = new Set(
    (Array.isArray(actorMembership?.departments) ? actorMembership.departments : []).map((d) => String(d)),
  );
  if (!departmentId || !actorDepartmentIds.has(String(departmentId))) {
    res.status(403).json({
      success: false,
      message: "You can only view documents for your own department.",
    });
    return false;
  }
  return true;
};

// Non-throwing variant of assertDepartmentWriteAccess — used to decide
// whether a GET response should be the full (manager) view or the
// employee-visibility-filtered view, without 403-ing plain employees.
const isDepartmentManagerOrAdmin = async (req, workspace, departmentId) => {
  const actorRoleBand = getRoleBand(req.workspaceMembership?.role || "");
  if (actorRoleBand === "owner" || actorRoleBand === "super_admin") return true;
  if (actorRoleBand !== "manager") return false;
  const actorMembership = await getActorMembership(req, workspace);
  const actorDepartmentIds = new Set(
    (Array.isArray(actorMembership?.departments) ? actorMembership.departments : []).map((d) => String(d)),
  );
  return actorDepartmentIds.has(String(departmentId));
};

const isHrDepartmentName = (name = "") => {
  const normalized = String(name || "").trim().toLowerCase();
  return normalized === "hr" || normalized.startsWith("hr-") || normalized.startsWith("hr ") || normalized.includes("human resources") || normalized.includes("human-resources");
};

// A "manager" role-band member whose managed department is HR — mirrors the
// department-manager derivation already used elsewhere (a manager is always
// assigned to exactly one department).
const isHrManager = async (req, workspace) => {
  const actorRoleBand = getRoleBand(req.workspaceMembership?.role || "");
  if (actorRoleBand !== "manager") return false;

  const actorMembership = await getActorMembership(req, workspace);
  const departmentIds = Array.isArray(actorMembership?.departments) ? actorMembership.departments : [];
  if (departmentIds.length === 0) return false;

  const departments = await Department.find({ _id: { $in: departmentIds }, workspaceId: workspace._id })
    .select("name")
    .lean();
  return departments.some((department) => isHrDepartmentName(department?.name));
};

// Company-wide (scope: "company") SOPs/Policies are workspace-level — every
// member can read them (they're surfaced read-only on Company Profile), but
// only founder, super_admin, or the HR department manager may upload, rename
// or retire them.
const assertCompanyDocumentWriteAccess = async (req, res, workspace) => {
  const actorRoleBand = getRoleBand(req.workspaceMembership?.role || "");
  if (actorRoleBand === "owner" || actorRoleBand === "super_admin") return true;
  if (await isHrManager(req, workspace)) return true;
  res.status(403).json({
    success: false,
    message: "Only founder, super admin, or the HR department manager can manage company-wide documents.",
  });
  return false;
};

// Active WorkspaceMember _ids belonging to the given department — the
// department's roster, used both to validate visibleEmployeeIds and to
// render the "who can see this" checklist client-side.
const getDepartmentRosterMemberIds = async (workspaceId, departmentId) => {
  const roster = await WorkspaceMember.find({
    workspace: workspaceId,
    departments: departmentId,
    isActive: true,
  })
    .select("_id")
    .lean();
  return new Set(roster.map((member) => String(member._id)));
};

const decorateDocument = (doc, departmentNameById) => ({
  ...doc,
  departmentName: doc.departmentId ? departmentNameById.get(String(doc.departmentId)) || "" : "",
  assignedDepartmentNames: (Array.isArray(doc.assignedDepartmentIds) ? doc.assignedDepartmentIds : [])
    .map((id) => departmentNameById.get(String(id)))
    .filter(Boolean),
});

export const getDepartmentDocuments = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;

    const scope = String(req.query?.scope || "department").trim() === "company" ? "company" : "department";
    const docType = String(req.query?.docType || "").trim();
    if (!["sop", "policy"].includes(docType)) {
      return res.status(400).json({ success: false, message: "A valid docType is required." });
    }

    if (scope === "company") {
      // Read access is open to every workspace member — company docs are
      // surfaced read-only on everyone's Company Profile page.
      const documents = await DepartmentDocument.find({
        workspaceId: workspace._id,
        scope: "company",
        docType,
      })
        .sort({ createdAt: -1 })
        .lean();
      return res.status(200).json({ success: true, data: { documents } });
    }

    const view = String(req.query?.view || "mine").trim() === "all" ? "all" : "mine";
    if (view === "all") {
      // Founder/super_admin see everything unconditionally; the HR
      // department manager also gets the full cross-department picture
      // (per Company Management's HR-manager write access) so they can see
      // every department's SOPs/Policies from their own My Profile.
      const actorRoleBand = getRoleBand(req.workspaceMembership?.role || "");
      const allowed = actorRoleBand === "owner" || actorRoleBand === "super_admin" || (await isHrManager(req, workspace));
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "Only founder, super admin, or the HR department manager can view every department's documents.",
        });
      }

      const [documents, departments] = await Promise.all([
        DepartmentDocument.find({ workspaceId: workspace._id, scope: "department", docType })
          .sort({ createdAt: -1 })
          .lean(),
        Department.find({ workspaceId: workspace._id }).select("name").lean(),
      ]);
      const departmentNameById = new Map(departments.map((d) => [String(d._id), d.name]));
      return res.status(200).json({
        success: true,
        data: { documents: documents.map((doc) => decorateDocument(doc, departmentNameById)) },
      });
    }

    const departmentId = String(req.query?.departmentId || "").trim();
    if (!departmentId) {
      return res.status(400).json({ success: false, message: "departmentId is required." });
    }
    if (!(await assertDepartmentReadAccess(req, res, workspace, departmentId))) return;

    const documents = await DepartmentDocument.find({
      workspaceId: workspace._id,
      docType,
      $or: [{ departmentId }, { assignedDepartmentIds: departmentId }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const departments = await Department.find({ workspaceId: workspace._id }).select("name").lean();
    const departmentNameById = new Map(departments.map((d) => [String(d._id), d.name]));
    const decorated = documents.map((doc) => decorateDocument(doc, departmentNameById));

    // Managers/owner/super_admin of this department see everything owned by
    // or assigned to it. Plain employees only see docs they've specifically
    // been granted visibility on.
    const canManage = await isDepartmentManagerOrAdmin(req, workspace, departmentId);
    if (canManage) {
      return res.status(200).json({ success: true, data: { documents: decorated } });
    }

    const actorMembership = await getActorMembership(req, workspace);
    const actorMemberId = String(actorMembership?._id || "");
    const visible = decorated.filter((doc) =>
      (Array.isArray(doc.visibleEmployeeIds) ? doc.visibleEmployeeIds : []).some((id) => String(id) === actorMemberId),
    );
    return res.status(200).json({ success: true, data: { documents: visible } });
  } catch (error) {
    next(error);
  }
};

export const uploadDepartmentDocument = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;

    const scope = String(req.body?.scope || "department").trim() === "company" ? "company" : "department";
    const docType = String(req.body?.docType || "").trim();
    const name = String(req.body?.name || "").trim();
    if (!["sop", "policy"].includes(docType)) {
      return res.status(400).json({ success: false, message: "A valid docType is required." });
    }
    if (!name) {
      return res.status(400).json({ success: false, message: "Document name is required." });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided." });
    }

    if (scope === "company") {
      if (!(await assertCompanyDocumentWriteAccess(req, res, workspace))) return;

      const safeName = normalizeFileName(req.file.originalname || name);
      const route = `company-documents/${workspace._id}/${docType}/${Date.now()}-${safeName}`;
      const uploaded = await uploadFileToS3(route, req.file);

      const document = await DepartmentDocument.create({
        workspaceId: workspace._id,
        scope: "company",
        docType,
        name,
        fileUrl: uploaded.url,
        filePublicId: uploaded.id,
        uploadedBy: req.user,
      });

      return res.status(201).json({ success: true, data: { document } });
    }

    const departmentId = String(req.body?.departmentId || "").trim();
    if (!departmentId) {
      return res.status(400).json({ success: false, message: "departmentId is required." });
    }
    if (!(await assertDepartmentWriteAccess(req, res, workspace, departmentId))) return;

    const department = await Department.findOne({ _id: departmentId, workspaceId: workspace._id }).lean();
    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found." });
    }

    // "Also share with" other departments — e.g. Finance sharing a billing
    // SOP with Tech + Maintenance. Silently drop invalid ids / the owner
    // department itself rather than erroring, since this is a best-effort list.
    let assignedDepartmentIds = [];
    const rawAssigned = req.body?.assignedDepartmentIds;
    if (rawAssigned) {
      try {
        const parsed = JSON.parse(rawAssigned);
        if (Array.isArray(parsed)) {
          const candidateIds = [...new Set(parsed.map((id) => String(id || "").trim()).filter(Boolean))]
            .filter((id) => id !== departmentId);
          if (candidateIds.length > 0) {
            const validDepartments = await Department.find({
              _id: { $in: candidateIds },
              workspaceId: workspace._id,
            })
              .select("_id")
              .lean();
            assignedDepartmentIds = validDepartments.map((d) => d._id);
          }
        }
      } catch {
        // ignore malformed payload — treat as no cross-department sharing
      }
    }

    // Employees of the OWNER department who should see this immediately.
    // (Assigned departments' employees are opted in later by their own
    // manager via updateDepartmentDocumentVisibility.)
    let visibleEmployeeIds = [];
    const rawVisible = req.body?.visibleEmployeeIds;
    if (rawVisible) {
      try {
        const parsed = JSON.parse(rawVisible);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const rosterIds = await getDepartmentRosterMemberIds(workspace._id, departmentId);
          visibleEmployeeIds = parsed
            .map((id) => String(id || "").trim())
            .filter((id) => rosterIds.has(id));
        }
      } catch {
        // ignore malformed payload — no employees granted visibility yet
      }
    }

    const safeName = normalizeFileName(req.file.originalname || name);
    const route = `department-documents/${workspace._id}/${departmentId}/${docType}/${Date.now()}-${safeName}`;
    const uploaded = await uploadFileToS3(route, req.file);

    const document = await DepartmentDocument.create({
      workspaceId: workspace._id,
      departmentId,
      assignedDepartmentIds,
      visibleEmployeeIds,
      scope: "department",
      docType,
      name,
      fileUrl: uploaded.url,
      filePublicId: uploaded.id,
      uploadedBy: req.user,
    });

    return res.status(201).json({ success: true, data: { document } });
  } catch (error) {
    next(error);
  }
};

export const updateDepartmentDocument = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;

    const document = await DepartmentDocument.findOne({
      _id: req.params.documentId,
      workspaceId: workspace._id,
    });
    if (!document) return res.status(404).json({ success: false, message: "Document not found." });
    if (document.scope === "company") {
      if (!(await assertCompanyDocumentWriteAccess(req, res, workspace))) return;
    } else if (!(await assertDepartmentWriteAccess(req, res, workspace, document.departmentId))) {
      return;
    }

    const nextName = String(req.body?.name || "").trim();
    if (!nextName) {
      return res.status(400).json({ success: false, message: "Document name is required." });
    }
    document.name = nextName;

    // Replacing the PDF is optional — a plain rename sends no file.
    if (req.file) {
      const safeName = normalizeFileName(req.file.originalname || nextName);
      const route =
        document.scope === "company"
          ? `company-documents/${workspace._id}/${document.docType}/${Date.now()}-${safeName}`
          : `department-documents/${workspace._id}/${document.departmentId}/${document.docType}/${Date.now()}-${safeName}`;
      const uploaded = await uploadFileToS3(route, req.file);
      const previousFileUrl = document.fileUrl;
      document.fileUrl = uploaded.url;
      document.filePublicId = uploaded.id;
      if (previousFileUrl) {
        deleteFileFromS3ByUrl(previousFileUrl).catch(() => {
          // best-effort cleanup — an orphaned old file isn't worth failing the request over
        });
      }
    }

    await document.save();

    return res.status(200).json({ success: true, data: { document } });
  } catch (error) {
    next(error);
  }
};

export const toggleDepartmentDocumentStatus = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;

    const document = await DepartmentDocument.findOne({
      _id: req.params.documentId,
      workspaceId: workspace._id,
    });
    if (!document) return res.status(404).json({ success: false, message: "Document not found." });
    if (document.scope === "company") {
      if (!(await assertCompanyDocumentWriteAccess(req, res, workspace))) return;
    } else if (!(await assertDepartmentWriteAccess(req, res, workspace, document.departmentId))) {
      return;
    }

    document.isActive = Boolean(req.body?.isActive);
    await document.save();

    return res.status(200).json({ success: true, data: { document } });
  } catch (error) {
    next(error);
  }
};

// A stakeholder department's manager (the owner department, or any
// department this doc has been assigned/shared to) chooses which of their
// OWN department's employees can see it. Only touches ids belonging to
// `departmentId`'s roster — other departments' selections are left alone.
export const updateDepartmentDocumentVisibility = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;

    const document = await DepartmentDocument.findOne({
      _id: req.params.documentId,
      workspaceId: workspace._id,
      scope: "department",
    });
    if (!document) return res.status(404).json({ success: false, message: "Document not found." });

    const departmentId = String(req.body?.departmentId || "").trim();
    const isOwnerDepartment = String(document.departmentId || "") === departmentId;
    const isAssignedDepartment = (document.assignedDepartmentIds || []).some((id) => String(id) === departmentId);
    if (!departmentId || (!isOwnerDepartment && !isAssignedDepartment)) {
      return res.status(400).json({
        success: false,
        message: "departmentId must be this document's owner department or one it's assigned to.",
      });
    }
    if (!(await assertDepartmentWriteAccess(req, res, workspace, departmentId))) return;

    const rosterIds = await getDepartmentRosterMemberIds(workspace._id, departmentId);
    const requestedIds = new Set(
      (Array.isArray(req.body?.employeeIds) ? req.body.employeeIds : [])
        .map((id) => String(id || "").trim())
        .filter((id) => rosterIds.has(id)),
    );

    // Replace only this department's slice of visibleEmployeeIds — ids
    // belonging to other stakeholder departments are untouched.
    const kept = (document.visibleEmployeeIds || []).filter((id) => !rosterIds.has(String(id)));
    document.visibleEmployeeIds = [...kept, ...requestedIds];

    // Only the owner department may change who this doc is further
    // assigned/shared to — a department that received it as "assigned" can
    // only manage its own employees' visibility, not re-share it onward.
    if (isOwnerDepartment && Array.isArray(req.body?.assignedDepartmentIds)) {
      const candidateIds = [...new Set(req.body.assignedDepartmentIds.map((id) => String(id || "").trim()).filter(Boolean))]
        .filter((id) => id !== departmentId);
      if (candidateIds.length > 0) {
        const validDepartments = await Department.find({
          _id: { $in: candidateIds },
          workspaceId: workspace._id,
        })
          .select("_id")
          .lean();
        document.assignedDepartmentIds = validDepartments.map((d) => d._id);
      } else {
        document.assignedDepartmentIds = [];
      }
    }

    await document.save();

    return res.status(200).json({ success: true, data: { document } });
  } catch (error) {
    next(error);
  }
};

// Streams a document's PDF bytes back to the browser with
// Content-Disposition: attachment, proxying S3 through the API server so the
// frontend never fetches the S3 bucket directly (whose CORS config would
// otherwise block the blob download). Access rules mirror getDepartmentDocuments:
// - scope "company" → open to every workspace member.
// - owner/super_admin and the HR department manager → everything.
// - a manager of the owning/assigned department → the document.
// - a plain member → only if they're in a stakeholder department AND the doc
//   was explicitly granted visibility to their WorkspaceMember id.
const assertDepartmentDocumentDownloadAccess = async (req, res, workspace, document) => {
  if (document.scope === "company") return true;

  const actorRoleBand = getRoleBand(req.workspaceMembership?.role || "");
  if (actorRoleBand === "owner" || actorRoleBand === "super_admin") return true;
  if (await isHrManager(req, workspace)) return true;

  const actorMembership = await getActorMembership(req, workspace);
  const actorDepartmentIds = new Set(
    (Array.isArray(actorMembership?.departments) ? actorMembership.departments : []).map((d) => String(d)),
  );

  const stakeholderDepartmentIds = [
    document.departmentId,
    ...(Array.isArray(document.assignedDepartmentIds) ? document.assignedDepartmentIds : []),
  ]
    .filter(Boolean)
    .map((id) => String(id));

  const isStakeholder = stakeholderDepartmentIds.some((id) => actorDepartmentIds.has(id));
  if (!isStakeholder) {
    res.status(403).json({
      success: false,
      message: "You can only download documents for your own department.",
    });
    return false;
  }

  // Managers of a stakeholder department always see it (mirrors
  // isDepartmentManagerOrAdmin); admin band members are filtered like plain
  // employees by the visibility list.
  if (actorRoleBand === "manager") return true;

  const actorMemberId = String(actorMembership?._id || "");
  const isVisible = (Array.isArray(document.visibleEmployeeIds) ? document.visibleEmployeeIds : []).some(
    (id) => String(id) === actorMemberId,
  );
  if (!isVisible) {
    res.status(403).json({
      success: false,
      message: "This document is not visible to you.",
    });
    return false;
  }
  return true;
};

export const downloadDepartmentDocument = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;

    const document = await DepartmentDocument.findOne({
      _id: req.params.documentId,
      workspaceId: workspace._id,
    }).lean();
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found." });
    }

    if (!(await assertDepartmentDocumentDownloadAccess(req, res, workspace, document))) return;

    const { data, contentType } = await getFileFromS3ByUrl(document.fileUrl);

    const baseName = normalizeFileName(document.name) || "Document";
    const extension = (document.fileUrl.split(".").pop() || "pdf").toLowerCase();

    res.setHeader("Content-Type", contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${baseName}.${extension}"`);
    res.setHeader("Content-Length", String(data.length));
    return res.status(200).send(data);
  } catch (error) {
    next(error);
  }
};
