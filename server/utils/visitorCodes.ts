// Visitor codes are how the front desk finds a person at the door, so every
// creation path (walk-in, front desk, website tour accepted in Sales) must
// mint them the same way. Kept here instead of per-controller so a format
// change can never apply to only one route.
export const buildVisitorCode = () => `VIS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
export const buildBadgeNo = () => `B-${Math.floor(1000 + Math.random() * 9000)}`;
