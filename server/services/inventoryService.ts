// @ts-nocheck
import mongoose from "mongoose";
import { Inventory } from "../models/Inventory.js";

// NOTE:
// This is a minimal backend implementation to expose CRUD-like Inventory APIs.
// Full UnitFlow behavior (workspace-member policies, ledger transfer rules) can be added later.

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

function getWorkspaceIdFromUser(userId) {
  // Not used in the minimal service.
  // Workspace should be provided in the request body/query or resolved in controller.
  return null;
}

function requireWorkspaceId(input) {
  const ws = input?.workspaceId || input?.workspace;
  if (!ws) {
    const err = new Error("Workspace is required");
    err.statusCode = 400;
    throw err;
  }
  return ws;
}


function normalizeInventoryInput(input = {}) {
  return {
    name: String(input.name || "").trim(),
    category: input.category,
    trackingType: input.trackingType,
    departmentId: input.departmentId ?? null,
    department: String(input.department || "").trim(),
    totalQuantity: Number(input.totalQuantity ?? 0),
    availableQuantity: Number(input.availableQuantity ?? input.totalQuantity ?? 0),
    inventoryCode: String(input.inventoryCode || "").trim(),
    inventoryNumber: Number(input.inventoryNumber ?? 0),
    ledger: Array.isArray(input.ledger) ? input.ledger : [],
  };
}

export async function listInventoryForCurrentUser(userId, query = {}) {
  const { workspaceId, departmentId, category, trackingType, search } = query;

  if (!workspaceId) {
    const err = new Error("workspaceId is required in query for listing inventory.");
    err.statusCode = 400;
    throw err;
  }

  const filter: any = { workspaceId: new mongoose.Types.ObjectId(String(workspaceId)) };
  if (departmentId) filter.departmentId = toObjId(departmentId);
  if (query.department) filter.departmentName = query.department;
  if (category) filter.category = category;
  if (trackingType) filter.trackingType = trackingType;

  if (search) {
    const s = String(search);
    filter.$or = [
      { inventoryCode: { $regex: s, $options: "i" } },
      { name: { $regex: s, $options: "i" } },
      // departmentId is ObjectId; skip for regex
    ];
  }

  const page = Math.max(1, parseInt(String(query.page || 1), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || 20), 10)));
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
      department: x.departmentName || "Unassigned"
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

  const { workspaceId } = input;
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

  // For simplicity, require inventoryCode or inventoryNumber.
  if (!payload.inventoryCode && !payload.inventoryNumber) {
    const err = new Error("inventoryCode or inventoryNumber is required.");
    err.statusCode = 400;
    throw err;
  }

  // Default ledger if initial stock > 0
  const totalQuantity = Math.max(0, Number(payload.totalQuantity || 0));
  const availableQuantity = Math.max(0, Number(payload.availableQuantity || totalQuantity));

  const ledger = totalQuantity > 0
    ? [
        {
          dateLabel: "Today",
          qty: totalQuantity,
          target: payload.departmentId ? String(payload.departmentId) : "Initial",
          action: "Initial Stock Created",
        },
      ]
    : [];

  const doc = await Inventory.create({
    workspaceId: new mongoose.Types.ObjectId(String(workspaceId)),
    ownerId: new mongoose.Types.ObjectId(String(ownerId)),
    inventoryNumber: payload.inventoryNumber || 0,
    inventoryCode: payload.inventoryCode || `INV-0`,
    name: payload.name || "Inventory Item",
    category: payload.category || "Physical",
    trackingType: payload.trackingType || "Consumable",
    departmentId: payload.departmentId ? toObjId(payload.departmentId) : null,
    departmentName: payload.department || "",
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

  const update = {};
  if (input.name !== undefined) update.name = String(input.name).trim();
  if (input.category !== undefined) update.category = input.category;
  if (input.trackingType !== undefined) update.trackingType = input.trackingType;
  if (input.departmentId !== undefined) update.departmentId = input.departmentId ? toObjId(input.departmentId) : null;
  if (input.department !== undefined) update.departmentName = String(input.department).trim();

  if (input.totalQuantity !== undefined) update.totalQuantity = Math.max(0, Number(input.totalQuantity));
  if (input.availableQuantity !== undefined) update.availableQuantity = Math.max(0, Number(input.availableQuantity));
  if (Array.isArray(input.ledger)) update.ledger = input.ledger;

  const doc = await Inventory.findByIdAndUpdate(inventoryId, update, {
    new: true,
    runValidators: true,
  })
    .lean()
    .exec();

  if (!doc) {
    const err = new Error("Inventory item not found.");
    err.statusCode = 404;
    throw err;
  }

  return { inventoryItem: { ...doc, department: doc.departmentName || "Unassigned" } };
}

export async function allocateInventoryForCurrentUser(userId, inventoryId, input) {
  const { quantity, employeeUserId, employee, note } = input || {};

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
  // Minimal transfer between departments (owner/superadmin checks not implemented)
  const { targetDepartment, quantity } = input || {};
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
    action: "Transferred Out by Owner",
  });

  await source.save();

  // Create or update target inventory item with same name/category/trackingType
  const target = await Inventory.findOne({
    workspaceId: source.workspaceId,
    ownerId: source.ownerId,
    name: source.name,
    category: source.category,
    trackingType: source.trackingType,
    departmentId: toObjId(targetDepartment),
  });

  if (target) {
    target.totalQuantity += qty;
    target.availableQuantity += qty;
    target.ledger.unshift({
      dateLabel: "Today",
      qty,
      target: source.departmentId ? String(source.departmentId) : "Source",
      action: "Received via Owner Transfer",
    });
    await target.save();
  }

  return { sourceItem: source, targetItem: target || null };
}

export async function deleteInventoryForCurrentUser(userId, inventoryId) {
  const doc = await Inventory.findByIdAndDelete(inventoryId).lean().exec();
  if (!doc) {
    const err = new Error("Inventory item not found.");
    err.statusCode = 404;
    throw err;
  }
  return { deletedInventoryId: inventoryId };
}

