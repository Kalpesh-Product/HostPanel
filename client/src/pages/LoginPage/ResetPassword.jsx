import React, { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
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
  const [loading, setLoading] = useState(false);
  const refresh = useRefresh();
  const { token } = useParams();

  useEffect(() => {
    if (auth?.user) navigate("/profile/my-profile", { replace: true });
  }, [auth, navigate]);

  const { mutate: submitReset, isPending: isResetPending } = useMutation({
    mutationFn: async (data) => {
      const payload = {
        password: data.password,
        confirmPassword: data.confirmPassword,
      };

      console.log("reset password", payload);
      const response = await axios.patch(
        `/api/auth/reset-password/${token}`,
        payload
      );
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
        toast.error(message);
      } else {
        toast.error("Network error. Please check your connection.");
      }
    },
  });

  const onSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    submitReset({ password, confirmPassword });
  };

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
            <button className="bg-white text-black py-2 px-4 rounded-full uppercase">
              Sign In
            </button>
          </a>
          <a href="https://www.wono.co/register">
            <button className="bg-sky-400 text-white py-2 px-4 rounded-full uppercase">
              Sign Up
            </button>
          </a>
        </div> */}

            {/* Mobile Menu Button */}
            <div className="">
              <div className="p-4 px-0 whitespace-nowrap">
                <button
                  onClick={() =>
                    (window.location.href = "https://nomad.wono.co")
                  }
                  className="relative pb-1 transition-all cursor-pointer duration-300 group font-bold bg-transparent uppercase border-none"
                >
                  Become a nomad
                  <span className="absolute left-0 w-0 bottom-0 block h-[2px] bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
                </button>
              </div>
            </div>
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
          <button onClick={() => setDrawerOpen(false)}>
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
      <div className="login-section loginTopPadding loginBottomPadding poppinsRegular heightPadding">
        <h1 className="text-center text-4xl font-bold">RESET PASSWORD</h1>
        <div className="loginDividingContainer shrink-container">
          <div className="w-5/6 md:w-3/4">
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
                      onChange={(e) => setPassword(e.target.value)}
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
                          disabled={isResetPending}
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
                    {/* <p className="text-[0.9rem]">
                      Don't have an account?{" "}
                      <span
                        onClick={() =>
                          (window.location.href =
                            "https://hosts.wono.co/signup")
                        }
                        className="underline hover:text-primary cursor-pointer"
                      >
                        Sign Up
                      </span>
                    </p> */}
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
