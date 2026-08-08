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

interface ManageSidebarAccessDialogProps {
  open: boolean;
  onClose: () => void;
  member: ManageSidebarAccessMember | null;
  moduleIds: string[];
  moduleLabelById: Record<string, string>;
  onSaved: () => void;
}

const ManageSidebarAccessDialog = ({
  open,
  onClose,
  member,
  moduleIds,
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
      // Everything outside this department's own moduleIds is left exactly as
      // it already was — a manager can only ever change their own
      // department's modules, matching updateOrganizationMemberAccess's
      // server-side scoping.
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
    <MuiModal open={open} onClose={onClose} title={`Manage Sidebar Access — ${member.name}`}>
      <div className="flex flex-col gap-4">
        <p className="text-[11px] font-pmedium text-slate-500">
          These switches control which of your department's modules {member.name} can see in their sidebar.
        </p>
        <div className="flex flex-col gap-2">
          {moduleIds.length === 0 ? (
            <p className="text-[11px] font-pmedium text-slate-400 py-4 text-center">
              Your department has no modules configured yet.
            </p>
          ) : (
            moduleIds.map((moduleId) => (
              <div
                key={moduleId}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
              >
                <span className="text-[11px] font-pmedium text-slate-700">
                  {moduleLabelById[moduleId] || moduleId}
                </span>
                <Switch
                  size="small"
                  checked={checkedModuleIds.has(moduleId)}
                  onChange={() => toggleModule(moduleId)}
                />
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end gap-3">
          <SecondaryButton title="Cancel" handleSubmit={onClose} />
          <PrimaryButton title="Save" isLoading={isSaving} disabled={isSaving} handleSubmit={handleSave} />
        </div>
      </div>
    </MuiModal>
  );
};

export default ManageSidebarAccessDialog;
