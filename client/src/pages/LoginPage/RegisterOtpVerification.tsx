import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress, Container, Grid, TextField } from "@mui/material";
import { toast } from "sonner";
import Footer from "../../components/Footer";
import { api, axiosPrivate } from "../../utils/axios";
import { showSuccessAlert } from "../../utils/alerts";
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
      const successMessage =
        flow === "tenant-register" && companyName
          ? `You are now registered as a team member of ${companyName}. Use the same credentials to sign in.`
          : response.data?.message || "Registration successful. Redirecting to Sign In...";
      await showSuccessAlert(successMessage);
      navigate("/", { replace: true });
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
      </div>

      <Footer />
    </div>
  );
}
