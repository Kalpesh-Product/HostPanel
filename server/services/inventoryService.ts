// @ts-nocheck
import mongoose from "mongoose";
import { Inventory } from "../models/Inventory.js";

function getUserId(userId) {
  return userId || null;
}

function toObjId(id) {
  try {
    if (!id) return null;
    if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
    return null;
  } catch {
    return null;
  }
}

function normalizeInventoryInput(input = {}) {
  return {
    name: String(input.name || "").trim(),
    category: input.category,
    trackingType: input.trackingType,
    departmentId: input.departmentId ?? null,
    department: String(input.department || "").trim(),
    location: String(input.location || "").trim(),
    totalQuantity: Number(input.totalQuantity ?? 0),
    availableQuantity: Number(input.availableQuantity ?? input.totalQuantity ?? 0),
    inventoryCode: String(input.inventoryCode || "").trim(),
    inventoryNumber: Number(input.inventoryNumber ?? 0),
    ledger: Array.isArray(input.ledger) ? input.ledger : [],
  };
}

function getRoleBand(role) {
  const r = String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (r === "founder" || r === "owner") return "owner";
  if (r === "super_admin" || r === "superadmin") return "super_admin";
  if (r === "admin" || r === "admin_manager") return "admin";
  if (r === "manager") return "manager";
  return "employee";
}

function buildRoleFilter(roleBand, userId, assignedDepartmentNames = []) {
  if (roleBand === "owner" || roleBand === "super_admin") {
    return {};
  }
  if (roleBand === "admin" || roleBand === "manager") {
    if (assignedDepartmentNames.length > 0) {
      const escaped = assignedDepartmentNames.map((d) =>
        d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      );
      return { departmentName: { $regex: new RegExp(`^(${escaped.join("|")})$`, "i") } };
    }
    return { addedByUserId: toObjId(userId) };
  }
  return { _id: null };
}

export async function listInventoryForCurrentUser(userId, query = {}) {
  const { workspaceId, departmentId, category, trackingType, search } = query;
  const roleBand = query.roleBand || "employee";
  const assignedDepartmentNames = Array.isArray(query.assignedDepartmentNames)
    ? query.assignedDepartmentNames
    : [];

  if (!workspaceId) {
    const err = new Error("workspaceId is required in query for listing inventory.");
    err.statusCode = 400;
    throw err;
  }

  const filter = { workspaceId: new mongoose.Types.ObjectId(String(workspaceId)) };

  const roleFilter = buildRoleFilter(roleBand, userId, assignedDepartmentNames);
  Object.assign(filter, roleFilter);

  if (departmentId) filter.departmentId = toObjId(departmentId);
  if (query.department) filter.departmentName = query.department;
  if (category) filter.category = category;
  if (trackingType) filter.trackingType = trackingType;

  if (search) {
    const s = String(search);
    filter.$or = [
      { inventoryCode: { $regex: s, $options: "i" } },
      { name: { $regex: s, $options: "i" } },
    ];
  }

  const page = Math.max(1, parseInt(String(query.page || 1), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || 500), 10)));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Inventory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    Inventory.countDocuments(filter),
  ]);

  return {
    inventory: items.map((x) => ({
      ...x,
      ledger: x.ledger || [],
      department: x.departmentName || "Unassigned",
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function createInventoryForCurrentUser(userId, input) {
  const payload = normalizeInventoryInput(input);

  const { workspaceId, roleBand, assignedDepartmentNames } = input;
  if (!workspaceId) {
    const err = new Error("workspaceId is required in body to create inventory.");
    err.statusCode = 400;
    throw err;
  }

  const ownerId = getUserId(userId);
  if (!ownerId) {
    const err = new Error("userId missing.");
    err.statusCode = 401;
    throw err;
  }

  const band = getRoleBand(roleBand);
  if (band === "employee") {
    const err = new Error("You do not have permission to create inventory items.");
    err.statusCode = 403;
    throw err;
  }

  if (band === "admin" || band === "manager") {
    const deptName = payload.department;
    if (!deptName) {
      const err = new Error("department is required.");
      err.statusCode = 400;
      throw err;
    }
    const allowed = (assignedDepartmentNames || []).some(
      (d) => d.toLowerCase().trim() === deptName.toLowerCase().trim()
    );
    if (!allowed) {
      const err = new Error("You can only create inventory for your assigned departments.");
      err.statusCode = 403;
      throw err;
    }
  }

  const lastItem = await Inventory.findOne({ workspaceId: new mongoose.Types.ObjectId(String(workspaceId)) })
    .sort({ inventoryNumber: -1 })
    .select("inventoryNumber")
    .lean()
    .exec();

  const inventoryNumber = (lastItem?.inventoryNumber || 0) + 1;
  const inventoryCode = payload.inventoryCode || `INV-${String(inventoryNumber).padStart(4, "0")}`;

  const totalQuantity = Math.max(0, Number(payload.totalQuantity || 0));
  const availableQuantity = Math.max(0, Number(payload.availableQuantity || totalQuantity));

  const ledger = totalQuantity > 0
    ? [
        {
          dateLabel: "Today",
          qty: totalQuantity,
          target: payload.department || "Initial",
          action: "Initial Stock Created",
        },
      ]
    : [];

  const doc = await Inventory.create({
    workspaceId: new mongoose.Types.ObjectId(String(workspaceId)),
    ownerId: new mongoose.Types.ObjectId(String(ownerId)),
    addedByUserId: new mongoose.Types.ObjectId(String(ownerId)),
    addedByRole: band,
    inventoryNumber,
    inventoryCode,
    name: payload.name || "Inventory Item",
    category: payload.category || "Physical",
    trackingType: payload.trackingType || "Consumable",
    departmentId: payload.departmentId ? toObjId(payload.departmentId) : null,
    departmentName: payload.department || "",
    location: payload.location || "",
    totalQuantity,
    availableQuantity,
    ledger: payload.ledger?.length ? payload.ledger : ledger,
  });

  return { inventoryItem: { ...doc.toObject(), department: doc.departmentName || "Unassigned" } };
}

export async function updateInventoryForCurrentUser(userId, inventoryId, input) {
  if (!inventoryId) {
    const err = new Error("inventoryId is required.");
    err.statusCode = 400;
    throw err;
  }

  const roleBand = getRoleBand(input.roleBand);
  const assignedDepartmentNames = Array.isArray(input.assignedDepartmentNames)
    ? input.assignedDepartmentNames
    : [];

  const existing = await Inventory.findById(inventoryId).lean().exec();
  if (!existing) {
    const err = new Error("Inventory item not found.");
    err.statusCode = 404;
    throw err;
  }

  if (roleBand === "admin" || roleBand === "manager") {
    const itemDept = String(existing.departmentName || "").toLowerCase().trim();
    const allowed = assignedDepartmentNames.some(
      (d) => d.toLowerCase().trim() === itemDept
    );
    if (!allowed) {
      const err = new Error("You can only update inventory in your assigned departments.");
      err.statusCode = 403;
      throw err;
    }
  }

  if (input.actionType === "increase" || input.actionType === "decrease") {
    const qty = Math.max(0, Number(input.quantity || 0));
    if (!qty || qty < 1) {
      const err = new Error("quantity must be >= 1");
      err.statusCode = 400;
      throw err;
    }

    const doc = await Inventory.findById(inventoryId).exec();
    if (!doc) {
      const err = new Error("Inventory item not found.");
      err.statusCode = 404;
      throw err;
    }

    if (input.actionType === "increase") {
      doc.totalQuantity += qty;
      doc.availableQuantity += qty;
      doc.ledger.unshift({
        dateLabel: "Today",
        qty,
        target: existing.departmentName || "Stock",
        action: input.reason || "Stock Increased",
      });
    } else {
      if (doc.availableQuantity < qty) {
        const err = new Error("Decrease quantity exceeds available stock.");
        err.statusCode = 400;
        throw err;
      }
      doc.totalQuantity -= qty;
      doc.availableQuantity -= qty;
      doc.ledger.unshift({
        dateLabel: "Today",
        qty,
        target: existing.departmentName || "Stock",
        action: input.reason || "Utilized",
      });
    }

    await doc.save();
    return { inventoryItem: { ...doc.toObject(), department: doc.departmentName || "Unassigned" } };
  }

  const update = {};
  if (input.name !== undefined) update.name = String(input.name).trim();
  if (input.category !== undefined) update.category = input.category;
  if (input.trackingType !== undefined) update.trackingType = input.trackingType;
  if (input.departmentId !== undefined) update.departmentId = input.departmentId ? toObjId(input.departmentId) : null;
  if (input.department !== undefined) update.departmentName = String(input.department).trim();
  if (input.location !== undefined) update.location = String(input.location).trim();
  if (input.totalQuantity !== undefined) update.totalQuantity = Math.max(0, Number(input.totalQuantity));
  if (input.availableQuantity !== undefined) update.availableQuantity = Math.max(0, Number(input.availableQuantity));
  if (Array.isArray(input.ledger)) update.ledger = input.ledger;

  const doc = await Inventory.findByIdAndUpdate(inventoryId, update, {
    new: true,
    runValidators: true,
  })
    .lean()
    .exec();

  return { inventoryItem: { ...doc, department: doc.departmentName || "Unassigned" } };
}

export async function allocateInventoryForCurrentUser(userId, inventoryId, input) {
  const { quantity, employeeUserId, employee, note } = input || {};
  const roleBand = getRoleBand(input.roleBand);
  const assignedDepartmentNames = Array.isArray(input.assignedDepartmentNames)
    ? input.assignedDepartmentNames
    : [];

  const qty = Math.max(0, Number(quantity || 0));
  if (!qty || qty < 1) {
    const err = new Error("quantity must be >= 1");
    err.statusCode = 400;
    throw err;
  }

  const doc = await Inventory.findById(inventoryId).exec();
  if (!doc) {
    const err = new Error("Inventory item not found.");
    err.statusCode = 404;
    throw err;
  }

  if (roleBand === "admin" || roleBand === "manager") {
    const itemDept = String(doc.departmentName || "").toLowerCase().trim();
    const allowed = assignedDepartmentNames.some(
      (d) => d.toLowerCase().trim() === itemDept
    );
    if (!allowed) {
      const err = new Error("You can only allocate inventory in your assigned departments.");
      err.statusCode = 403;
      throw err;
    }
  }

  if (doc.availableQuantity < qty) {
    const err = new Error("Allocation quantity exceeds available stock.");
    err.statusCode = 400;
    throw err;
  }

  doc.availableQuantity -= qty;
  doc.ledger.unshift({
    dateLabel: "Today",
    qty,
    target: employee ? String(employee) : employeeUserId ? String(employeeUserId) : "Employee",
    action: note || "Allocated to Employee",
  });

  await doc.save();

  return { inventoryItem: doc };
}

export async function transferInventoryForCurrentUser(userId, inventoryId, input) {
  const { targetDepartment, targetDepartmentId, quantity, roleBand } = input || {};
  const band = getRoleBand(roleBand);
  const assignedDepartmentNames = Array.isArray(input.assignedDepartmentNames)
    ? input.assignedDepartmentNames
    : [];

  if (band === "employee") {
    const err = new Error("You do not have permission to transfer inventory.");
    err.statusCode = 403;
    throw err;
  }

  const qty = Math.max(0, Number(quantity || 0));
  if (!targetDepartment) {
    const err = new Error("targetDepartment is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!qty || qty < 1) {
    const err = new Error("quantity must be >= 1");
    err.statusCode = 400;
    throw err;
  }

  const source = await Inventory.findById(inventoryId).exec();
  if (!source) {
    const err = new Error("Inventory item not found.");
    err.statusCode = 404;
    throw err;
  }

  if (band === "admin" || band === "manager") {
    const itemDept = String(source.departmentName || "").toLowerCase().trim();
    const allowed = assignedDepartmentNames.some(
      (d) => d.toLowerCase().trim() === itemDept
    );
    if (!allowed) {
      const err = new Error("You can only transfer inventory out of your assigned departments.");
      err.statusCode = 403;
      throw err;
    }
  }

  if (String(targetDepartment).toLowerCase().trim() === String(source.departmentName || "").toLowerCase().trim()) {
    const err = new Error("Target department must be different from the source department.");
    err.statusCode = 400;
    throw err;
  }

  if (source.availableQuantity < qty) {
    const err = new Error("Transfer quantity exceeds available stock.");
    err.statusCode = 400;
    throw err;
  }

  source.availableQuantity -= qty;
  source.ledger.unshift({
    dateLabel: "Today",
    qty,
    target: String(targetDepartment),
    action: "Transferred Out",
  });

  await source.save();

  const target = await Inventory.findOne({
    workspaceId: source.workspaceId,
    name: source.name,
    category: source.category,
    trackingType: source.trackingType,
    ...(targetDepartmentId ? { departmentId: toObjId(targetDepartmentId) } : {}),
    departmentName: { $regex: new RegExp(`^${targetDepartment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
  });

  if (target) {
    target.totalQuantity += qty;
    target.availableQuantity += qty;
    target.ledger.unshift({
      dateLabel: "Today",
      qty,
      target: source.departmentName || "Source",
      action: "Received via Transfer",
    });
    await target.save();
  } else {
    const lastItem = await Inventory.findOne({ workspaceId: source.workspaceId })
      .sort({ inventoryNumber: -1 })
      .select("inventoryNumber")
      .lean()
      .exec();
    const nextNumber = (lastItem?.inventoryNumber || 0) + 1;

    await Inventory.create({
      workspaceId: source.workspaceId,
      ownerId: source.ownerId,
      addedByUserId: source.addedByUserId || source.ownerId,
      addedByRole: source.addedByRole || "owner",
      inventoryNumber: nextNumber,
      inventoryCode: `INV-${String(nextNumber).padStart(4, "0")}`,
      name: source.name,
      category: source.category,
      trackingType: source.trackingType,
      departmentId: targetDepartmentId ? toObjId(targetDepartmentId) : null,
      departmentName: targetDepartment,
      totalQuantity: qty,
      availableQuantity: qty,
      ledger: [
        {
          dateLabel: "Today",
          qty,
          target: source.departmentName || "Source",
          action: "Received via Transfer",
        },
      ],
    });
  }

  return {
    sourceItem: await Inventory.findById(inventoryId).lean().exec(),
    targetItem: await Inventory.findOne({
      workspaceId: source.workspaceId,
      name: source.name,
      category: source.category,
      trackingType: source.trackingType,
      ...(targetDepartmentId ? { departmentId: toObjId(targetDepartmentId) } : { departmentName: targetDepartment }),
    }).lean().exec(),
  };
}

export async function deleteInventoryForCurrentUser(userId, inventoryId, input = {}) {
  const roleBand = getRoleBand(input.roleBand);
  const assignedDepartmentNames = Array.isArray(input.assignedDepartmentNames)
    ? input.assignedDepartmentNames
    : [];

  const existing = await Inventory.findById(inventoryId).lean().exec();
  if (!existing) {
    const err = new Error("Inventory item not found.");
    err.statusCode = 404;
    throw err;
  }

  if (roleBand === "admin" || roleBand === "manager") {
    const itemDept = String(existing.departmentName || "").toLowerCase().trim();
    const allowed = assignedDepartmentNames.some(
      (d) => d.toLowerCase().trim() === itemDept
    );
    if (!allowed) {
      const err = new Error("You can only delete inventory in your assigned departments.");
      err.statusCode = 403;
      throw err;
    }
  }

  await Inventory.findByIdAndDelete(inventoryId).lean().exec();
  return { deletedInventoryId: inventoryId };
}

export async function returnInventoryForCurrentUser(userId, inventoryId, input = {}) {
  const { quantity, returnedBy, reason, roleBand } = input || {};
  const band = getRoleBand(roleBand);
  const assignedDepartmentNames = Array.isArray(input.assignedDepartmentNames) ? input.assignedDepartmentNames : [];

  const qty = Math.max(0, Number(quantity || 0));
  if (!qty || qty < 1) {
    const err = new Error("quantity must be >= 1");
    err.statusCode = 400;
    throw err;
  }

  const doc = await Inventory.findById(inventoryId).exec();
  if (!doc) {
    const err = new Error("Inventory item not found.");
    err.statusCode = 404;
    throw err;
  }

  if (band === "admin" || band === "manager") {
    const itemDept = String(doc.departmentName || "").toLowerCase().trim();
    const allowed = assignedDepartmentNames.some(
      (d) => d.toLowerCase().trim() === itemDept
    );
    if (!allowed) {
      const err = new Error("You can only return inventory in your assigned departments.");
      err.statusCode = 403;
      throw err;
    }
  }

  const allocatedQty = doc.totalQuantity - doc.availableQuantity;
  if (qty > allocatedQty) {
    const err = new Error(`Return quantity (${qty}) exceeds allocated quantity (${allocatedQty}).`);
    err.statusCode = 400;
    throw err;
  }

  doc.availableQuantity += qty;
  doc.ledger.unshift({
    dateLabel: "Today",
    qty,
    target: returnedBy || "Employee",
    action: reason || "Item Returned",
  });

  await doc.save();
  return { inventoryItem: doc.toObject() };
}

export async function markUnderMaintenanceForCurrentUser(userId, inventoryId, input = {}) {
  const { reason, expectedDate, roleBand } = input || {};
  const band = getRoleBand(roleBand);
  const assignedDepartmentNames = Array.isArray(input.assignedDepartmentNames) ? input.assignedDepartmentNames : [];

  const doc = await Inventory.findById(inventoryId).exec();
  if (!doc) {
    const err = new Error("Inventory item not found.");
    err.statusCode = 404;
    throw err;
  }

  if (band === "admin" || band === "manager") {
    const itemDept = String(doc.departmentName || "").toLowerCase().trim();
    const allowed = assignedDepartmentNames.some(
      (d) => d.toLowerCase().trim() === itemDept
    );
    if (!allowed) {
      const err = new Error("You can only update inventory in your assigned departments.");
      err.statusCode = 403;
      throw err;
    }
  }

  doc.status = "maintenance";
  doc.ledger.unshift({
    dateLabel: "Today",
    qty: 0,
    target: expectedDate ? `Est. ${expectedDate}` : "Maintenance",
    action: reason || "Marked Under Maintenance",
  });

  await doc.save();
  return { inventoryItem: doc.toObject() };
}
