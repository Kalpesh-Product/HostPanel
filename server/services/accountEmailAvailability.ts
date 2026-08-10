import HostUser from "../models/HostUser.js";
import TenantEmployee from "../models/TenantEmployee.js";
import MemberInvite from "../models/MemberInvite.js";

export const normalizeAccountEmail = (email: unknown) =>
  String(email || "").trim().toLowerCase();

export const hostPanelEmailExists = async (email: unknown) => {
  const normalizedEmail = normalizeAccountEmail(email);
  if (!normalizedEmail) return false;

  const now = new Date();
  const [hostUser, tenantEmployee, activeInvite] = await Promise.all([
    HostUser.exists({ email: normalizedEmail }),
    TenantEmployee.exists({ email: normalizedEmail }),
    MemberInvite.exists({
      email: normalizedEmail,
      $or: [
        { status: "accepted" },
        { status: "pending", expiresAt: { $gt: now } },
      ],
    }),
  ]);

  return Boolean(hostUser || tenantEmployee || activeInvite);
};
