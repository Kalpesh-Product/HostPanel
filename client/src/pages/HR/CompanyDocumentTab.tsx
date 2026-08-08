import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Search, Filter, X, Loader2, Trash2, Edit3, Eye, Clock,
  FileText, CheckCircle2, FilePlus2, BookOpen,
} from "lucide-react";
import { toast } from "sonner";

/* ───────────────────────────── Types ───────────────────────────── */

type DocumentKind = "sop" | "policy";

type DocumentStatus = "active" | "draft" | "archived";

interface CompanyDoc {
  id: string;
  title: string;
  category: string;
  description: string;
  version: string;
  owner: string;
  updatedAt: string;
  status: DocumentStatus;
}

interface CompanyDocumentTabProps {
  kind: DocumentKind;
}

interface DocFormState {
  title: string;
  category: string;
  version: string;
  owner: string;
  description: string;
  status: DocumentStatus;
}

/* ───────────────────────────── Config ───────────────────────────── */

const KIND_CONFIG: Record<
  DocumentKind,
  { title: string; subtitle: string; categories: string[]; seed: CompanyDoc[] }
> = {
  sop: {
    title: "Company SOPs",
    subtitle: "Standard Operating Procedures that define how daily work should be carried out.",
    categories: ["Operations", "HR", "IT", "Finance", "Administration", "Sales", "Maintenance"],
    seed: [
      { id: "sop-1", title: "Customer Onboarding SOP", category: "Operations", description: "Step-by-step procedure for onboarding new customers, verifying documents and provisioning access.", version: "v2.1", owner: "Kalpesh Patil", updatedAt: "12 Jan 2026", status: "active" },
      { id: "sop-2", title: "Attendance & Leave SOP", category: "HR", description: "Standard process for clock-in/out, leave application, approvals and monthly attendance review.", version: "v1.4", owner: "HR Team", updatedAt: "28 Feb 2026", status: "active" },
      { id: "sop-3", title: "IT Asset Request SOP", category: "IT", description: "Procedure to raise, approve and fulfil hardware/software asset requests for employees.", version: "v1.0", owner: "IT Team", updatedAt: "05 Mar 2026", status: "active" },
      { id: "sop-4", title: "Client Billing SOP", category: "Finance", description: "Guidelines for generating invoices, tracking payments and handling billing exceptions.", version: "v3.0", owner: "Finance Team", updatedAt: "19 Jun 2026", status: "draft" },
      { id: "sop-5", title: "Office Access & Security SOP", category: "Administration", description: "Entry/exit protocols, visitor management and premises security guidelines.", version: "v1.2", owner: "Administration", updatedAt: "30 Apr 2026", status: "active" },
    ],
  },
  policy: {
    title: "Company Policies",
    subtitle: "Official policies and guidelines that every employee is expected to follow.",
    categories: ["HR", "IT", "Finance", "Operations", "Legal"],
    seed: [
      { id: "pol-1", title: "Code of Conduct", category: "HR", description: "Core values, expected behaviour and professional standards for all employees.", version: "v2.3", owner: "HR Team", updatedAt: "08 Jan 2026", status: "active" },
      { id: "pol-2", title: "Data Privacy Policy", category: "IT", description: "How company and customer data must be collected, stored, processed and protected.", version: "v1.6", owner: "IT Team", updatedAt: "21 Feb 2026", status: "active" },
      { id: "pol-3", title: "Anti-Harassment Policy", category: "HR", description: "Zero-tolerance framework covering reporting, investigation and redressal of harassment.", version: "v1.1", owner: "HR Team", updatedAt: "14 Mar 2026", status: "active" },
      { id: "pol-4", title: "Expense Reimbursement Policy", category: "Finance", description: "Eligible expenses, submission deadlines and approval limits for reimbursements.", version: "v2.0", owner: "Finance Team", updatedAt: "02 May 2026", status: "draft" },
      { id: "pol-5", title: "Remote Work Policy", category: "HR", description: "Guidelines for working remotely, availability, security and equipment usage.", version: "v1.3", owner: "HR Team", updatedAt: "17 Jul 2026", status: "active" },
    ],
  },
};

const STATUS_META: Record<DocumentStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  draft: { label: "Draft", color: "text-amber-600 bg-amber-50 border-amber-200" },
  archived: { label: "Archived", color: "text-slate-500 bg-slate-50 border-slate-200" },
};

function createEmptyForm(): DocFormState {
  return { title: "", category: "", version: "v1.0", owner: "", description: "", status: "active" };
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

function formatDateForDisplay(): string {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* ───────────────────────────── Component ───────────────────────────── */

export default function CompanyDocumentTab({ kind }: CompanyDocumentTabProps): React.ReactElement {
  const config = KIND_CONFIG[kind];
  const title = kind === "sop" ? "SOP" : "Policy";

  const [documents, setDocuments] = useState<CompanyDoc[]>(config.seed);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState<"all" | DocumentStatus>("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<CompanyDoc | null>(null);
  const [form, setForm] = useState<DocFormState>(createEmptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [viewingDoc, setViewingDoc] = useState<CompanyDoc | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<CompanyDoc | null>(null);

  const stats = useMemo(() => {
    const total = documents.length;
    const active = documents.filter((d) => d.status === "active").length;
    const draft = documents.filter((d) => d.status === "draft").length;
    const archived = documents.filter((d) => d.status === "archived").length;
    return { total, active, draft, archived };
  }, [documents]);

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return documents.filter((doc) => {
      if (categoryFilter !== "All Categories" && doc.category !== categoryFilter) return false;
      if (statusFilter !== "all" && doc.status !== statusFilter) return false;
      if (!query) return true;
      return (
        doc.title.toLowerCase().includes(query) ||
        doc.description.toLowerCase().includes(query) ||
        doc.owner.toLowerCase().includes(query) ||
        doc.category.toLowerCase().includes(query)
      );
    });
  }, [documents, searchQuery, categoryFilter, statusFilter]);

  const statCards: Array<{ label: string; value: number; icon: React.ComponentType<{ size?: number }>; toneClass: string; borderClass: string }> = [
    { label: "Total", value: stats.total, icon: FileText, toneClass: "bg-blue-50 text-[#2563EB]", borderClass: "" },
    { label: "Active", value: stats.active, icon: CheckCircle2, toneClass: "bg-emerald-50 text-emerald-600", borderClass: "border-l-4 border-l-emerald-500" },
    { label: "Draft", value: stats.draft, icon: FilePlus2, toneClass: "bg-amber-50 text-amber-600", borderClass: "border-l-4 border-l-amber-500" },
    { label: "Archived", value: stats.archived, icon: BookOpen, toneClass: "bg-slate-50 text-slate-500", borderClass: "border-l-4 border-l-slate-400" },
  ];

  const openAddForm = () => {
    setEditingDoc(null);
    setForm(createEmptyForm());
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEditForm = (doc: CompanyDoc) => {
    setEditingDoc(doc);
    setForm({
      title: doc.title,
      category: doc.category,
      version: doc.version,
      owner: doc.owner,
      description: doc.description,
      status: doc.status,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleFormField = (field: keyof DocFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = () => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "Title is required";
    if (!form.category.trim()) errors.category = "Category is required";
    if (!form.owner.trim()) errors.owner = "Owner is required";
    if (!form.description.trim()) errors.description = "Description is required";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setTimeout(() => {
      if (editingDoc) {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === editingDoc.id
              ? { ...editingDoc, ...form, updatedAt: formatDateForDisplay() }
              : doc,
          ),
        );
        toast.success(`${title} updated successfully`);
      } else {
        setDocuments((prev) => [
          { ...form, id: makeId(kind), updatedAt: formatDateForDisplay() },
          ...prev,
        ]);
        toast.success(`${title} added successfully`);
      }
      setSaving(false);
      setIsFormOpen(false);
      setEditingDoc(null);
    }, 500);
  };

  const handleDelete = () => {
    if (!deletingDoc) return;
    setDocuments((prev) => prev.filter((doc) => doc.id !== deletingDoc.id));
    toast.success(`${title} deleted successfully`);
    setDeletingDoc(null);
  };

  const statusPills: Array<{ key: "all" | DocumentStatus; label: string }> = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "draft", label: "Draft" },
    { key: "archived", label: "Archived" },
  ];

  const inputClass = `w-full px-3 py-2 bg-white border rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]`;

  return (
    <div className="flex flex-col gap-4">
      {/* ═══ STAT CARDS ═══ */}
      <div className="mb-1 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        {statCards.map((card) => {
          const CardIcon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.borderClass}`}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
              </div>
              <div className={`p-2 rounded-2xl ${card.toneClass} shrink-0`}>
                <CardIcon size={16} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ DOCUMENTS PANEL ═══ */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {/* Data Panel Header Row: status pills on the left, filter/search/button on the right */}
        <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:gap-4 sm:p-4 xl:flex-row xl:items-center lg:p-5">
          <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {statusPills.map((pill) => (
              <button
                key={pill.key}
                onClick={() => setStatusFilter(pill.key)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-pmedium transition-all sm:text-[12px] ${
                  statusFilter === pill.key
                    ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                    : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:flex-nowrap xl:w-auto">
            <div className="relative min-w-[180px] flex-1 xl:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}s by title, owner or category...`}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[110px]"
              >
                <option>All Categories</option>
                {config.categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <button
              onClick={openAddForm}
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#2563EB] px-3.5 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
            >
              <Plus size={13} strokeWidth={2.5} /> Add {title}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
              <tr>
                <th className="px-5 py-4 text-left">{title} Title</th>
                <th className="px-5 py-4 text-left">Category</th>
                <th className="px-5 py-4 text-left">Owner</th>
                <th className="px-5 py-4 text-left">Version</th>
                <th className="px-5 py-4 text-left">Updated</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-slate-400 font-pmedium">
                    No {title.toLowerCase()}s found in this section.
                  </td>
                </tr>
              ) : (
                visible.map((doc) => {
                  const statusMeta = STATUS_META[doc.status];
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4">
                        <div>
                          <span className="font-pmedium text-slate-800 text-[12px]">{doc.title}</span>
                          <p className="text-[9px] font-pmedium text-slate-400 mt-0.5">{doc.description}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block w-fit px-1.5 py-0.5 rounded text-[8px] font-pmedium uppercase bg-slate-100 text-slate-500">
                          {doc.category}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[11px] font-pmedium text-slate-500">{doc.owner}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[11px] font-pmedium text-slate-500">{doc.version}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[10px] font-pmedium text-slate-400">{doc.updatedAt}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-pmedium uppercase tracking-wider border ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingDoc(doc)}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                            title="View"
                          >
                            <Eye size={14} strokeWidth={2.5} />
                          </button>
                          <button
                            onClick={() => openEditForm(doc)}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit3 size={14} strokeWidth={2.5} />
                          </button>
                          <button
                            onClick={() => setDeletingDoc(doc)}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═════════════ MODALS ═════════════ */}

      {/* ─── Add / Edit Modal ─── */}
      {isFormOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[8vh] pb-8 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg mx-4 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-pmedium text-slate-800">
                  {editingDoc ? `Edit ${title}` : `Add ${title}`}
                </h3>
                <p className="text-[10px] font-pmedium text-slate-500">
                  {editingDoc ? `Updating ${editingDoc.title}` : `Create a new company ${title.toLowerCase()}`}
                </p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Title <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleFormField("title", e.target.value)}
                  className={`${inputClass} ${formErrors.title ? "border-red-300 bg-red-50" : "border-slate-200/60"}`}
                  placeholder={`Enter ${title.toLowerCase()} title`}
                />
                {formErrors.title && <span className="text-[10px] font-pmedium text-red-500">{formErrors.title}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Category <span className="text-red-400">*</span></label>
                  <select
                    value={form.category}
                    onChange={(e) => handleFormField("category", e.target.value)}
                    className={`${inputClass} ${formErrors.category ? "border-red-300 bg-red-50" : "border-slate-200/60"}`}
                  >
                    <option value="">Select Category</option>
                    {config.categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {formErrors.category && <span className="text-[10px] font-pmedium text-red-500">{formErrors.category}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Version</label>
                  <input
                    type="text"
                    value={form.version}
                    onChange={(e) => handleFormField("version", e.target.value)}
                    className={`${inputClass} border-slate-200/60`}
                    placeholder="e.g. v1.0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Owner <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.owner}
                    onChange={(e) => handleFormField("owner", e.target.value)}
                    className={`${inputClass} ${formErrors.owner ? "border-red-300 bg-red-50" : "border-slate-200/60"}`}
                    placeholder="Owner / team name"
                  />
                  {formErrors.owner && <span className="text-[10px] font-pmedium text-red-500">{formErrors.owner}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => handleFormField("status", e.target.value)}
                    className={`${inputClass} border-slate-200/60`}
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Description <span className="text-red-400">*</span></label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleFormField("description", e.target.value)}
                  rows={3}
                  className={`${inputClass} resize-none ${formErrors.description ? "border-red-300 bg-red-50" : "border-slate-200/60"}`}
                  placeholder={`Brief summary of this ${title.toLowerCase()}`}
                />
                {formErrors.description && <span className="text-[10px] font-pmedium text-red-500">{formErrors.description}</span>}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsFormOpen(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-8 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {saving ? "Saving..." : editingDoc ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ─── View Modal ─── */}
      {viewingDoc && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] pb-8 bg-black/40 backdrop-blur-sm overflow-y-auto" onClick={() => setViewingDoc(null)}>
          <div className="relative w-full max-w-xl mx-4 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-pmedium text-slate-800">{viewingDoc.title}</h3>
                <p className="text-[10px] font-pmedium text-slate-500">{viewingDoc.category} • {viewingDoc.version}</p>
              </div>
              <button onClick={() => setViewingDoc(null)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-pmedium uppercase tracking-wider border ${STATUS_META[viewingDoc.status].color}`}>
                  {STATUS_META[viewingDoc.status].label}
                </span>
                <div className="flex items-center gap-3 text-[10px] font-pmedium text-slate-400">
                  <span>{viewingDoc.owner}</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> Updated {viewingDoc.updatedAt}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-2">Description</p>
                <p className="text-[12px] font-pmedium text-slate-700 leading-relaxed whitespace-pre-wrap">{viewingDoc.description}</p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => { setViewingDoc(null); openEditForm(viewingDoc); }}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center gap-1.5"
                >
                  <Edit3 size={13} /> Edit
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ─── Delete Confirm Modal ─── */}
      {deletingDoc && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={() => setDeletingDoc(null)}>
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} />
            </div>
            <h3 className="text-sm font-pmedium text-slate-800 text-center">Delete {title}?</h3>
            <p className="text-[11px] font-pmedium text-slate-500 text-center mt-1.5">
              Are you sure you want to delete <span className="font-pmedium text-slate-700">{deletingDoc.title}</span>? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setDeletingDoc(null)}
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-rose-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
