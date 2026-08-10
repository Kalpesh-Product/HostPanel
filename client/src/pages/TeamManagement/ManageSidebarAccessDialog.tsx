import { useEffect, useState } from "react";
import { Switch } from "@mui/material";
import { toast } from "sonner";
import MuiModal from "@/components/MuiModal";
import PrimaryButton from "@/components/PrimaryButton";
import SecondaryButton from "@/components/SecondaryButton";
import useAxiosPrivate from "@/hooks/useAxiosPrivate";
import { updateEmployeeAccess as updateEmployeeAccessRequest } from "@/services/hr";

export interface ManageSidebarAccessMember {
  id: string;
  name: string;
  grantedModules: string[];
}

export interface ManageSidebarAccessModuleGroup {
  id: string;
  label: string;
  moduleIds: string[];
}

interface ManageSidebarAccessDialogProps {
  open: boolean;
  onClose: () => void;
  member: ManageSidebarAccessMember | null;
  moduleIds: string[];
  moduleGroups: ManageSidebarAccessModuleGroup[];
  moduleLabelById: Record<string, string>;
  onSaved: () => void;
}

const ManageSidebarAccessDialog = ({
  open,
  onClose,
  member,
  moduleIds,
  moduleGroups,
  moduleLabelById,
  onSaved,
}: ManageSidebarAccessDialogProps) => {
  const axiosPrivate = useAxiosPrivate();
  const [checkedModuleIds, setCheckedModuleIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!member) return;
    setCheckedModuleIds(new Set(member.grantedModules.filter((id) => moduleIds.includes(id))));
  }, [member, moduleIds]);

  const toggleModule = (moduleId: string) => {
    setCheckedModuleIds((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!member) return;
    setIsSaving(true);
    try {
      // Preserve anything outside the manager-delegable Common, Extra Common,
      // and department Core groups. The backend enforces this same scope.
      const untouchedModules = member.grantedModules.filter((id) => !moduleIds.includes(id));
      await updateEmployeeAccessRequest(axiosPrivate, member.id, {
        accessModules: [...untouchedModules, ...Array.from(checkedModuleIds)],
      });
      toast.success("Sidebar access updated successfully.");
      onSaved();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update sidebar access.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!member) return null;

  return (
    <MuiModal
      open={open}
      onClose={onClose}
      variant="workspace"
      title="Manage Sidebar Access"
      subtitle={member.name}
    >
      <div className="flex flex-col gap-5">
        <p className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-[11px] font-pmedium leading-relaxed text-slate-600">
          Assign any Common, Extra Common, or Core Module that you can access to {member.name}.
        </p>
        <div className="flex flex-col gap-4">
          {moduleIds.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-[11px] font-pmedium text-slate-400">
              You do not currently have any delegable modules.
            </p>
          ) : (
            moduleGroups.map((group) => {
              const enabledCount = group.moduleIds.filter((moduleId) => checkedModuleIds.has(moduleId)).length;
              return (
                <section key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3 px-1">
                    <h3 className="text-[10px] font-pmedium uppercase tracking-[0.18em] text-slate-500">
                      {group.label}
                    </h3>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-pmedium text-slate-500">
                      {enabledCount} of {group.moduleIds.length} enabled
                    </span>
                  </div>
                  {group.moduleIds.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-[10px] font-pmedium text-slate-400">
                      No modules from this group are available in your access.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {group.moduleIds.map((moduleId) => (
                        <div
                          key={moduleId}
                          className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-blue-200"
                        >
                          <span className="text-[11px] font-pmedium text-slate-700">
                            {moduleLabelById[moduleId] || moduleId}
                          </span>
                          <Switch
                            size="small"
                            checked={checkedModuleIds.has(moduleId)}
                            onChange={() => toggleModule(moduleId)}
                            inputProps={{
                              "aria-label": `Toggle ${moduleLabelById[moduleId] || moduleId} access`,
                            }}
                            sx={{
                              "& .MuiSwitch-switchBase.Mui-checked": { color: "#2563EB" },
                              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#2563EB" },
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
          <SecondaryButton
            title="Cancel"
            handleSubmit={onClose}
            disabled={isSaving}
            externalStyles="!rounded-xl !border !border-slate-200 !bg-white !px-5 !py-2.5 !text-[12px] !font-pmedium !text-slate-600 hover:!bg-slate-50"
          />
          <PrimaryButton
            title="Save Access"
            isLoading={isSaving}
            disabled={isSaving || moduleIds.length === 0}
            handleSubmit={handleSave}
            padding="px-5 py-2.5"
            fontSize="text-[12px]"
          />
        </div>
      </div>
    </MuiModal>
  );
};

export default ManageSidebarAccessDialog;
