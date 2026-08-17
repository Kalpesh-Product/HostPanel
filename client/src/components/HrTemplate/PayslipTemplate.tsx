import type React from "react";

interface PayslipTemplateProps {
  data?: {
    name?: string;
    empId?: string;
    designation?: string;
    departmentName?: string;
    month?: string;
    totalSalary?: number;
    netPay?: number;
    otherAllowances?: number;
    deductions?: number;
    workingDays?: number;
    present?: number;
    paidLeaves?: number;
    holidayDays?: number;
    halfDays?: number;
    unpaidLeaves?: number;
  };
  company?: {
    name?: string;
    address?: string;
    logoUrl?: string;
  };
}

const COLORS = {
  primary: "#1E3D73",
  accent: "#2563EB",
  wonoGreen: "#80bf01",
  ink: "#0F172A",
  muted: "#64748B",
  border: "#D1D5DB",
  softBg: "#F1F5F9",
  softAccentBg: "#EEF4FB",
  white: "#FFFFFF",
};

function formatMoney(value = 0, currency = "INR") {
  try {
    const resolved = String(currency || "INR").trim().toUpperCase() || "INR";
    return new Intl.NumberFormat(resolved === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: resolved,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  }
}

function formatMonth(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", { month: "long", year: "numeric" });
}

const PayslipTemplate = ({ data, company }: PayslipTemplateProps) => {
  const {
    name = "Abrar Shaikh",
    empId = "E0001",
    designation = "Master-Admin",
    departmentName = "Top Management",
    month = "December 2024",
    totalSalary = 70000,
    netPay = 15000,
    otherAllowances = 10000,
    deductions = 5000,
    workingDays,
    present,
    paidLeaves,
    holidayDays,
    halfDays,
    unpaidLeaves,
  } = data || {};

  const companyName = company?.name || "WONO Host Panel";
  const companyAddress = company?.address || "";
  const baseSalary = Number(totalSalary) || 0;
  const allowances = Number(otherAllowances) || 0;
  const totalEarnings = baseSalary + allowances;
  const totalDeductions = Number(deductions) || 0;

  const fieldCardStyle: React.CSSProperties = {
    background: COLORS.softBg,
    borderRadius: 10,
    padding: "14px 18px",
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        fontFamily: "'Poppins', Arial, sans-serif",
        backgroundColor: COLORS.white,
        color: COLORS.ink,
        fontSize: "14px",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* Header band */}
      <div
        style={{
          height: 6,
          background: `linear-gradient(90deg, #0BA9EF, #1E40AF)`,
        }}
      />
      <div
        style={{
          background: `linear-gradient(90deg, ${COLORS.primary}, #2b4f8f)`,
          padding: "28px 32px",
          color: COLORS.white,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {company?.logoUrl ? (
            <img
              src={company.logoUrl}
              alt="Company logo"
              style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 12 }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: COLORS.wonoGreen,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 32,
                color: COLORS.white,
              }}
            >
              W
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.25 }}>{companyName}</div>
            {companyAddress && (
              <div style={{ fontSize: 12, color: "#D7E6F9", marginTop: 4 }}>{companyAddress}</div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, fontSize: 26, letterSpacing: 1 }}>PAY SLIP</div>
          <div style={{ fontSize: 13, color: "#CFE3FB", marginTop: 4 }}>{formatMonth(month)}</div>
        </div>
      </div>
      <div style={{ height: 4, background: COLORS.wonoGreen }} />

      {/* Employee details */}
      <div style={{ padding: "24px 32px 8px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          <div style={fieldCardStyle}>
            <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.muted }}>EMPLOYEE NAME</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{name}</div>
          </div>
          <div style={fieldCardStyle}>
            <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.muted }}>EMPLOYEE ID</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{empId}</div>
          </div>
          <div style={fieldCardStyle}>
            <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.muted }}>DESIGNATION</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{designation || "N/A"}</div>
          </div>
          <div style={fieldCardStyle}>
            <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.muted }}>DEPARTMENT</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{departmentName || "N/A"}</div>
          </div>
        </div>

        {/* Tables */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
          {/* Earnings */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.primary, marginBottom: 8 }}>
              EARNINGS
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ background: COLORS.accent, color: COLORS.white, textAlign: "left", padding: "8px 12px", fontSize: 11 }}>
                    COMPONENT
                  </th>
                  <th style={{ background: COLORS.accent, color: COLORS.white, textAlign: "right", padding: "8px 12px", fontSize: 11 }}>
                    AMOUNT
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "9px 12px", borderBottom: `1px solid ${COLORS.border}` }}>Basic Pay</td>
                  <td style={{ padding: "9px 12px", borderBottom: `1px solid ${COLORS.border}`, textAlign: "right", fontWeight: 500 }}>
                    {formatMoney(baseSalary)}
                  </td>
                </tr>
                <tr style={{ background: COLORS.softBg }}>
                  <td style={{ padding: "9px 12px", borderBottom: `1px solid ${COLORS.border}` }}>Allowances &amp; Benefits</td>
                  <td style={{ padding: "9px 12px", borderBottom: `1px solid ${COLORS.border}`, textAlign: "right", fontWeight: 500 }}>
                    {formatMoney(allowances)}
                  </td>
                </tr>
                <tr>
                  <td style={{ background: COLORS.primary, color: COLORS.white, padding: "10px 12px", fontWeight: 600 }}>
                    Total Earnings
                  </td>
                  <td style={{ background: COLORS.primary, color: COLORS.white, padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>
                    {formatMoney(totalEarnings)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deductions */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.primary, marginBottom: 8 }}>
              DEDUCTIONS
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ background: COLORS.accent, color: COLORS.white, textAlign: "left", padding: "8px 12px", fontSize: 11 }}>
                    COMPONENT
                  </th>
                  <th style={{ background: COLORS.accent, color: COLORS.white, textAlign: "right", padding: "8px 12px", fontSize: 11 }}>
                    AMOUNT
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "9px 12px", borderBottom: `1px solid ${COLORS.border}` }}>
                    Tax and Other Deductions
                  </td>
                  <td style={{ padding: "9px 12px", borderBottom: `1px solid ${COLORS.border}`, textAlign: "right", fontWeight: 500 }}>
                    {formatMoney(totalDeductions)}
                  </td>
                </tr>
                <tr>
                  <td style={{ background: COLORS.primary, color: COLORS.white, padding: "10px 12px", fontWeight: 600 }}>
                    Total Deductions
                  </td>
                  <td style={{ background: COLORS.primary, color: COLORS.white, padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>
                    {formatMoney(totalDeductions)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Net pay */}
        <div
          style={{
            marginTop: 24,
            background: COLORS.primary,
            borderRadius: 10,
            padding: "14px 20px",
            color: COLORS.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15 }}>NET PAY</span>
          <span style={{ fontWeight: 700, fontSize: 20 }}>{formatMoney(netPay)}</span>
        </div>

        {/* Attendance summary */}
        {typeof workingDays === "number" && (
          <div
            style={{
              marginTop: 24,
              background: COLORS.softAccentBg,
              borderRadius: 10,
              padding: "14px 8px",
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 4,
            }}
          >
            {[
              { label: "Working Days", value: workingDays },
              { label: "Present", value: present },
              { label: "Paid Leaves", value: paidLeaves },
              { label: "Holidays", value: holidayDays },
              { label: "Half Days", value: halfDays },
              { label: "Unpaid Days", value: unpaidLeaves },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.accent }}>
                  {String(item.value ?? 0)}
                </div>
                <div style={{ fontSize: 9, fontWeight: 500, color: COLORS.muted }}>{item.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer / WONO branding */}
      <div style={{ borderTop: `1px solid ${COLORS.border}`, marginTop: 28, padding: "20px 32px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: COLORS.wonoGreen,
              color: COLORS.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            W
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary }}>WONO</div>
            <div style={{ fontSize: 9, fontWeight: 500, color: COLORS.muted }}>HOST PANEL</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 500 }}>
            *This is a computer-generated payslip and does not require a signature.
          </div>
          <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 4 }}>Powered by WONO</div>
        </div>
      </div>
    </div>
  );
};

export default PayslipTemplate;
