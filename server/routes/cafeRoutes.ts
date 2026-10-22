import express from "express";
import {
    billCafeOrder,
    bulkCreateCafeMenuItems,
    createCafeMenuItem,
    createCafeOrder,
    createCafeCategory,
    createCafeReservation,
    createCafeTable,
    deleteCafeCategory,
    deleteCafeMenuItem,
    getCafeAnalytics,
    getCafeSettings,
    listCafeReservations,
    seatCafeReservation,
    updateCafeOrderRound,
    updateCafeReservationStatus,
    updateCafeSettings,
    updateCafeOrderDetails,
    updateCafeOrderRoundItem,
    deleteCafeTable,
    listCafeCategories,
    listCafeMenuItems,
    listCafeOrders,
    listCafeTables,
    updateCafeMenuItem,
    updateCafeOrderStatus,
    updateCafeTable,
} from "../controllers/cafeController.js";

const router = express.Router();

router.get("/menu-items", listCafeMenuItems);
router.post("/menu-items", createCafeMenuItem);
router.post("/menu-items/bulk", bulkCreateCafeMenuItems);
router.patch("/menu-items/:itemId", updateCafeMenuItem);
router.delete("/menu-items/:itemId", deleteCafeMenuItem);
router.get("/categories", listCafeCategories);
router.post("/categories", createCafeCategory);
router.delete("/categories/:categoryId", deleteCafeCategory);
router.get("/tables", listCafeTables);
router.post("/tables", createCafeTable);
router.patch("/tables/:tableId", updateCafeTable);
router.delete("/tables/:tableId", deleteCafeTable);
router.get("/orders", listCafeOrders);
router.post("/orders", createCafeOrder);
router.patch("/orders/:orderId/status", updateCafeOrderStatus);
router.patch("/orders/:orderId/details", updateCafeOrderDetails);
router.patch("/orders/:orderId/rounds/:roundNumber", updateCafeOrderRound);
router.patch("/orders/:orderId/rounds/:roundNumber/items/:menuItemId", updateCafeOrderRoundItem);
router.patch("/orders/:orderId/bill", billCafeOrder);
router.get("/analytics", getCafeAnalytics);
router.get("/settings", getCafeSettings);
router.put("/settings", updateCafeSettings);
router.get("/reservations", listCafeReservations);
router.post("/reservations", createCafeReservation);
router.patch("/reservations/:reservationId/seat", seatCafeReservation);
router.patch("/reservations/:reservationId/status", updateCafeReservationStatus);

export default router;
