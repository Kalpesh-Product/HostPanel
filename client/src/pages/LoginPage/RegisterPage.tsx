import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle, CheckCircle2, Eye, EyeOff, Lock, XCircle } from "lucide-react";
import type { AxiosError } from "axios";
import {
  Box,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
} from "@mui/material";
import { toast } from "sonner";
import Footer from "../../components/Footer";
import { api } from "../../utils/axios";
import type { InviteType, PlanType } from "../../utils/inviteOnboarding";
import logo from "../../assets/WONO_LOGO_Black_TP.png";
import "./ClientLogin.css";
import "./ClientSpecialClasses.css";

interface PrefillState {
  fullName: string;
  email: string;
  selectedPlan: PlanType;
  businessName: string;
  inviteType: InviteType;
  country: string;
  state: string;
  city: string;
  businessTypes: string[];
}

interface TenantPrefillState {
  fullName: string;
  email: string;
  role: string;
  tenantRole: string;
  companyName: string;
  tenantCompanyId: string;
  inviteToken: string;
}

const parseBusinessTypes = (payload: Record<string, unknown>): string[] => {
  const raw =
    payload.businessTypes ??
    payload.businessType ??
    payload.companyTypes ??
    payload.companyType ??
    payload.verticalTypes ??
    payload.verticalType ??
    payload.verticals ??
    payload.workspaceType ??
    payload.workspaceTypes ??
    [];

  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(raw || "")
    .split(/[,|/;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export default function RegisterPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [prefill, setPrefill] = useState<PrefillState>({
    fullName: "",
    email: "",
    selectedPlan: "basic",
    businessName: "",
    inviteType: "master",
    country: "",
    state: "",
    city: "",
    businessTypes: [],
  });
  const [tenantPrefill, setTenantPrefill] = useState<TenantPrefillState | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoadingPrefill, setIsLoadingPrefill] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const inviteToken = searchParams.get("inviteToken");
  const isTenantInvite = Boolean(inviteToken);
  const isTokenMissing = useMemo(() => !token && !isTenantInvite, [token, isTenantInvite]);
  const passwordChecks = [
    {
      key: "length",
      label: "Must be at least 8 characters long.",
      passed: password.length >= 8,
    },
    {
      key: "case",
      label: "Should include uppercase and lowercase letters.",
      passed: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      key: "digitOrSpecial",
      label: "Must contain at least one number or special character.",
      passed: /[\d\W]/.test(password),
    },
  ];
  const hasAllPasswordChecks = passwordChecks.every((rule) => rule.passed);
  const hasConfirmValue = confirmPassword.length > 0;
  const isPasswordMatch = password === confirmPassword;
  const canSubmitRegister =
    hasAllPasswordChecks &&
    hasConfirmValue &&
    isPasswordMatch &&
    Boolean(password) &&
    !(isSubmitting || (!isTokenMissing && isLoadingPrefill)) &&
    !registrationSuccess;

  // Redirect to sign in after successful registration
  useEffect(() => {
    if (!registrationSuccess) return;
    const timer = setTimeout(() => {
      navigate("/", { replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate, registrationSuccess]);

  const loadPrefill = useCallback(async () => {
    if (!token && !isTenantInvite) {
      setIsLoadingPrefill(false);
      return;
    }
    try {
      setIsLoadingPrefill(true);
      if (isTenantInvite) {
        const response = await api.get("/api/auth/tenant-register/prefill", {
          params: { inviteToken },
        });
        setTenantPrefill({
          fullName: response.data.fullName || "",
          email: response.data.email || "",
          role: response.data.role || "Employee",
          tenantRole: response.data.tenantRole || "tenant-employee",
          companyName: response.data.companyName || "",
          tenantCompanyId: response.data.tenantCompanyId || "",
          inviteToken: response.data.inviteToken || inviteToken,
        });
      } else {
        const response = await api.get(`/api/auth/register/${token}/prefill`);
        setPrefill({
          fullName: response.data.fullName || "",
          email: response.data.email || "",
          selectedPlan: response.data.selectedPlan || "basic",
          businessName: response.data.businessName || "",
          inviteType: response.data.inviteType === "workspace" ? "workspace" : "master",
          country: response.data.country || "",
          state: response.data.state || "",
          city: response.data.city || "",
          businessTypes: parseBusinessTypes(response.data as Record<string, unknown>),
        });
      }
    } catch (error) {
      const message = (error as AxiosError<{ message?: string }>).response?.data?.message;
      toast.error(message || "Invalid or expired invite link.");
    } finally {
      setIsLoadingPrefill(false);
    }
  }, [token, isTenantInvite, inviteToken]);

  useEffect(() => {
    loadPrefill();
  }, [loadPrefill]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      if (isTenantInvite && tenantPrefill) {
        const response = await api.post("/api/auth/tenant-register/send-otp", {
          inviteToken: tenantPrefill.inviteToken,
          password,
          confirmPassword,
        });
        toast.success(response.data?.message || "OTP sent to your email.");
        navigate("/register/verify", {
          state: {
            email: tenantPrefill.email,
            fullName: tenantPrefill.fullName,
            companyName: tenantPrefill.companyName,
            tenantRole: tenantPrefill.tenantRole,
            role: tenantPrefill.role,
            tenantCompanyId: tenantPrefill.tenantCompanyId,
            inviteToken: tenantPrefill.inviteToken,
            flow: "tenant-register",
          },
        });
      } else {
        const endpoint = token
          ? `/api/auth/register/${token}/start`
          : "/api/auth/register/start";
        const response = await api.post(endpoint, {
          fullName: prefill.fullName,
          email: prefill.email,
          password,
          confirmPassword,
        });
        toast.success(response.data?.message || "OTP sent.");
        navigate(token ? `/register/${token}/verify` : "/register/verify", {
          state: {
            email: prefill.email,
            fullName: prefill.fullName,
            selectedPlan: prefill.selectedPlan,
            businessName: prefill.businessName,
            inviteType: prefill.inviteType,
            country: prefill.country,
            state: prefill.state,
            city: prefill.city,
            businessTypes: prefill.businessTypes,
          },
        });
      }
    } catch (error) {
      const message = (error as AxiosError<{ message?: string }>).response?.data?.message;
      toast.error(message || "Failed to complete registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 font-pregular">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-300 shadow-sm">
        <div className="min-w-[75%] max-w-[80rem] mx-0 md:mx-auto px-6 sm:px-6 lg:px-0 flex items-center justify-between py-4">
          <a href="https://wono.co">
            <img src={logo} alt="wono" className="w-36 h-10" />
          </a>
        </div>
      </header>

      <div className="login-section loginTopPadding loginBottomPadding poppinsRegular heightPadding">
        {registrationSuccess ? (
          <div className="w-full max-w-2xl mx-auto min-h-[58vh] flex items-center justify-center px-4">
            <div className="w-full rounded-[24px] border border-[#d9e6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] shadow-[0_16px_50px_rgba(23,73,182,0.14)] px-5 md:px-8 py-8 md:py-9 text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 mx-auto rounded-full bg-[#e8f1ff] flex items-center justify-center mb-4">
                <CheckCircle2 className="text-[#2d67f0]" size={30} strokeWidth={2.5} />
              </div>
              <h1 className="text-[22px] md:text-[26px] leading-tight font-bold text-[#102a56] mb-2 text-center">
                Registration Successful
              </h1>
              <p className="text-[14px] md:text-[15px] leading-relaxed text-[#4b5e80] max-w-[520px] mx-auto">
                {isTenantInvite
                  ? `You are now registered as a team member of ${tenantPrefill?.companyName || "your company"}. Use the same credentials to sign in.`
                  : "Redirecting to Sign In page. Use the same credentials to sign in."}
              </p>
              <p className="mt-4 text-[12px] text-[#6b7fa7] font-medium">
                Redirecting in a few seconds...
              </p>
            </div>
          </div>
        ) : (
        <>
        <h1 className="text-center text-4xl font-bold">{isTenantInvite ? "JOIN YOUR COMPANY" : "REGISTER YOURSELF!"}</h1>
        {isTenantInvite && tenantPrefill && (
          <p className="text-center text-sm text-gray-600 mt-2">
            You've been invited to join <strong>{tenantPrefill.companyName}</strong> as a <strong>{tenantPrefill.role}</strong>
          </p>
        )}
        <div className="loginDividingContainer shrink-container">
          <div className="w-5/6 md:w-2/3">
            <Container maxWidth="lg" style={{ padding: "3rem 0 0" }}>
              <Box component="form" sx={{ flexGrow: 1 }} onSubmit={handleSubmit} noValidate autoComplete="off">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Grid size={12}>
                    <TextField
                      label="Full Name"
                      variant="standard"
                      value={isTenantInvite ? (tenantPrefill?.fullName || "") : prefill.fullName}
                      disabled={!isTokenMissing || isTenantInvite}
                      InputProps={
                        (!isTokenMissing || isTenantInvite)
                          ? {
                              endAdornment: (
                                <InputAdornment position="end">
                                  <Lock size={16} className="text-gray-500" />
                                </InputAdornment>
                              ),
                            }
                          : undefined
                      }
                      onChange={(e) =>
                        isTokenMissing && !isTenantInvite && setPrefill((prev) => ({ ...prev, fullName: e.target.value }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      label="Email"
                      variant="standard"
                      type="email"
                      value={isTenantInvite ? (tenantPrefill?.email || "") : prefill.email}
                      disabled={!isTokenMissing || isTenantInvite}
                      InputProps={
                        (!isTokenMissing || isTenantInvite)
                          ? {
                              endAdornment: (
                                <InputAdornment position="end">
                                  <Lock size={16} className="text-gray-500" />
                                </InputAdornment>
                              ),
                            }
                          : undefined
                      }
                      onChange={(e) =>
                        isTokenMissing && !isTenantInvite && setPrefill((prev) => ({ ...prev, email: e.target.value }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      label="Password"
                      variant="standard"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      fullWidth
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword((prev) => !prev)}
                              edge="end"
                              size="small"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              title={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff size={16} className="text-gray-500" /> : <Eye size={16} className="text-gray-500" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      label="Confirm Password"
                      variant="standard"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      fullWidth
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPassword((prev) => !prev)}
                              edge="end"
                              size="small"
                              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                              title={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                              {showConfirmPassword ? <EyeOff size={16} className="text-gray-500" /> : <Eye size={16} className="text-gray-500" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </div>
                <div className="mt-2 col-span-2 text-end min-h-[1.5rem]" />
                {hasConfirmValue ? (
                  <div
                    className={`w-full text-left text-xs mt-1 ml-1 ${
                      isPasswordMatch ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isPasswordMatch ? "Passwords match." : "Passwords do not match."}
                  </div>
                ) : null}
                <div className="w-full text-left text-xs mt-2 leading-6 ml-1">
                  {passwordChecks.map((rule) => (
                    <p
                      key={rule.key}
                      className={`flex items-center gap-1 ${
                        rule.passed ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {rule.passed ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      <span>{rule.label}</span>
                    </p>
                  ))}
                </div>

                <div className="flex">
                  <div className="flex flex-col justify-center w-full items-center gap-4 mt-4">
                    <Grid size={12}>
                      <div className="centerInPhone">
                        <button
                          disabled={!canSubmitRegister}
                          type="submit"
                          className="loginButtonStyling text-decoration-none text-subtitle w-40"
                        >
                          {isSubmitting ? <CircularProgress size={20} color="inherit" /> : "CONTINUE"}
                        </button>
                      </div>
                    </Grid>
                    <p className="text-[0.9rem]">
                      Already have an account?{" "}
                      <Link to="/" className="underline hover:text-primary">
                        Sign In
                      </Link>
                    </p>
                  </div>
                </div>
              </Box>
            </Container>
          </div>
        </div>
      </>
      )}
      </div>
      <Footer />
    </div>
  );
}
