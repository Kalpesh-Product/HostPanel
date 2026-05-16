import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff, Lock } from "lucide-react";
import type { AxiosError } from "axios";
import {
  Box,
  CircularProgress,
  Container,
  Grid,
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
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoadingPrefill, setIsLoadingPrefill] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTokenMissing = useMemo(() => !token, [token]);

  useEffect(() => {
    const loadPrefill = async () => {
      if (!token) {
        setIsLoadingPrefill(false);
        return;
      }
      try {
        setIsLoadingPrefill(true);
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
      } catch (error) {
        const message = (error as AxiosError<{ message?: string }>).response?.data?.message;
        toast.error(message || "Invalid or expired invite link.");
      } finally {
        setIsLoadingPrefill(false);
      }
    };
    loadPrefill();
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
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
    } catch (error) {
      const message = (error as AxiosError<{ message?: string }>).response?.data?.message;
      toast.error(message || "Failed to start registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#efefef] text-gray-900 font-pregular">
      <header className="bg-[#efefef] border-b border-gray-300 shadow-sm">
        <div className="min-w-[75%] max-w-[80rem] mx-0 md:mx-auto px-6 sm:px-6 lg:px-0 flex items-center justify-between py-4">
          <a href="https://wono.co">
            <img src={logo} alt="wono" className="w-36 h-10" />
          </a>
          <button
            type="button"
            onClick={() => (window.location.href = "https://nomad.wono.co")}
            className="relative pb-1 transition-all duration-300 group font-bold bg-transparent uppercase border-none"
          >
            Become a nomad
            <span className="absolute left-0 w-0 bottom-0 block h-[2px] bg-blue-500 transition-all duration-300 group-hover:w-full" />
          </button>
        </div>
      </header>

      <div className="login-section loginTopPadding loginBottomPadding poppinsRegular heightPadding">
        <h1 className="text-center text-4xl font-bold">REGISTER YOURSELF!</h1>
        <div className="loginDividingContainer shrink-container">
          <div className="w-5/6 md:w-2/3">
            <Container maxWidth="lg" style={{ padding: "3rem 0 0" }}>
              <Box component="form" sx={{ flexGrow: 1 }} onSubmit={handleSubmit} noValidate autoComplete="off">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Grid size={12}>
                    <TextField
                      label="Full Name"
                      variant="standard"
                      value={prefill.fullName}
                      disabled={!isTokenMissing}
                      InputProps={
                        !isTokenMissing
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
                        isTokenMissing && setPrefill((prev) => ({ ...prev, fullName: e.target.value }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      label="Email"
                      variant="standard"
                      type="email"
                      value={prefill.email}
                      disabled={!isTokenMissing}
                      InputProps={
                        !isTokenMissing
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
                        isTokenMissing && setPrefill((prev) => ({ ...prev, email: e.target.value }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid size={12}>
                    <div className="relative">
                      <TextField
                        label="Password"
                        variant="standard"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        fullWidth
                      />
                      <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-2 top-2 text-gray-500 hover:text-black">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </Grid>
                  <Grid size={12}>
                    <div className="relative">
                      <TextField
                        label="Confirm Password"
                        variant="standard"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        fullWidth
                      />
                      <button type="button" onClick={() => setShowConfirmPassword((prev) => !prev)} className="absolute right-2 top-2 text-gray-500 hover:text-black">
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </Grid>
                </div>

                <div className="flex">
                  <div className="flex flex-col justify-center w-full items-center gap-4 mt-6">
                    <button
                      disabled={isSubmitting || (!isTokenMissing && isLoadingPrefill)}
                      type="submit"
                      className="loginButtonStyling text-decoration-none text-subtitle w-40"
                    >
                      {isSubmitting ? <CircularProgress size={20} color="inherit" /> : "CONTINUE"}
                    </button>
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
      </div>

      <Footer />
    </div>
  );
}
