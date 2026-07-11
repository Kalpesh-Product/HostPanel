import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { User, Building2, Mail, Phone, Hash, MapPin, FileText, ChevronLeft } from "lucide-react";
import PageFrame from "../../../components/Pages/PageFrame";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { axiosPrivate } from "../../../utils/axios";

interface AddClientForm {
  name: string;
  phone: string;
  email: string;
  companyName: string;
  notes: string;
}

const AddClient = () => {
  const [clientType, setClientType] = useState<'individual' | 'company'>('individual');
  const navigate = useNavigate();
  const axios = useAxiosPrivate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddClientForm>({
    defaultValues: { name: '', phone: '', email: '', companyName: '', notes: '' },
  });

  const { mutate: addClient, isPending } = useMutation({
    mutationFn: async (data: AddClientForm) => {
      const response = await axios.post('/api/meeting-rooms/clients', {
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email.trim(),
        company: clientType === 'company' ? data.companyName.trim() : '',
        notes: data.notes.trim(),
        source: 'direct-add',
      });
      return response.data;
    },
    onSuccess: () => {
      reset();
      toast.success('Client added successfully.');
      navigate(-1);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to add client.');
    },
  });

  const onSubmit = (data: AddClientForm) => addClient(data);

  const selectCls = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[12px] font-pmedium uppercase tracking-widest transition-all cursor-pointer border ${
      active
        ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md shadow-blue-200'
        : 'bg-white text-slate-500 border-slate-200 hover:border-[#2563EB]/40 hover:text-slate-800'
    }`;

  const inputCls = (hasError?: boolean) =>
    `w-full px-4 py-3.5 bg-white border ${hasError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-[#2563EB] focus:ring-[#2563EB]/20'} rounded-2xl font-bold text-[13px] text-[#0F172A] focus:outline-none focus:ring-2 shadow-sm transition-all placeholder-slate-300`;

  return (
    <PageFrame>
      <div className="max-w-xl mx-auto py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-xl font-pmedium text-[#0F172A] tracking-tight">Add Client</h1>
            <p className="text-[11px] font-pmedium text-slate-400 uppercase tracking-widest mt-0.5">New client record</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Client type toggle */}
          <div className="space-y-2">
            <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Client Type</label>
            <div className="flex gap-3">
              <button type="button" className={selectCls(clientType === 'individual')} onClick={() => setClientType('individual')}>
                <User size={15} strokeWidth={2.5} /> Individual
              </button>
              <button type="button" className={selectCls(clientType === 'company')} onClick={() => setClientType('company')}>
                <Building2 size={15} strokeWidth={2.5} /> Company
              </button>
            </div>
          </div>

          {/* Company name — only shown for company type */}
          {clientType === 'company' && (
            <div className="space-y-2">
              <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Company Name *</label>
              <div className="relative">
                <Building2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  {...register('companyName', { required: clientType === 'company' ? 'Company name is required' : false })}
                  placeholder="Company or brand name"
                  className={`${inputCls(!!errors.companyName)} pl-10`}
                />
              </div>
              {errors.companyName && <p className="text-[11px] font-bold text-red-500">{errors.companyName.message}</p>}
            </div>
          )}

          {/* Contact name */}
          <div className="space-y-2">
            <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">
              {clientType === 'company' ? 'Contact Person Name *' : 'Full Name *'}
            </label>
            <div className="relative">
              <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name too short' } })}
                placeholder={clientType === 'company' ? 'Point of contact name' : 'Full name'}
                className={`${inputCls(!!errors.name)} pl-10`}
              />
            </div>
            {errors.name && <p className="text-[11px] font-bold text-red-500">{errors.name.message}</p>}
          </div>

          {/* Phone + Email side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Phone *</label>
              <div className="relative">
                <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  {...register('phone', { required: 'Phone is required', pattern: { value: /^\+?[0-9]{10,13}$/, message: 'Invalid phone number' } })}
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  className={`${inputCls(!!errors.phone)} pl-10`}
                />
              </div>
              {errors.phone && <p className="text-[11px] font-bold text-red-500">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest flex items-center gap-1">
                Email <span className="text-slate-300 normal-case font-semibold">(optional)</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  {...register('email', { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' } })}
                  type="email"
                  placeholder="client@email.com"
                  className={`${inputCls(!!errors.email)} pl-10`}
                />
              </div>
              {errors.email && <p className="text-[11px] font-bold text-red-500">{errors.email.message}</p>}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest flex items-center gap-1">
              Notes <span className="text-slate-300 normal-case font-semibold">(optional)</span>
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Any additional context about this client…"
              className={`${inputCls()} resize-none`}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 py-3.5 bg-white border border-slate-200 rounded-2xl font-pmedium text-[13px] text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-3.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[13px] uppercase tracking-wider shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none active:scale-[0.98]"
            >
              {isPending ? 'Adding…' : clientType === 'company' ? 'Add Company Client' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </PageFrame>
  );
};

export default AddClient;
