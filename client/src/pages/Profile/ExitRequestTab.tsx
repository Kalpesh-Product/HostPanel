import React, { useState } from "react";
import { LogOut, Send } from "lucide-react";
import TextField from "@mui/material/TextField";
import PrimaryButton from "../../components/PrimaryButton";

export function ExitRequestTab() {
  const [form, setForm] = useState({
    reason: "",
    noticePeriodDays: 30,
    lastWorkingDay: "",
    comments: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div>
        <div className="flex items-center justify-between pb-4">
          <span className="text-title font-pmedium text-primary uppercase">Exit Request</span>
        </div>
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4 border border-green-100">
            <LogOut className="text-green-600" size={24} />
          </div>
          <p className="text-slate-900 font-semibold text-lg mb-1">Exit request submitted</p>
          <p className="text-slate-400 text-[13px] mb-6 max-w-md mx-auto">
            Your resignation request has been sent to HR for review. You will be notified of the decision.
          </p>
          <PrimaryButton
            title="Submit another request"
            handleSubmit={() => { setSubmitted(false); setForm({ reason: "", noticePeriodDays: 30, lastWorkingDay: "", comments: "" }); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between pb-4">
        <span className="text-title font-pmedium text-primary uppercase">Exit Request</span>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <TextField
            label="Reason for Resignation *"
            multiline
            rows={4}
            fullWidth
            required
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Please provide your reason for leaving..."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Notice Period (Days)"
              type="number"
              fullWidth
              value={form.noticePeriodDays}
              onChange={(e) => setForm({ ...form, noticePeriodDays: Number(e.target.value) })}
              inputProps={{ min: 1, max: 90 }}
            />
            <TextField
              label="Proposed Last Working Day"
              type="date"
              fullWidth
              value={form.lastWorkingDay}
              onChange={(e) => setForm({ ...form, lastWorkingDay: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </div>

          <TextField
            label="Additional Comments"
            multiline
            rows={2}
            fullWidth
            value={form.comments}
            onChange={(e) => setForm({ ...form, comments: e.target.value })}
            placeholder="Any additional information..."
          />

          <div className="flex gap-3 pt-2">
            <PrimaryButton
              title="Clear"
              handleSubmit={() => setForm({ reason: "", noticePeriodDays: 30, lastWorkingDay: "", comments: "" })}
              externalStyles="!bg-white !text-slate-600 border border-slate-200 hover:!bg-slate-50 flex-1"
            />
            <PrimaryButton
              title={<span className="flex items-center gap-2"><Send size={16} /> Submit Exit Request</span>}
              type="submit"
              disabled={!form.reason.trim()}
              externalStyles="flex-[2]"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
