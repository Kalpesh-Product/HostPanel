import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Mail,
  Phone,
  Shield,
  User,
  RefreshCw,
} from 'lucide-react';
// import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { getStoredTenantCompanyId, getStoredTenantCompanyName, getStoredUser } from '@/lib/auth-session';
import { getStoredTenantRole, isTenantAdminRole, isTenantManagerRole, clearStoredTenantRole } from '@/lib/tenant-session';

// ─── Backend service imports (uncomment when backend ready) ───
// import { getTenantCompanies } from '@/services/tenant-companies';
// ─── New API functions needed (not yet in services) ───
//   checkCurrentPassword(currentPassword: string) => Promise<{ valid: boolean }>
//   requestChangePasswordOtp() => Promise<{ message: string }>
//   verifyChangePasswordOtp(otp: string, newPassword: string) => Promise<{ message: string }>

// ─── Client-side helpers (add to auth-session.ts when ready) ───
// import { updateStoredUser } from '@/lib/auth-session';
// import { clearAuthSession } from '@/lib/auth-session';

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

export default function TenantProfilePage() {
  const navigate = useNavigate();
  const currentUser = getStoredUser() || {};
  const userRole = getStoredTenantRole() || 'tenant-employee';
  const canManageTenant = isTenantAdminRole(userRole) || isTenantManagerRole(userRole);
  const tenantCompanyName = currentUser?.tenantCompanyName || currentUser?.workspaceMembership?.tenantCompanyName || getStoredTenantCompanyName() || 'Tenant Workspace';
  const tenantCompanyId = currentUser?.tenantCompanyId || currentUser?.workspaceMembership?.tenantCompanyId || getStoredTenantCompanyId() || '';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'company'>('profile');

  // ─── Profile form ───
  const [profileForm, setProfileForm] = useState({
    fullName: normalizeText(currentUser?.fullName || ''),
    email: normalizeText(currentUser?.email || ''),
    phone: normalizeText(currentUser?.phone || currentUser?.mobile || ''),
    designation: normalizeText(currentUser?.designation || currentUser?.role || ''),
  });

  // ─── Password form ───
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: '',
  });
  const [passwordStep, setPasswordStep] = useState<'current' | 'otp' | 'new'>('current');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        // ─── Backend call (uncomment when backend ready) ───
        // const companiesResult = await getTenantCompanies({ page: 1, limit: 1 });
        // if (!active) return;
        // ...profile data loading

        // ⚠️ Placeholder
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (!active) return;
      } catch (error: any) {
        if (active) setErrorMessage(error?.message || 'Unable to load profile.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadProfile();
    return () => { active = false; };
  }, []);

  const handleProfileUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!profileForm.fullName.trim()) { setErrorMessage('Name is required.'); return; }

    setIsSaving(true);
    setErrorMessage('');
    try {
      // ─── Backend call (uncomment when backend ready) ───
      // const updatedUser = await updateUserProfile({
      //   fullName: profileForm.fullName.trim(),
      //   phone: profileForm.phone.trim(),
      //   designation: profileForm.designation.trim(),
      // });
      // updateStoredUser({ ...currentUser, ...updatedUser });
      // toast.success('Profile updated.');
      setNoticeMessage('Profile updated successfully.');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckPassword = async () => {
    if (!passwordForm.currentPassword) { setErrorMessage('Enter your current password.'); return; }
    setIsSaving(true);
    setErrorMessage('');
    try {
      // ─── Backend call (uncomment when backend ready) ───
      // const result = await checkCurrentPassword(passwordForm.currentPassword);
      // if (!result.valid) { setErrorMessage('Current password is incorrect.'); return; }
      setPasswordStep('otp');
      // await requestChangePasswordOtp();
      setNoticeMessage('OTP sent to your registered email.');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to verify password.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyOtpAndChangePassword = async () => {
    if (!passwordForm.otp) { setErrorMessage('Enter the OTP sent to your email.'); return; }
    if (!passwordForm.newPassword) { setErrorMessage('Enter a new password.'); return; }
    if (passwordForm.newPassword.length < 8) { setErrorMessage('Password must be at least 8 characters.'); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setErrorMessage('Passwords do not match.'); return; }

    setIsSaving(true);
    setErrorMessage('');
    try {
      // ─── Backend call (uncomment when backend ready) ───
      // await verifyChangePasswordOtp(passwordForm.otp, passwordForm.newPassword);
      // toast.success('Password changed successfully.');
      setNoticeMessage('Password changed successfully.');
      setPasswordStep('current');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to change password.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    // ─── Auth session clear (uncomment when backend ready) ───
    // clearAuthSession();
    clearStoredTenantRole();
    navigate('/login');
  };

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] px-6 py-6 font-sans text-[#0F172A] lg:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-slate-700 to-slate-900 text-2xl font-black text-white shadow-md">
            {normalizeText(currentUser?.fullName || 'T').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">My Profile</h1>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Manage your account details and security settings.
            </p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-red-600 shadow-sm transition-colors hover:bg-red-50">
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{errorMessage}</div>
      )}
      {noticeMessage && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{noticeMessage}</div>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <button onClick={() => setActiveTab('profile')} className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 shadow-sm hover:text-slate-900'}`}>
          <User size={14} className="inline mr-1.5" /> Profile
        </button>
        <button onClick={() => setActiveTab('password')} className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'password' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 shadow-sm hover:text-slate-900'}`}>
          <Lock size={14} className="inline mr-1.5" /> Password
        </button>
        {canManageTenant && (
          <button onClick={() => setActiveTab('company')} className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'company' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 shadow-sm hover:text-slate-900'}`}>
            <Building2 size={14} className="inline mr-1.5" /> Company
          </button>
        )}
      </div>

      {activeTab === 'profile' && (
        <div className="rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <User size={20} className="text-[#2563EB]" /> Personal Information
            </h2>
          </div>
          <form onSubmit={handleProfileUpdate} className="space-y-6 p-6 lg:p-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Full Name</label>
                <input type="text" required value={profileForm.fullName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))}
                  className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 font-bold text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="email" value={profileForm.email} disabled
                    className="w-full rounded-xl bg-slate-100 px-4 py-3 pl-11 font-bold text-slate-500 outline-none cursor-not-allowed" />
                </div>
                <p className="px-1 text-[11px] font-semibold text-slate-400">Email cannot be changed here.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="tel" value={profileForm.phone}
                    onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 pl-11 font-bold text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Designation</label>
                <input type="text" value={profileForm.designation}
                  onChange={(e) => setProfileForm((p) => ({ ...p, designation: e.target.value }))}
                  placeholder="e.g. Office Manager"
                  className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 font-bold text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                <Shield size={16} className="text-emerald-600" /> Role: {canManageTenant ? 'Tenant Manager' : 'Tenant Employee'}
              </div>
              <button type="submit" disabled={isSaving}
                className="rounded-xl bg-[#2563EB] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <Lock size={20} className="text-purple-600" /> Change Password
            </h2>
          </div>
          <div className="space-y-6 p-6 lg:p-8">
            {passwordStep === 'current' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                  First, verify your identity by entering your current password.
                </div>
                <div className="space-y-1.5 max-w-md">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Current Password</label>
                  <div className="relative">
                    <input type={showCurrentPassword ? 'text' : 'password'} value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                      placeholder="Enter your current password"
                      className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 pr-11 font-bold text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white" />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button disabled={isSaving} onClick={handleCheckPassword}
                  className="rounded-xl bg-[#2563EB] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSaving ? 'Verifying...' : 'Verify Password'}
                </button>
              </div>
            )}

            {passwordStep === 'otp' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-blue-800">
                  An OTP has been sent to your registered email. Enter it below along with your new password.
                </div>
                <div className="grid gap-6 md:grid-cols-2 max-w-2xl">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">OTP Code</label>
                    <input type="text" value={passwordForm.otp}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, otp: e.target.value }))}
                      placeholder="Enter OTP from email"
                      className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 font-bold text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">New Password</label>
                    <div className="relative">
                      <input type={showNewPassword ? 'text' : 'password'} value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                        placeholder="Min. 8 characters"
                        className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 pr-11 font-bold text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white" />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Confirm New Password</label>
                    <input type="password" value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Re-enter your new password"
                      className="w-full max-w-md rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 font-bold text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setPasswordStep('current')} disabled={isSaving}
                    className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm transition-colors hover:bg-slate-50">Back</button>
                  <button disabled={isSaving} onClick={handleVerifyOtpAndChangePassword}
                    className="rounded-xl bg-purple-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {isSaving ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </div>
            )}

            {passwordStep === 'new' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 size={18} /> Password changed successfully.
                </div>
                <button onClick={() => { setPasswordStep('current'); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' }); }}
                  className="rounded-xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-slate-800">Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'company' && canManageTenant && (
        <div className="rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <Building2 size={20} className="text-emerald-600" /> Company Details
            </h2>
          </div>
          <div className="space-y-6 p-6 lg:p-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Company Name</p>
                <p className="mt-2 text-lg font-black text-slate-900">{tenantCompanyName}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Role</p>
                <p className="mt-2 text-lg font-black text-slate-900">{canManageTenant ? 'Tenant Manager / Admin' : 'Tenant Employee'}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tenant ID</p>
                <p className="mt-2 text-sm font-bold text-slate-600 font-mono">{tenantCompanyId || 'Not assigned'}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Email</p>
                <p className="mt-2 text-sm font-bold text-slate-600">{normalizeText(currentUser?.email || 'No email on file')}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/dashboard/tenant/buy-credits"
                className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-blue-700">
                <RefreshCw size={14} /> Manage Credits
              </Link>
              <Link to="/dashboard/tenant/booking-history"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm transition-colors hover:bg-slate-50">
                <ArrowLeft size={14} /> View Bookings
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
