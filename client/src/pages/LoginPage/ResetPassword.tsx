// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useNavigate, Link, useParams, useLocation, useSearchParams } from "react-router-dom";
import { Container, Box, Grid, TextField } from "@mui/material";
import { toast } from "sonner";
import useRefresh from "../../hooks/useRefresh";
import { api } from "../../utils/axios";
import useAuth from "../../hooks/useAuth";
import "./ClientLogin.css";
import "./ClientSpecialClasses.css";
import Footer from "../../components/Footer";
import { CircularProgress, InputAdornment, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { CheckCircle, XCircle } from "lucide-react";
import { Drawer, List, ListItem, ListItemText } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { IoCloseSharp } from "react-icons/io5";
import logo from "../../assets/WONO_LOGO_Black_TP.png";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { useMutation } from "@tanstack/react-query";

const ResetPassword = () => {
  const { auth, setAuth } = useAuth();
  const axios = useAxiosPrivate();
  const user = auth.user;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordReuseError, setPasswordReuseError] = useState("");
  const [loading, setLoading] = useState(false);
  const refresh = useRefresh();
  const { token } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const resetSessionToken =
    location.state?.resetSessionToken || searchParams.get("session") || "";
  const isForgotPasswordFlow =
    location.state?.flow === "forgot-password" || Boolean(searchParams.get("session"));

  useEffect(() => {
    if (isForgotPasswordFlow && !resetSessionToken) {
      toast.error("Reset session missing. Please verify OTP again.");
      navigate("/forgot-password", { replace: true });
    }
  }, [isForgotPasswordFlow, resetSessionToken, navigate]);

  const { mutate: submitReset, isPending: isResetPending } = useMutation({
    mutationFn: async (data) => {
      const payload = {
        password: data.password,
        confirmPassword: data.confirmPassword,
      };

      console.log("reset password", payload);
      const response = isForgotPasswordFlow
        ? await api.post("/api/auth/forgot-password/reset", {
            ...payload,
            resetSessionToken,
          })
        : await axios.patch(`/api/auth/reset-password/${token}`, payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Password reset successful");

      navigate("/");
    },
    onError: (error) => {
      if (error.response) {
        const { status, data } = error.response;
        let message = "Something went wrong";
        if (status === 400) message = data.message;
        else if (status === 401 && data?.message) message = data.message;
        else if (status === 500)
          message = "Internal server error. Please try again.";
        if (
          String(message || "")
            .toLowerCase()
            .includes("same as current or last 2 passwords")
        ) {
          setPasswordReuseError("New password cannot be same as last used password.");
        } else {
          setPasswordReuseError("");
        }
        toast.error(message);
      } else {
        setPasswordReuseError("");
        toast.error("Network error. Please check your connection.");
      }
    },
  });

  const onSubmit = (e) => {
    e.preventDefault();
    setPasswordReuseError("");
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Must be at least 8 characters long.");
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
      toast.error("Should include both uppercase and lowercase letters.");
      return;
    }
    if (!/[\d\W]/.test(password)) {
      toast.error("Must contain at least one number or special character.");
      return;
    }
    submitReset({ password, confirmPassword });
  };

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
  const canSubmitReset =
    hasAllPasswordChecks &&
    hasConfirmValue &&
    isPasswordMatch &&
    Boolean(password) &&
    !passwordReuseError &&
    !isResetPending;

  return (
    <>
      {/* Header */}
      <div className="shadow-md bg-white/80 backdrop-blur-md">
        <div className="min-w-[75%] max-w-[80rem] lg:max-w-[80rem] mx-0 md:mx-auto px-6 sm:px-6 lg:px-0 ">
          <div className=" flex justify-between items-center py-3 ">
            {/* Logo */}
            <a href="https://wono.co">
              <img src={logo} alt="wono" className="w-36 h-10" />
            </a>

            {/* Desktop Nav */}
            {/* <ul className="hidden md:flex gap-6 text-black uppercase font-thin items-center">
          {navItems.map((item, idx) => (
            <li key={idx} className="cursor-pointer hover:underline">
              <a href={item.link}>{item.label}</a>
            </li>
          ))}
        </ul> */}

            {/* Desktop Buttons */}
            {/* <div className="hidden md:flex gap-4">
          <a href="https://wonofe.vercel.app">
            <button type="button" className="bg-white text-black py-2 px-4 rounded-full uppercase">
              Sign In
            </button>
          </a>
          <a href="https://www.wono.co/register">
            <button type="button" className="bg-sky-400 text-white py-2 px-4 rounded-full uppercase">
              Sign Up
            </button>
          </a>
        </div> */}

            <div className="" />
            {/* <div className="md:hidden">
          <div onClick={() => setDrawerOpen(true)} className="text-white">
            <MenuIcon />
          </div>
        </div> */}
          </div>
        </div>
      </div>
      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {/* Drawer Header */}
        <div className="w-full bg-black text-white flex justify-end items-center border-b border-gray-700 p-4 text-2xl">
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close drawer"
            title="Close"
          >
            <IoCloseSharp />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="w-96 h-screen p-6 flex flex-col gap-8 items-center uppercase bg-black text-white text-center">
          <div
            className="cursor-pointer hover:text-gray-400"
            onClick={() => setDrawerOpen(false)}
          >
            <a href="https://wono.co/" className="block w-full uppercase">
              Home
            </a>
          </div>
          <hr className="w-[80%] text-gray-300" />

          {/* Dynamic nav items */}
          {/* {navItems.map((item, index) => (
            <React.Fragment key={index}>
              <div
                className="cursor-pointer hover:text-gray-400"
                onClick={() => setDrawerOpen(false)}
              >
                <a href={item.link} className="block w-full uppercase">
                  {item.label}
                </a>
              </div>
              <hr className="w-[80%] text-gray-300" />
            </React.Fragment>
          ))} */}

          {/* Sign In button */}
          <div className="flex flex-col w-full items-center gap-6">
            <div>
              <a
                href="https://wonofe.vercel.app"
                className="block px-10 py-2 uppercase bg-white text-black mx-auto w-max rounded-full"
              >
                Sign In
              </a>
            </div>
            <hr className="w-[75%]" />
            <div>
              <a
                href="https://wono.co/register"
                className="block px-10 py-2 uppercase bg-[#0aa9ef] text-white mx-auto w-max rounded-full"
              >
                Sign Up
              </a>
            </div>
          </div>
        </div>
      </Drawer>
      {/* Header */}
      <div className="login-section loginTopPadding loginBottomPadding poppinsRegular heightPadding min-h-screen">
        <h1 className="text-center text-4xl font-bold">RESET PASSWORD</h1>
        <div className="loginDividingContainer shrink-container">
          <div className="w-5/6 md:w-2/3">
            <Container
              maxWidth="lg"
              style={{ padding: "3rem 0 0" }}
              direction={{ xs: "column", md: "row" }}
            >
              <Box
                component="form"
                sx={{ flexGrow: 1 }}
                onSubmit={onSubmit}
                noValidate
                autoComplete="off"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* <Grid item xs={12}>
                    <TextField
                      label="Email"
                      variant="standard"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      fullWidth
                    />
                  </Grid> */}

                  <Grid item xs={12}>
                    <TextField
                      label="Password"
                      variant="standard"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPasswordReuseError("");
                        setPassword(e.target.value);
                      }}
                      required
                      fullWidth
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              size="small"
                            >
                              {showPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
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
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              edge="end"
                              size="small"
                            >
                              {showConfirmPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </div>
                <div className="mt-2 col-span-2 text-end min-h-[1.5rem]" />
                {passwordReuseError ? (
                  <div className="w-full text-left text-xs text-red-600 mt-1 ml-1">
                    {passwordReuseError}
                  </div>
                ) : null}
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

                {/* <div className="mt-2 col-span-2 text-end">
                  <Link
                    to="https://wono.co/forgot-password"
                    className="hover:underline text-black"
                  >
                    Forgot Password?
                  </Link>
                </div> */}
                <div className="flex">
                  <div className="flex flex-col justify-center w-full items-center gap-4 mt-4">
                    <Grid item xs={12}>
                      <div className="centerInPhone">
                        <button
                          disabled={!canSubmitReset}
                          type="submit"
                          className="loginButtonStyling text-decoration-none text-subtitle w-40"
                        >
                          {isResetPending ? (
                            <CircularProgress size={20} color="white" />
                          ) : (
                            "RESET"
                          )}
                        </button>
                        {/* <button
                          disabled={loading}
                          type="button"
                          className="loginButtonStyling text-decoration-none text-subtitle w-40"
                          onClick={() => navigate("/dashboard")}>
                          SIGN IN
                        </button> */}
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
      <div>
        <Footer />
      </div>
    </>
  );
};

export default ResetPassword;


