import CompanyLeads from "./CompanyLeads";

export default function AllLeads() {
  return <CompanyLeads leadScope="all" />;
}

// /key-apps/all-leads/request-payout — the same CompanyLeads page rendered
// directly in its Request Payout view (real URL, shareable, breadcrumbs).
export function AllLeadsRequestPayout() {
  return <CompanyLeads leadScope="all" payoutPage />;
}
