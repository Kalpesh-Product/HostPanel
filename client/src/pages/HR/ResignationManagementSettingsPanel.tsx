import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  ListChecks,
  PackageCheck,
  Plus,
  Save,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getResignationSettings,
  updateResignationSettings,
} from "@/services/resignation-management";

interface EditableItem {
  key?: string;
  label: string;
  description: string;
  required?: boolean;
}

interface ResignationSettingsForm {
  returnRequirements: EditableItem[];
  requestedDocumentTemplates: EditableItem[];
  instructions: string[];
  confirmationWarning: string;
}

const EMPTY_FORM: ResignationSettingsForm = {
  returnRequirements: [],
  requestedDocumentTemplates: [],
  instructions: [],
  confirmationWarning: "",
};

const makeKey = (label: string, index: number) =>
  (label || "requirement-" + (index + 1))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function ResignationManagementSettingsPanel({
  onSaved,
}: {
  onSaved?: () => void | Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ResignationSettingsForm>(EMPTY_FORM);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getResignationSettings();
      const settings = response?.settings || response?.data?.settings || {};
      setForm({
        returnRequirements: Array.isArray(settings.returnRequirements)
          ? settings.returnRequirements.map((item: any) => ({
              key: item.key,
              label: item.label || "",
              description: item.description || "",
              required: item.required !== false,
            }))
          : [],
        requestedDocumentTemplates: Array.isArray(settings.requestedDocumentTemplates)
          ? settings.requestedDocumentTemplates.map((item: any) => ({
              label: item.label || "",
              description: item.description || "",
            }))
          : [],
        instructions: Array.isArray(settings.instructions)
          ? settings.instructions
          : [],
        confirmationWarning: settings.confirmationWarning || "",
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load resignation settings.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadSettings();
  }, [isOpen, loadSettings]);

  const updateRequirement = (
    index: number,
    field: keyof EditableItem,
    value: string | boolean,
  ) => {
    setForm((current) => ({
      ...current,
      returnRequirements: current.returnRequirements.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const updateDocument = (
    index: number,
    field: "label" | "description",
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      requestedDocumentTemplates: current.requestedDocumentTemplates.map(
        (item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const updateInstruction = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      instructions: current.instructions.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    }));
  };

  const saveSettings = async () => {
    const returnRequirements = form.returnRequirements
      .map((item, index) => ({
        key: item.key || makeKey(item.label, index),
        label: item.label.trim(),
        description: item.description.trim(),
        required: item.required !== false,
        isActive: true,
      }))
      .filter((item) => item.label);
    const requestedDocumentTemplates = form.requestedDocumentTemplates
      .map((item) => ({
        label: item.label.trim(),
        description: item.description.trim(),
      }))
      .filter((item) => item.label);
    const instructions = form.instructions
      .map((instruction) => instruction.trim())
      .filter(Boolean);

    if (!returnRequirements.length) {
      toast.error("Add at least one employee return requirement.");
      return;
    }
    if (!form.confirmationWarning.trim()) {
      toast.error("Add the employee confirmation warning.");
      return;
    }

    setIsSaving(true);
    try {
      await updateResignationSettings({
        returnRequirements,
        requestedDocumentTemplates,
        instructions,
        confirmationWarning: form.confirmationWarning.trim(),
      });
      await onSaved?.();
      setIsOpen(false);
      toast.success("Resignation rules updated for this workspace.");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to update resignation settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        data-tour="hr-resignation-settings-btn"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-2.5 text-xs font-pmedium uppercase text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        <Settings2 size={13} />
        Resignation Rules
      </button>

      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-settings-title"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 p-6">
              <div>
                <h2 id="exit-settings-title" className="flex items-center gap-2 text-lg font-pmedium text-slate-900">
                  <Settings2 size={18} className="text-[#2563EB]" />
                  Employee Resignation Rules
                </h2>
                <p className="mt-1 text-[11px] font-pmedium text-slate-500">
                  Return requirements, document templates and instructions — changes apply to future requests. Existing requests retain their submitted rules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close resignation settings"
                className="shrink-0 rounded-full bg-white p-2 text-slate-500 shadow-sm transition-transform hover:scale-110"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-white p-6">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : (
                <div className="space-y-5">
                  <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="flex items-center gap-1.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">
                          <PackageCheck size={12} /> Items employees must return
                        </p>
                        <p className="mt-1 text-[11px] font-pmedium text-slate-500">These become the HR clearance checklist for every new resignation request.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            returnRequirements: [
                              ...current.returnRequirements,
                              { label: "", description: "", required: true },
                            ],
                          }))
                        }
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-3 text-[11px] font-pmedium uppercase tracking-wider text-white transition-colors hover:bg-blue-700"
                      >
                        <Plus size={13} /> Add item
                      </button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {form.returnRequirements.map((item, index) => (
                        <div key={item.key || index} className="grid gap-2 rounded-xl border border-slate-100 bg-white p-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-center">
                          <input
                            aria-label={"Return item " + (index + 1)}
                            value={item.label}
                            onChange={(event) => updateRequirement(index, "label", event.target.value)}
                            maxLength={180}
                            className="w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                            placeholder="Laptop, access card..."
                          />
                          <input
                            aria-label={"Return item description " + (index + 1)}
                            value={item.description}
                            onChange={(event) => updateRequirement(index, "description", event.target.value)}
                            maxLength={500}
                            className="w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                            placeholder="What exactly must be returned?"
                          />
                          <div className="flex items-center justify-between gap-2 sm:justify-end">
                            <label className="flex items-center gap-1.5 text-[11px] font-pmedium text-slate-600">
                              <input
                                type="checkbox"
                                checked={item.required !== false}
                                onChange={(event) => updateRequirement(index, "required", event.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                              />
                              Required
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  returnRequirements: current.returnRequirements.filter((_, itemIndex) => itemIndex !== index),
                                }))
                              }
                              aria-label={"Remove " + (item.label || "return item")}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="flex items-center gap-1.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">
                          <FileText size={12} /> Documents employees can request
                        </p>
                        <p className="mt-1 text-[11px] font-pmedium text-slate-500">Employees may also add a custom document to their own request.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            requestedDocumentTemplates: [
                              ...current.requestedDocumentTemplates,
                              { label: "", description: "" },
                            ],
                          }))
                        }
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-3 text-[11px] font-pmedium uppercase tracking-wider text-white transition-colors hover:bg-blue-700"
                      >
                        <Plus size={13} /> Add document
                      </button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {form.requestedDocumentTemplates.map((item, index) => (
                        <div key={index} className="grid gap-2 rounded-xl border border-slate-100 bg-white p-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-center">
                          <input
                            aria-label={"Document option " + (index + 1)}
                            value={item.label}
                            onChange={(event) => updateDocument(index, "label", event.target.value)}
                            maxLength={180}
                            className="w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                            placeholder="Experience Letter"
                          />
                          <input
                            aria-label={"Document description " + (index + 1)}
                            value={item.description}
                            onChange={(event) => updateDocument(index, "description", event.target.value)}
                            maxLength={500}
                            className="w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                            placeholder="Explain what HR will issue"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                requestedDocumentTemplates: current.requestedDocumentTemplates.filter((_, itemIndex) => itemIndex !== index),
                              }))
                            }
                            aria-label={"Remove " + (item.label || "document option")}
                            className="justify-self-end rounded-lg p-2 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="flex items-center gap-1.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">
                          <ListChecks size={12} /> Resignation instructions
                        </p>
                        <p className="mt-1 text-[11px] font-pmedium text-slate-500">Examples: leave policy, handover, attendance, and final working-day rules.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            instructions: [...current.instructions, ""],
                          }))
                        }
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-3 text-[11px] font-pmedium uppercase tracking-wider text-white transition-colors hover:bg-blue-700"
                      >
                        <Plus size={13} /> Add instruction
                      </button>
                    </div>
                    <div className="mt-4 space-y-2">
                      {form.instructions.map((instruction, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[11px] font-pmedium text-slate-500">{index + 1}</span>
                          <input
                            aria-label={"Resignation instruction " + (index + 1)}
                            value={instruction}
                            onChange={(event) => updateInstruction(index, event.target.value)}
                            maxLength={500}
                            className="h-9 flex-1 rounded-lg border border-slate-200/60 bg-white px-3 text-[12px] font-pmedium text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                            placeholder="Add a clear instruction for employees..."
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                instructions: current.instructions.filter((_, itemIndex) => itemIndex !== index),
                              }))
                            }
                            aria-label={"Remove instruction " + (index + 1)}
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="mt-5 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Employee confirmation warning</p>
                    <textarea
                      id="exit-confirmation-warning"
                      value={form.confirmationWarning}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          confirmationWarning: event.target.value,
                        }))
                      }
                      maxLength={1200}
                      className="mt-2 min-h-24 w-full rounded-xl border border-slate-200/60 bg-white p-3 text-[12px] font-pmedium leading-5 text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                      placeholder="Text the employee must confirm before submission..."
                    />
                  </section>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 p-6 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
                className="flex-1 rounded-2xl bg-slate-200 px-5 py-2.5 font-pmedium text-xs uppercase text-slate-700 transition-colors hover:bg-slate-300 disabled:opacity-60"
              >
                Close
              </button>
              <button
                type="button"
                onClick={saveSettings}
                disabled={isLoading || isSaving}
                className="flex-1 rounded-2xl bg-[#2563EB] px-5 py-2.5 font-pmedium text-xs uppercase text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={13} className="mr-1.5 inline-block" />
                {isSaving ? "Saving..." : "Save Resignation Rules"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default ResignationManagementSettingsPanel;

