import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { CafeMenuItem } from "../models/CafeMenuItem.js";
import { CafeCategory, DEFAULT_CAFE_CATEGORIES } from "../models/CafeCategory.js";
import { CafeTable } from "../models/CafeTable.js";
import { CafeSettings } from "../models/CafeSettings.js";
import {
    CAFE_RESERVATION_OPEN_STATUSES,
    CafeReservation,
    type CafeReservationStatus,
} from "../models/CafeReservation.js";
import HostUser from "../models/HostUser.js";
import Workspace from "../models/Workspace.js";
import { normalizeTimeZone } from "../utils/workspaceLocalization.js";
import {
    CAFE_OPEN_ORDER_STATUSES,
    CAFE_ORDER_STATUSES,
    CafeOrder,
    type CafeOrderStatus,
    type ICafeOrderItem,
} from "../models/CafeOrder.js";

interface AuthenticatedRequest extends Request {
    user?: string;
    workspaceMembership?: {
        workspace: string;
        role: string;
        isPrimary: boolean;
    };
}

const badRequest = (message: string) => {
    const error: any = new Error(message);
    error.statusCode = 400;
    return error;
};

const notFound = (message: string) => {
    const error: any = new Error(message);
    error.statusCode = 404;
    return error;
};

const conflict = (message: string) => {
    const error: any = new Error(message);
    error.statusCode = 409;
    return error;
};

const getWorkspaceObjectId = (req: AuthenticatedRequest) => {
    const id = req.workspaceMembership?.workspace;
    if (!id || !mongoose.isValidObjectId(id)) throw badRequest("Workspace ID is required");
    return new mongoose.Types.ObjectId(id);
};

const getOptionalUserObjectId = (req: AuthenticatedRequest) =>
    req.user && mongoose.isValidObjectId(req.user) ? new mongoose.Types.ObjectId(req.user) : null;

const parseObjectId = (value: unknown, message: string) => {
    if (!mongoose.isValidObjectId(String(value || ""))) throw badRequest(message);
    return new mongoose.Types.ObjectId(String(value));
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const parsePrice = (value: unknown) => {
    const numericPrice = Number(value);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) throw badRequest("Enter a valid price.");
    return roundMoney(numericPrice);
};

const findOpenOrderForTable = (workspaceId: mongoose.Types.ObjectId, tableId: mongoose.Types.ObjectId) =>
    CafeOrder.findOne({
        workspaceId,
        tableId,
        status: { $in: CAFE_OPEN_ORDER_STATUSES },
    });

export async function listCafeMenuItems(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const items = await CafeMenuItem.find({ workspaceId })
            .sort({ category: 1, sortOrder: 1, name: 1 })
            .lean();
        res.status(200).json({ success: true, message: "Menu loaded successfully.", data: items });
    } catch (error) {
        next(error);
    }
}

export async function createCafeMenuItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const { name, category, description, price, isAvailable, sortOrder } = req.body || {};

        if (!String(name || "").trim()) throw badRequest("Item name is required.");

        const item = await CafeMenuItem.create({
            workspaceId,
            name: String(name).trim(),
            category: String(category || "").trim() || "Uncategorised",
            description: String(description || "").trim(),
            price: parsePrice(price),
            isAvailable: isAvailable === undefined ? true : Boolean(isAvailable),
            sortOrder: Number(sortOrder) || 0,
            createdBy: getOptionalUserObjectId(req),
        });

        res.status(201).json({ success: true, message: "Menu item added successfully.", data: item });
    } catch (error) {
        next(error);
    }
}

export async function bulkCreateCafeMenuItems(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const items = Array.isArray(req.body?.items) ? req.body.items : [];
        if (!items.length || items.length > 500) throw badRequest("Add between 1 and 500 menu items.");

        const createdBy = getOptionalUserObjectId(req);
        const documents = items.map((item: any, index: number) => {
            const name = String(item?.name || "").trim();
            if (!name) throw badRequest(`Item ${index + 1} needs a name.`);
            return {
                workspaceId,
                createdBy,
                name,
                category: String(item?.category || "Uncategorised").trim() || "Uncategorised",
                description: String(item?.description || "").trim(),
                price: parsePrice(item?.price),
                isAvailable: item?.isAvailable !== false,
                sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index,
            };
        });
        const created = await CafeMenuItem.insertMany(documents, { ordered: true });
        res.status(201).json({ success: true, message: `${created.length} menu items added.`, data: created });
    } catch (error) {
        next(error);
    }
}

const defaultCafeSettings = {
    companyName: "",
    googleReviewUrl: "",
    showReviewQr: false,
    taxPercent: 0,
    cafeStartTime: "06:00",
};

export async function getCafeSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const settings = await CafeSettings.findOne({ workspaceId }).lean();
        res.status(200).json({ success: true, message: "Cafe settings loaded.", data: settings || defaultCafeSettings });
    } catch (error) {
        next(error);
    }
}

export async function updateCafeSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const taxPercent = Number(req.body?.taxPercent ?? 0);
        if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) throw badRequest("Tax must be between 0 and 100.");
        const cafeStartTime = String(req.body?.cafeStartTime || "06:00");
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cafeStartTime)) throw badRequest("Enter a valid cafe start time.");
        const googleReviewUrl = String(req.body?.googleReviewUrl || "").trim();
        if (googleReviewUrl && !/^https?:\/\//i.test(googleReviewUrl)) throw badRequest("Google review link must be a valid URL.");

        const settings = await CafeSettings.findOneAndUpdate(
            { workspaceId },
            {
                $set: {
                    companyName: String(req.body?.companyName || "").trim(),
                    googleReviewUrl,
                    showReviewQr: Boolean(req.body?.showReviewQr && googleReviewUrl),
                    taxPercent: roundMoney(taxPercent),
                    cafeStartTime,
                },
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
        ).lean();
        res.status(200).json({ success: true, message: "Cafe settings saved.", data: settings });
    } catch (error) {
        next(error);
    }
}

export async function updateCafeMenuItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const itemId = parseObjectId(req.params.itemId, "Invalid menu item.");
        const { name, category, description, price, isAvailable, sortOrder } = req.body || {};

        const updates: Record<string, unknown> = {};
        if (name !== undefined) {
            if (!String(name).trim()) throw badRequest("Item name is required.");
            updates.name = String(name).trim();
        }
        if (category !== undefined) updates.category = String(category).trim() || "Uncategorised";
        if (description !== undefined) updates.description = String(description).trim();
        if (price !== undefined) updates.price = parsePrice(price);
        if (isAvailable !== undefined) updates.isAvailable = Boolean(isAvailable);
        if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder) || 0;

        const item = await CafeMenuItem.findOneAndUpdate(
            { _id: itemId, workspaceId },
            { $set: updates },
            { new: true, runValidators: true }
        ).lean();
        if (!item) throw notFound("Menu item not found.");

        res.status(200).json({ success: true, message: "Menu item updated successfully.", data: item });
    } catch (error) {
        next(error);
    }
}

export async function deleteCafeMenuItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const itemId = parseObjectId(req.params.itemId, "Invalid menu item.");
        const deleted = await CafeMenuItem.findOneAndDelete({ _id: itemId, workspaceId }).lean();
        if (!deleted) throw notFound("Menu item not found.");

        res.status(200).json({ success: true, message: "Menu item deleted successfully.", data: { _id: itemId } });
    } catch (error) {
        next(error);
    }
}

export async function listCafeCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const existing = await CafeCategory.countDocuments({ workspaceId });
        if (existing === 0) {
            await CafeCategory.insertMany(
                DEFAULT_CAFE_CATEGORIES.map((name, index) => ({ workspaceId, name, sortOrder: index })),
            );
        }
        const categories = await CafeCategory.find({ workspaceId }).sort({ sortOrder: 1, name: 1 }).lean();
        res.status(200).json({ success: true, message: "Categories loaded successfully.", data: categories });
    } catch (error) {
        next(error);
    }
}

export async function createCafeCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const name = String(req.body?.name || "").trim();
        if (!name) throw badRequest("Category name is required.");

        const last = await CafeCategory.findOne({ workspaceId }).sort({ sortOrder: -1 }).select("sortOrder").lean();
        const category = await CafeCategory.create({
            workspaceId,
            name,
            sortOrder: (last?.sortOrder ?? -1) + 1,
        });
        res.status(201).json({ success: true, message: "Category added successfully.", data: category });
    } catch (error: any) {
        if (error?.code === 11000) return next(conflict("This category already exists."));
        next(error);
    }
}

export async function deleteCafeCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const categoryId = parseObjectId(req.params.categoryId, "Invalid category.");
        const category = await CafeCategory.findOne({ _id: categoryId, workspaceId }).lean();
        if (!category) throw notFound("Category not found.");

        const itemsUsingIt = await CafeMenuItem.countDocuments({ workspaceId, category: category.name });
        if (itemsUsingIt > 0) {
            throw conflict(`${itemsUsingIt} menu item(s) use this category. Move them first.`);
        }

        await CafeCategory.deleteOne({ _id: categoryId, workspaceId });
        res.status(200).json({ success: true, message: "Category removed.", data: { _id: categoryId } });
    } catch (error) {
        next(error);
    }
}

export async function listCafeTables(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const tables = await CafeTable.find({ workspaceId }).sort({ sortOrder: 1, name: 1 }).lean();
        const openOrders = await CafeOrder.find({
            workspaceId,
            tableId: { $in: tables.map((table) => table._id) },
            status: { $in: CAFE_OPEN_ORDER_STATUSES },
        })
            .select("tableId orderNumber total status items")
            .lean();

        const openByTable = new Map(openOrders.map((order) => [String(order.tableId), order]));
        const data = tables.map((table) => {
            const order = openByTable.get(String(table._id));
            return {
                ...table,
                openOrder: order
                    ? {
                          _id: order._id,
                          orderNumber: order.orderNumber,
                          status: order.status,
                          total: order.total,
                          itemCount: order.items.reduce((sum: number, line: ICafeOrderItem) => sum + line.quantity, 0),
                      }
                    : null,
            };
        });

        res.status(200).json({ success: true, message: "Tables loaded successfully.", data });
    } catch (error) {
        next(error);
    }
}

export async function createCafeTable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const { name, seats, sortOrder } = req.body || {};
        if (!String(name || "").trim()) throw badRequest("Table name is required.");
        const numericSeats = Number(seats || 4);
        if (!Number.isInteger(numericSeats) || numericSeats < 1) throw badRequest("Seats must be at least 1.");

        const table = await CafeTable.create({
            workspaceId,
            name: String(name).trim(),
            seats: numericSeats,
            sortOrder: Number(sortOrder) || 0,
            createdBy: getOptionalUserObjectId(req),
        });

        res.status(201).json({ success: true, message: "Table added successfully.", data: table });
    } catch (error: any) {
        if (error?.code === 11000) return next(conflict("A table with this name already exists."));
        next(error);
    }
}

export async function updateCafeTable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const tableId = parseObjectId(req.params.tableId, "Invalid table.");
        const { name, seats, isActive } = req.body || {};

        const updates: Record<string, unknown> = {};
        if (name !== undefined) {
            if (!String(name).trim()) throw badRequest("Table name is required.");
            updates.name = String(name).trim();
        }
        if (seats !== undefined) {
            const numericSeats = Number(seats);
            if (!Number.isInteger(numericSeats) || numericSeats < 1) throw badRequest("Seats must be at least 1.");
            updates.seats = numericSeats;
        }
        if (isActive !== undefined) updates.isActive = Boolean(isActive);

        const table = await CafeTable.findOneAndUpdate(
            { _id: tableId, workspaceId },
            { $set: updates },
            { new: true, runValidators: true }
        ).lean();
        if (!table) throw notFound("Table not found.");

        res.status(200).json({ success: true, message: "Table updated successfully.", data: table });
    } catch (error: any) {
        if (error?.code === 11000) return next(conflict("A table with this name already exists."));
        next(error);
    }
}

export async function deleteCafeTable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const tableId = parseObjectId(req.params.tableId, "Invalid table.");

        const openOrder = await findOpenOrderForTable(workspaceId, tableId);
        if (openOrder) throw conflict("This table has an open order. Bill it before removing the table.");

        const deleted = await CafeTable.findOneAndDelete({ _id: tableId, workspaceId }).lean();
        if (!deleted) throw notFound("Table not found.");

        res.status(200).json({ success: true, message: "Table removed successfully.", data: { _id: tableId } });
    } catch (error) {
        next(error);
    }
}

export async function listCafeOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const scope = String(req.query.scope || "").trim();
        const from = req.query.from ? new Date(String(req.query.from)) : null;
        const to = req.query.to ? new Date(String(req.query.to)) : null;
        const filter: Record<string, unknown> = { workspaceId };

        if (scope === "history") {
            filter.status = { $in: ["Paid", "Cancelled"] };
        } else if (scope === "open") {
            filter.status = { $in: CAFE_OPEN_ORDER_STATUSES };
        }

        const dateFilter: Record<string, Date> = {};
        if (from && !Number.isNaN(from.getTime())) dateFilter.$gte = from;
        if (to && !Number.isNaN(to.getTime())) dateFilter.$lte = to;
        if (Object.keys(dateFilter).length) filter.createdAt = dateFilter;

        const orders = await CafeOrder.find(filter).sort({ orderNumber: -1 }).limit(500).lean();
        res.status(200).json({ success: true, message: "Orders loaded successfully.", data: orders });
    } catch (error) {
        next(error);
    }
}

export async function updateCafeOrderDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const orderId = parseObjectId(req.params.orderId, "Invalid order.");
        const { customerName, notes } = req.body || {};

        const updates: Record<string, unknown> = {};
        if (customerName !== undefined) updates.customerName = String(customerName).trim();
        if (notes !== undefined) updates.notes = String(notes).trim();

        const order = await CafeOrder.findOneAndUpdate(
            { _id: orderId, workspaceId },
            { $set: updates },
            { new: true, runValidators: true }
        ).lean();
        if (!order) throw notFound("Order not found.");

        res.status(200).json({ success: true, message: "Order details saved.", data: order });
    } catch (error) {
        next(error);
    }
}

const isValidTimeZone = (value: string) => {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
    } catch {
        return false;
    }
};

export async function getCafeAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
        const requestedTz = String(req.query.timezone || "UTC");
        const timezone = isValidTimeZone(requestedTz) ? requestedTz : "UTC";
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const match = { workspaceId, status: "Paid", billedAt: { $gte: since } };

        const [summary, topItems, peakHours, daily] = await Promise.all([
            CafeOrder.aggregate([
                { $match: match },
                { $group: { _id: null, revenue: { $sum: "$total" }, billedOrders: { $sum: 1 } } },
            ]),
            CafeOrder.aggregate([
                { $match: match },
                { $unwind: "$items" },
                {
                    $group: {
                        _id: "$items.menuItemId",
                        name: { $first: "$items.name" },
                        quantity: { $sum: "$items.quantity" },
                        revenue: { $sum: "$items.lineTotal" },
                    },
                },
                { $sort: { quantity: -1, revenue: -1 } },
                { $limit: 10 },
            ]),
            CafeOrder.aggregate([
                { $match: match },
                { $group: { _id: { $hour: { date: "$billedAt", timezone } }, orders: { $sum: 1 }, revenue: { $sum: "$total" } } },
                { $sort: { _id: 1 } },
            ]),
            CafeOrder.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$billedAt", timezone } },
                        orders: { $sum: 1 },
                        revenue: { $sum: "$total" },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);

        const totals = summary[0] || { revenue: 0, billedOrders: 0 };
        res.status(200).json({
            success: true,
            message: "Cafe analytics loaded.",
            data: {
                days,
                timezone,
                summary: {
                    revenue: roundMoney(totals.revenue || 0),
                    billedOrders: totals.billedOrders || 0,
                    averageBill: totals.billedOrders ? roundMoney(totals.revenue / totals.billedOrders) : 0,
                },
                topItems: topItems.map((item) => ({
                    menuItemId: String(item._id),
                    name: item.name,
                    quantity: item.quantity,
                    revenue: roundMoney(item.revenue),
                })),
                peakHours: peakHours.map((bucket) => ({
                    hour: bucket._id,
                    orders: bucket.orders,
                    revenue: roundMoney(bucket.revenue),
                })),
                daily: daily.map((bucket) => ({
                    date: bucket._id,
                    orders: bucket.orders,
                    revenue: roundMoney(bucket.revenue),
                })),
            },
        });
    } catch (error) {
        next(error);
    }
}

const buildOrderLines = async (
    workspaceId: mongoose.Types.ObjectId,
    items: Array<{ menuItemId?: unknown; quantity?: unknown }>,
) => {
    const requested = new Map<string, number>();
    for (const line of items) {
        const menuItemId = String(line?.menuItemId || "");
        const quantity = Number(line?.quantity);
        if (!mongoose.isValidObjectId(menuItemId)) throw badRequest("Invalid menu item in order.");
        if (!Number.isInteger(quantity) || quantity < 1) {
            throw badRequest("Quantity must be a whole number of at least 1.");
        }
        requested.set(menuItemId, (requested.get(menuItemId) || 0) + quantity);
    }

    const menuItems = await CafeMenuItem.find({
        workspaceId,
        _id: { $in: Array.from(requested.keys()) },
    }).lean();
    if (menuItems.length !== requested.size) throw badRequest("One or more menu items no longer exist.");

    const unavailable = menuItems.find((item) => !item.isAvailable);
    if (unavailable) throw badRequest(`${unavailable.name} is currently unavailable.`);

    return menuItems.map((item) => {
        const quantity = requested.get(String(item._id)) || 0;
        const unitPrice = roundMoney(Number(item.price) || 0);
        return {
            menuItemId: item._id as mongoose.Types.ObjectId,
            name: item.name,
            unitPrice,
            quantity,
            lineTotal: roundMoney(unitPrice * quantity),
        } as ICafeOrderItem;
    });
};

const mergeLines = (existing: ICafeOrderItem[], added: ICafeOrderItem[]) => {
    const merged = new Map<string, ICafeOrderItem>();
    for (const line of existing) merged.set(String(line.menuItemId), { ...line });
    for (const line of added) {
        const key = String(line.menuItemId);
        const current = merged.get(key);
        if (current) {
            current.quantity += line.quantity;
            current.lineTotal = roundMoney(current.unitPrice * current.quantity);
        } else {
            merged.set(key, line);
        }
    }
    return Array.from(merged.values());
};

export async function createCafeOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const { customerName, tableId, tableLabel, notes, items } = req.body || {};

        if (!Array.isArray(items) || items.length === 0) {
            throw badRequest("Add at least one item to the order.");
        }

        const lines = await buildOrderLines(workspaceId, items);
        const [settings, workspace] = await Promise.all([
            CafeSettings.findOne({ workspaceId }).select("taxPercent cafeStartTime").lean(),
            Workspace.findById(workspaceId).select("preferences.timezone").lean(),
        ]);
        const workspaceTimeZone = normalizeTimeZone((workspace as any)?.preferences?.timezone);
        const startTime = String(settings?.cafeStartTime || "06:00");
        const [startHour, startMinute] = startTime.split(":").map(Number);
        const currentParts = new Intl.DateTimeFormat("en-GB", {
            timeZone: workspaceTimeZone,
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
        }).formatToParts(new Date());
        const currentHour = Number(currentParts.find((part) => part.type === "hour")?.value || 0);
        const currentMinute = Number(currentParts.find((part) => part.type === "minute")?.value || 0);
        if (currentHour * 60 + currentMinute < startHour * 60 + startMinute) {
            throw conflict(`Cafe orders open at ${startTime}.`);
        }
        const taxPercent = roundMoney(Number(settings?.taxPercent || 0));
        const user = req.user ? await HostUser.findById(req.user).select("name email").lean() : null;
        const waiterName = String((user as any)?.name || (user as any)?.email || "").trim();

        if (tableId) {
            const table = await CafeTable.findOne({
                _id: parseObjectId(tableId, "Invalid table."),
                workspaceId,
            }).lean();
            if (!table) throw badRequest("This table no longer exists.");

            const openOrder = await findOpenOrderForTable(workspaceId, table._id as mongoose.Types.ObjectId);
            if (openOrder) {
                const existingLines = openOrder.items.map((line) => ({
                    menuItemId: line.menuItemId,
                    name: line.name,
                    unitPrice: line.unitPrice,
                    quantity: line.quantity,
                    lineTotal: line.lineTotal,
                })) as ICafeOrderItem[];
                openOrder.items = mergeLines(existingLines, lines) as any;
                const roundNumber = (openOrder.rounds?.length || 0) + 1;
                openOrder.rounds.push({
                    roundNumber,
                    label: `Round ${roundNumber}`,
                    items: lines,
                    status: "Sent",
                    sentToKitchenAt: new Date(),
                    servedAt: null,
                } as any);
                openOrder.subtotal = roundMoney(openOrder.items.reduce((sum, line) => sum + line.lineTotal, 0));
                openOrder.taxPercent = taxPercent;
                openOrder.taxAmount = roundMoney(openOrder.subtotal * taxPercent / 100);
                openOrder.total = roundMoney(openOrder.subtotal + openOrder.taxAmount);
                openOrder.status = "Placed";
                if (!openOrder.waiterName) openOrder.waiterName = waiterName;
                await openOrder.save();
                return res.status(200).json({ success: true, message: `Round ${roundNumber} sent to kitchen.`, data: openOrder });
            }
        }

        const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
        const taxAmount = roundMoney(subtotal * taxPercent / 100);
        const latest = await CafeOrder.findOne({ workspaceId }).sort({ orderNumber: -1 }).select("orderNumber").lean();

        const order = await CafeOrder.create({
            workspaceId,
            orderNumber: (latest?.orderNumber || 0) + 1,
            tableId: tableId ? parseObjectId(tableId, "Invalid table.") : null,
            customerName: String(customerName || "").trim(),
            tableLabel: String(tableLabel || "").trim(),
            notes: String(notes || "").trim(),
            items: lines,
            rounds: [{ roundNumber: 1, label: "Round 1", items: lines, status: "Sent", sentToKitchenAt: new Date() }],
            subtotal,
            taxPercent,
            taxAmount,
            total: roundMoney(subtotal + taxAmount),
            status: "Placed",
            createdBy: getOptionalUserObjectId(req),
            waiterName,
        });

        res.status(201).json({ success: true, message: "Order placed successfully.", data: order });
    } catch (error) {
        next(error);
    }
}

export async function updateCafeOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const orderId = parseObjectId(req.params.orderId, "Invalid order.");
        const status = String(req.body?.status || "") as CafeOrderStatus;
        const reason = String(req.body?.reason || "").trim();
        if (!CAFE_ORDER_STATUSES.includes(status) || status === "Paid") {
            throw badRequest("Invalid order status.");
        }
        if (status === "Cancelled" && !reason) {
            throw badRequest("A reason is required to void an order.");
        }

        const current = await CafeOrder.findOne({ _id: orderId, workspaceId });
        if (!current) throw notFound("Order not found.");
        if (status === "Cancelled" && ["Served", "Paid"].includes(current.status)) {
            throw conflict("A served order cannot be cancelled.");
        }

        current.status = status;
        if (status === "Cancelled") current.cancelReason = reason;
        if (status === "Served") {
            current.rounds.forEach((round) => {
                if (round.status !== "Served") {
                    round.status = "Served";
                    round.servedAt = new Date();
                }
            });
        }
        await current.save();

        res.status(200).json({ success: true, message: "Order status updated.", data: current });
    } catch (error) {
        next(error);
    }
}

export async function updateCafeOrderRound(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const orderId = parseObjectId(req.params.orderId, "Invalid order.");
        const roundNumber = Number(req.params.roundNumber);
        const status = String(req.body?.status || "");
        if (!Number.isInteger(roundNumber) || roundNumber < 1 || !["Sent", "Served"].includes(status)) throw badRequest("Invalid round update.");
        const order = await CafeOrder.findOne({ _id: orderId, workspaceId });
        if (!order) throw notFound("Order not found.");
        const round = order.rounds.find((entry) => entry.roundNumber === roundNumber);
        if (!round) throw notFound("Order round not found.");
        round.status = status as "Sent" | "Served";
        if (status === "Sent") round.sentToKitchenAt = new Date();
        if (status === "Served") round.servedAt = new Date();
        if (order.rounds.every((entry) => entry.status === "Served")) order.status = "Served";
        else if (order.status === "Placed") order.status = "Preparing";
        await order.save();
        res.status(200).json({ success: true, message: `Round ${roundNumber} marked ${status.toLowerCase()}.`, data: order });
    } catch (error) {
        next(error);
    }
}

export async function updateCafeOrderRoundItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const orderId = parseObjectId(req.params.orderId, "Invalid order.");
        const roundNumber = Number(req.params.roundNumber);
        const menuItemId = String(req.params.menuItemId || "");
        const quantity = Number(req.body?.quantity);
        const reason = String(req.body?.reason || "").trim();
        if (!Number.isInteger(roundNumber) || roundNumber < 1) throw badRequest("Invalid round.");
        if (!mongoose.isValidObjectId(menuItemId)) throw badRequest("Invalid menu item.");
        if (!Number.isInteger(quantity) || quantity < 0) throw badRequest("Quantity must be zero or a positive whole number.");
        if (!reason) throw badRequest("A reason is required to void item quantity.");

        const order = await CafeOrder.findOne({ _id: orderId, workspaceId });
        if (!order) throw notFound("Order not found.");
        if (["Served", "Paid", "Cancelled"].includes(order.status)) throw conflict("This order can no longer be edited.");

        const round = order.rounds.find((entry) => entry.roundNumber === roundNumber);
        if (!round) throw notFound("Order round not found.");
        if (round.status === "Served") throw conflict("Served items cannot be changed.");

        const lineIndex = round.items.findIndex((line) => String(line.menuItemId) === menuItemId);
        if (lineIndex === -1) throw notFound("Item not found in this round.");

        const currentLine = round.items[lineIndex];
        if (quantity >= currentLine.quantity) throw badRequest("Enter a quantity lower than the current quantity to void.");
        const voidedQuantity = currentLine.quantity - quantity;
        order.voidLog.push({
            roundNumber,
            itemName: currentLine.name,
            quantity: voidedQuantity,
            reason,
            voidedAt: new Date(),
        } as any);

        if (quantity === 0) {
            round.items.splice(lineIndex, 1);
        } else {
            round.items[lineIndex].quantity = quantity;
            round.items[lineIndex].lineTotal = roundMoney(round.items[lineIndex].unitPrice * quantity);
        }

        order.rounds = order.rounds.filter((entry) => entry.items.length > 0) as any;

        const merged = new Map<string, ICafeOrderItem>();
        for (const entry of order.rounds) {
            for (const line of entry.items) {
                const key = String(line.menuItemId);
                const existing = merged.get(key);
                if (existing) {
                    existing.quantity += line.quantity;
                    existing.lineTotal = roundMoney(existing.unitPrice * existing.quantity);
                } else {
                    merged.set(key, {
                        menuItemId: line.menuItemId,
                        name: line.name,
                        unitPrice: line.unitPrice,
                        quantity: line.quantity,
                        lineTotal: line.lineTotal,
                    });
                }
            }
        }
        if (merged.size === 0) throw conflict("An order needs at least one item — void the order instead.");

        order.items = Array.from(merged.values()) as any;
        order.subtotal = roundMoney(order.items.reduce((sum, line) => sum + line.lineTotal, 0));
        order.taxAmount = roundMoney((order.subtotal * order.taxPercent) / 100);
        order.total = roundMoney(order.subtotal + order.taxAmount);
        await order.save();

        res.status(200).json({ success: true, message: `Voided ${voidedQuantity} × ${currentLine.name}.`, data: order });
    } catch (error) {
        next(error);
    }
}

export async function billCafeOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const orderId = parseObjectId(req.params.orderId, "Invalid order.");
        const discountType = String(req.body?.discountType || "none") as "none" | "percentage" | "fixed";
        const discountValue = Number(req.body?.discountValue || 0);
        const paymentMethod = String(req.body?.paymentMethod || "").trim();
        if (!["none", "percentage", "fixed"].includes(discountType)) throw badRequest("Choose a valid discount type.");
        if (!Number.isFinite(discountValue) || discountValue < 0) throw badRequest("Enter a valid discount.");
        if (discountType === "percentage" && discountValue > 100) throw badRequest("Percentage discount cannot exceed 100%.");
        if (!paymentMethod) throw badRequest("Select a payment method.");

        const order = await CafeOrder.findOne({ _id: orderId, workspaceId, status: "Served" });
        if (!order) throw conflict("Only a served order can be settled.");
        const discountAmount = discountType === "percentage"
            ? roundMoney(order.subtotal * discountValue / 100)
            : discountType === "fixed"
                ? roundMoney(Math.min(discountValue, order.subtotal))
                : 0;
        const discountedSubtotal = roundMoney(Math.max(0, order.subtotal - discountAmount));
        const taxAmount = roundMoney(discountedSubtotal * order.taxPercent / 100);
        order.discountType = discountType;
        order.discountValue = discountType === "none" ? 0 : roundMoney(discountValue);
        order.discountAmount = discountAmount;
        order.taxAmount = taxAmount;
        order.total = roundMoney(discountedSubtotal + taxAmount);
        order.paymentMethod = paymentMethod;
        order.status = "Paid";
        order.paidAt = new Date();
        order.billedAt = order.paidAt;
        await order.save();

        res.status(200).json({ success: true, message: "Payment settled and table closed.", data: order });
    } catch (error) {
        next(error);
    }
}

// A table with a pre-assigned reservation is treated as locked for new walk-in
// orders starting this many minutes before the guest's arrival time, so a
// waiter on Cafe Orders can't accidentally seat someone else into it.
const RESERVATION_LOCK_MINUTES = 90;
// Two reservations on the same table must be at least this far apart.
const RESERVATION_CONFLICT_WINDOW_MINUTES = 90;
// A still-Confirmed reservation this far past its arrival time auto-expires to
// No-show, which also clears its table lock — no cron job needed, this just
// self-heals on the next read.
const RESERVATION_NO_SHOW_GRACE_MINUTES = 30;

const expireOverdueReservations = async (reservations: Array<Record<string, any>>) => {
    const now = Date.now();
    const overdue = reservations.filter(
        (reservation) =>
            reservation.status === "Confirmed" &&
            now - new Date(reservation.reservationAt).getTime() > RESERVATION_NO_SHOW_GRACE_MINUTES * 60 * 1000
    );
    if (!overdue.length) return;

    await CafeReservation.updateMany(
        { _id: { $in: overdue.map((reservation) => reservation._id) } },
        { $set: { status: "No-show" } }
    );
    const overdueIds = new Set(overdue.map((reservation) => String(reservation._id)));
    for (const reservation of reservations) {
        if (overdueIds.has(String(reservation._id))) reservation.status = "No-show";
    }
};

const combineDateAndTime = (dateOnly: string, time: string) => {
    const [hours, minutes] = String(time || "").split(":").map(Number);
    const date = new Date(`${dateOnly}T00:00:00`);
    if (Number.isNaN(date.getTime()) || Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    date.setHours(hours, minutes, 0, 0);
    return date;
};

const withLockStartsAt = (reservation: Record<string, any>) => ({
    ...reservation,
    lockStartsAt: new Date(new Date(reservation.reservationAt).getTime() - RESERVATION_LOCK_MINUTES * 60 * 1000),
});

export async function listCafeReservations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const dateInput = String(req.query.date || "").trim();
        const date = combineDateAndTime(dateInput, "00:00");
        if (!date) throw badRequest("Enter a valid date.");
        const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);

        const reservations = await CafeReservation.find({
            workspaceId,
            reservationAt: { $gte: date, $lt: nextDay },
        })
            .sort({ reservationAt: 1 })
            .lean();

        await expireOverdueReservations(reservations);

        res.status(200).json({ success: true, message: "Reservations loaded.", data: reservations.map(withLockStartsAt) });
    } catch (error) {
        next(error);
    }
}

export async function createCafeReservation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const { guestName, guestPhone, partySize, date, time, tableId: rawTableId, notes } = req.body || {};
        if (!String(guestName || "").trim()) throw badRequest("Guest name is required.");
        const numericPartySize = Number(partySize);
        if (!Number.isInteger(numericPartySize) || numericPartySize < 1) throw badRequest("Enter a valid party size.");

        const reservationAt = combineDateAndTime(String(date || ""), String(time || ""));
        if (!reservationAt) throw badRequest("Enter a valid reservation date and time.");

        let tableId: mongoose.Types.ObjectId | null = null;
        if (rawTableId) {
            tableId = parseObjectId(rawTableId, "Invalid table.");
            const table = await CafeTable.findOne({ _id: tableId, workspaceId, isActive: true }).lean();
            if (!table) throw badRequest("This table is not available.");
            if (table.seats < numericPartySize) throw badRequest(`${table.name} only seats ${table.seats}.`);

            const windowStart = new Date(reservationAt.getTime() - RESERVATION_CONFLICT_WINDOW_MINUTES * 60 * 1000);
            const windowEnd = new Date(reservationAt.getTime() + RESERVATION_CONFLICT_WINDOW_MINUTES * 60 * 1000);
            const hasConflict = await CafeReservation.exists({
                workspaceId,
                tableId,
                status: { $in: CAFE_RESERVATION_OPEN_STATUSES },
                reservationAt: { $gte: windowStart, $lte: windowEnd },
            });
            if (hasConflict) throw conflict("This table already has a reservation around that time.");
        }

        const latest = await CafeReservation.findOne({ workspaceId }).sort({ reservationNumber: -1 }).select("reservationNumber").lean();

        const reservation = await CafeReservation.create({
            workspaceId,
            reservationNumber: (latest?.reservationNumber || 0) + 1,
            guestName: String(guestName).trim(),
            guestPhone: String(guestPhone || "").trim(),
            partySize: numericPartySize,
            reservationAt,
            tableId,
            notes: String(notes || "").trim(),
            createdBy: getOptionalUserObjectId(req),
        });

        res.status(201).json({ success: true, message: "Reservation created successfully.", data: reservation });
    } catch (error: any) {
        if (error?.code === 11000) return next(conflict("Unable to create this reservation. Try again."));
        next(error);
    }
}

export async function seatCafeReservation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const reservationId = parseObjectId(req.params.reservationId, "Invalid reservation.");
        const reservation = await CafeReservation.findOne({ _id: reservationId, workspaceId });
        if (!reservation) throw notFound("Reservation not found.");
        if (reservation.status !== "Confirmed") throw conflict("Only a confirmed reservation can be seated.");

        let tableId = reservation.tableId;
        if (!tableId) {
            tableId = parseObjectId(req.body?.tableId, "Choose a table to seat this reservation at.");
            const table = await CafeTable.findOne({ _id: tableId, workspaceId, isActive: true }).lean();
            if (!table) throw badRequest("This table is not available.");
        }

        reservation.tableId = tableId;
        reservation.status = "Seated";
        await reservation.save();

        res.status(200).json({ success: true, message: "Guest seated.", data: reservation });
    } catch (error) {
        next(error);
    }
}

export async function updateCafeReservationStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const workspaceId = getWorkspaceObjectId(req);
        const reservationId = parseObjectId(req.params.reservationId, "Invalid reservation.");
        const status = String(req.body?.status || "") as CafeReservationStatus;
        const reason = String(req.body?.reason || "").trim();
        if (!["No-show", "Cancelled"].includes(status)) throw badRequest("Invalid status.");
        if (status === "Cancelled" && !reason) throw badRequest("A reason is required to cancel a reservation.");

        const reservation = await CafeReservation.findOne({ _id: reservationId, workspaceId });
        if (!reservation) throw notFound("Reservation not found.");
        if (reservation.status !== "Confirmed") throw conflict("Only a confirmed reservation can be updated this way.");

        reservation.status = status;
        if (status === "Cancelled") reservation.cancelReason = reason;
        await reservation.save();

        res.status(200).json({ success: true, message: `Reservation marked ${status}.`, data: reservation });
    } catch (error) {
        next(error);
    }
}
