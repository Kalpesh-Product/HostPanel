import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress, Container, Grid, TextField } from "@mui/material";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Footer from "../../components/Footer";
import { api, axiosPrivate } from "../../utils/axios";
import { writeInviteOnboardingState } from "../../utils/inviteOnboarding";
import logo from "../../assets/WONO_LOGO_Black_TP.png";
import "./ClientLogin.css";
import "./ClientSpecialClasses.css";

export default function RegisterOtpVerification() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const flow = location.state?.flow === "forgot-password" ? "forgot-password"
    : location.state?.flow === "tenant-register" ? "tenant-register"
    : "register";
  const [otp, setOtp] = useState("");
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  const [emailInput] = useState(location.state?.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const email = location.state?.email || "";
  const fullName = location.state?.fullName || "";
  const companyName = location.state?.companyName || "";
  const inviteToken = location.state?.inviteToken || "";
  const selectedPlan = location.state?.selectedPlan || "basic";
  const businessName = location.state?.businessName || "";
  const inviteType = location.state?.inviteType === "workspace" ? "workspace" : "master";
  const country = location.state?.country || "";
  const state = location.state?.state || "";
  const city = location.state?.city || "";
  const businessTypes = Array.isArray(location.state?.businessTypes)
    ? location.state.businessTypes
        .map((item: unknown) => String(item || "").trim())
        .filter(Boolean)
    : [];

  useEffect(() => {
    if (!showRegistrationSuccess) return;

    const redirectTimer = setTimeout(() => {
      navigate("/", { replace: true });
    }, 3000);

    return () => clearTimeout(redirectTimer);
  }, [navigate, showRegistrationSuccess]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      const endpoint =
        flow === "forgot-password"
          ? "/api/auth/forgot-password/verify-otp"
          : flow === "tenant-register"
          ? "/api/auth/tenant-register/verify-otp"
          : token
          ? `/api/auth/register/${token}/verify-otp`
          : "/api/auth/register/verify-otp";
      const payload =
        flow === "forgot-password"
          ? { email: email || emailInput, otp }
          : flow === "tenant-register"
          ? { inviteToken, otp }
          : token
          ? { otp }
          : { email: emailInput, otp };
      const response = await api.post(endpoint, payload);
      // Clear any pre-existing session so user lands on Sign In instead of auto-login.
      try {
        await axiosPrivate.get("/api/auth/logout");
      } catch {
        // No-op: registration succeeded; logout attempt is best-effort.
      }
      if (flow === "forgot-password") {
        const sessionToken = response.data?.resetSessionToken || "";
        navigate("/forgot-password/reset", {
          state: {
            email: email || emailInput,
            resetSessionToken: sessionToken,
            flow: "forgot-password",
          },
        });
        if (sessionToken) {
          navigate(
            `/forgot-password/reset?email=${encodeURIComponent(
              email || emailInput,
            )}&session=${encodeURIComponent(sessionToken)}`,
            {
              state: {
                email: email || emailInput,
                resetSessionToken: sessionToken,
                flow: "forgot-password",
              },
              replace: true,
            },
          );
        }
        return;
      }
      if (token && email && flow !== "tenant-register") {
        writeInviteOnboardingState({
          source: "invite",
          email,
          fullName,
          selectedPlan,
          businessName,
          inviteType,
          country,
          state,
          city,
          businessTypes,
        });
      }
      toast.success(response.data?.message || "Registration complete.");
      setShowRegistrationSuccess(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "OTP verification failed.");
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
        {showRegistrationSuccess ? (
          <div className="w-full max-w-2xl mx-auto min-h-[58vh] flex items-center justify-center px-4">
            <div className="w-full rounded-[24px] border border-[#d9e6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] shadow-[0_16px_50px_rgba(23,73,182,0.14)] px-5 md:px-8 py-8 md:py-9 text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 mx-auto rounded-full bg-[#e8f1ff] flex items-center justify-center mb-4">
                <CheckCircle2 className="text-[#2d67f0]" size={30} strokeWidth={2.5} />
              </div>
              <h1 className="text-[22px] md:text-[26px] leading-tight font-bold text-[#102a56] mb-2 text-center">
                Registration Successful
              </h1>
              <p className="text-[14px] md:text-[15px] leading-relaxed text-[#4b5e80] max-w-[520px] mx-auto">
                {flow === "tenant-register" && companyName
                  ? `You are now registered as a team member of ${companyName}. Use the same credentials to sign in.`
                  : "Redirecting to Sign In page. Use the same credentials to sign in."}
              </p>
              <p className="mt-4 text-[12px] text-[#6b7fa7] font-medium">
                Redirecting in a few seconds...
              </p>
            </div>
          </div>
        ) : (
          <>
        <h1 className="text-center text-4xl font-bold">VERIFY OTP</h1>
        <div className="loginDividingContainer shrink-container">
          <div className="w-5/6 md:w-2/3">
            <Container maxWidth="lg" style={{ padding: "3rem 0 0" }}>
              <p className="text-center text-sm text-gray-700 mb-6">
                {email || emailInput ? (
                  <>
                    Enter the OTP sent to{" "}
                    <span className="font-semibold text-gray-900">{email || emailInput}</span>
                  </>
                ) : (
                  "Enter the OTP sent to your email"
                )}
              </p>

              <Box component="form" sx={{ flexGrow: 1 }} onSubmit={handleSubmit} noValidate autoComplete="off">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="w-full lg:col-start-1 lg:col-end-3 lg:max-w-[50%] lg:mx-auto">
                    <TextField
                      label="OTP"
                      variant="standard"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      fullWidth
                    />
                  </div>
                </div>
                <div className="mt-2 col-span-2 text-end min-h-[1.5rem]" />

                <div className="flex">
                  <div className="flex flex-col justify-center w-full items-center gap-4 mt-4">
                    <Grid size={12}>
                      <div className="centerInPhone">
                        <button
                          disabled={isSubmitting}
                          type="submit"
                          className="loginButtonStyling text-decoration-none text-subtitle w-40"
                        >
                          {isSubmitting ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "VERIFY"}
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
