import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress, Container, Grid, TextField } from "@mui/material";
import { toast } from "sonner";
import Footer from "../../components/Footer";
import { api, axiosPrivate } from "../../utils/axios";
import logo from "../../assets/WONO_LOGO_Black_TP.png";
import "./ClientLogin.css";
import "./ClientSpecialClasses.css";

export default function RegisterOtpVerification() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState("");
  const [emailInput, setEmailInput] = useState(location.state?.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const email = location.state?.email || "";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      const endpoint = token
        ? `/api/auth/register/${token}/verify-otp`
        : "/api/auth/register/verify-otp";
      const payload = token
        ? { otp }
        : { email: emailInput, otp };
      const response = await api.post(endpoint, payload);
      // Clear any pre-existing session so user lands on Sign In instead of auto-login.
      try {
        await axiosPrivate.get("/api/auth/logout");
      } catch {
        // No-op: registration succeeded; logout attempt is best-effort.
      }
      toast.success(response.data?.message || "Registration complete.");
      navigate("/");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "OTP verification failed.");
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
        <h1 className="text-center text-4xl font-bold">VERIFY OTP</h1>
        <div className="loginDividingContainer shrink-container">
          <div className="w-5/6 md:w-2/3">
            <Container maxWidth="lg" style={{ padding: "2rem 0 0" }}>
              <p className="text-center text-sm text-gray-700 mb-6">
                {email || emailInput
                  ? `Enter the OTP sent to ${email || emailInput}`
                  : "Enter the OTP sent to your email"}
              </p>

              <Box component="form" sx={{ flexGrow: 1 }} onSubmit={handleSubmit} noValidate autoComplete="off">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {!token && (
                    <div className="w-full">
                      <TextField
                        label="Email"
                        variant="standard"
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        required
                        fullWidth
                      />
                    </div>
                  )}
                  <div className="w-full">
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

                <div className="flex">
                  <div className="flex flex-col justify-center w-full items-center gap-4 mt-6">
                    <button
                      disabled={isSubmitting}
                      type="submit"
                      className="loginButtonStyling text-decoration-none text-subtitle w-40"
                    >
                      {isSubmitting ? <CircularProgress size={20} color="inherit" /> : "VERIFY"}
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
