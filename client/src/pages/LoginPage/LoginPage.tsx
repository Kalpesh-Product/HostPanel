import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Container, Box, Grid, TextField } from "@mui/material";
import { toast } from "sonner";
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
import { readInviteOnboardingState } from "../../utils/inviteOnboarding";
import { setAuthTabSessionActive } from "../../utils/authSession";
import { setTabRefreshToken } from "../../utils/refreshTokenSession";
import { setStoredTenantRole } from "../../lib/tenant-session";
import { useQueryClient } from "@tanstack/react-query";
import { clearUserSessionData } from "../../utils/clearUserSessionData";

const LoginPage = () => {
  const { auth, setAuth } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Kept as comments per request: do not delete company project code.
  // const defaultModules = [
  //   {
  //     id: 1,
  //     title: "Dashboard",
  //     submenus: [
  //       {
  //         id: 4,
  //         title: "Finance Dashboard",
  //         codeName: "Finance",
  //         route: "/app/company-settings",
  //       },
  //       {
  //         id: 5,
  //         title: "Sales Dashboard",
  //         codeName: "Sales",
  //         route: "/app/company-settings",
  //       },
  //       {
  //         id: 3,
  //         title: "HR Dashboard",
  //         codeName: "HR",
  //         route: "/app/company-settings",
  //       },
  //       {
  //         id: 2,
  //         title: "Frontend Dashboard",
  //         codeName: "Tec",
  //         route: "/app/company-settings",
  //       },
  //       {
  //         id: 6,
  //         title: "Admin Dashboard",
  //         codeName: "Administration",
  //         route: "/app/company-settings",
  //       },
  //       {
  //         id: 7,
  //         title: "Maintenance Dashboard",
  //         codeName: "Maintenance",
  //         route: "/app/company-settings",
  //       },
  //       {
  //         id: 9,
  //         title: "IT Dashboard",
  //         codeName: "IT",
  //         route: "/app/company-settings",
  //       },
  //       {
  //         id: 8,
  //         title: "Cafe Dashboard",
  //         codeName: "Cafe",
  //         route: "/app/company-settings",
  //       },
  //     ],
  //   },
  // ];
  // const userDepartments = auth.user?.departments?.map((item) => item.name);
  // const filteredModules = defaultModules.map((module) => {
  //   const filteredSubmenus = module.submenus?.filter((submenu) =>
  //     userDepartments?.includes(submenu.codeName)
  //   );
  //
  //   return {
  //     ...module,
  //     submenus: filteredSubmenus,
  //   };
  // });
  //
  // const hasAnySubmenus = filteredModules.some(
  //   (module) => module.submenus.length > 0
  // );
  //
  // const firstAvailableRoute = hasAnySubmenus
  //   ? filteredModules.find((module) => module.submenus.length > 0).submenus[0]
  //       .route
  //   : "/company-settings";
  const shouldGoToCreateWorkspace = (userData) => {
    // Tenant employees should never go to create workspace
    if (userData?.tenantRole) return false;

    const pendingInviteOnboarding = readInviteOnboardingState();
    if (
      pendingInviteOnboarding &&
      pendingInviteOnboarding.email &&
      pendingInviteOnboarding.email === userData?.email
    ) {
      return pendingInviteOnboarding.inviteType !== "workspace";
    }

    if (userData?.hasCompletedWorkspaceSetup === false) {
      return true;
    }

    if (userData?.hasCompletedWorkspaceSetup === true) {
      return false;
    }

    const companyId = userData?.companyId || "";
    const hasCompanyName = Boolean(userData?.companyName);
    return !hasCompanyName || companyId.includes("-dev-");
  };

  // Validation function
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.post(
        "/api/auth/login",
        { email, password },
        {
          withCredentials: true,
        }
      );
      const accessToken = response?.data?.accessToken || "";
      const loginUser = response?.data?.user || null;

      let hydratedUser = loginUser;
      if (accessToken) {
        try {
          const profileResponse = await api.get("/api/profile/me", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          const profileUser = profileResponse?.data?.data?.user || null;
          if (profileUser) {
            hydratedUser = {
              ...(loginUser || {}),
              ...profileUser,
              workspaceMembership: {
                ...(loginUser?.workspaceMembership || {}),
                ...(profileUser?.workspaceMembership || {}),
              },
              logo: profileUser?.logo ?? null,
            };
          }
        } catch {
          // If profile hydration fails, continue with login payload.
        }
      }

      // A login can follow another account in the same SPA session. Remove
      // every prior user's query data and legacy workspace-plan fallback first.
      queryClient.clear();
      clearUserSessionData();
      setAuth((prevState) => {
        return {
          ...prevState,
          accessToken,
          user: hydratedUser,
        };
      });
      setTabRefreshToken(response?.data?.refreshToken || "");
      setAuthTabSessionActive();
      toast.success("Successfully logged in");
      const nextUser = hydratedUser;

      // Store tenant role info if user is a tenant employee
      const tenantRole = nextUser?.tenantRole || response?.data?.user?.tenantRole;
      const tenantCompanyId = nextUser?.tenantCompanyId || response?.data?.user?.tenantCompanyId;
      const tenantCompanyName = nextUser?.tenantCompanyName || response?.data?.user?.tenantCompanyName;
      if (tenantRole) {
        setStoredTenantRole(tenantRole);
        try {
          if (tenantCompanyId) localStorage.setItem("hostpanel_tenant_company_id", tenantCompanyId);
          if (tenantCompanyName) localStorage.setItem("hostpanel_tenant_company_name", tenantCompanyName);
        } catch { /* noop */ }
      }

      const multiWorkspaceAccess =
        Array.isArray(nextUser?.accessibleWorkspaces) &&
        nextUser.accessibleWorkspaces.length > 1;
      if (shouldGoToCreateWorkspace(response?.data?.user)) {
        navigate("/create-workspace", { replace: true });
      } else if (tenantRole) {
        navigate("/dashboard/tenant", { replace: true });
      } else if (multiWorkspaceAccess) {
        navigate("/select-workspace", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      toast.error(error.response?.data.message);
    } finally {
      setLoading(false);
    }
  };
  const navItems = [
    { label: "Modules", link: "https://wono.co/modules" },
    { label: "Themes", link: "https://wono.co/themes" },
    { label: "Leads", link: "https://wono.co/leads" },
    { label: "Capital", link: "https://wono.co/capital" },
    { label: "Career", link: "https://wono.co/career" },
  ];

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

            {/* Mobile Menu Button */}
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
          <button type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close drawer"
            title="Close drawer"
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
      <div className="login-section loginTopPadding loginBottomPadding poppinsRegular heightPadding">
        <h1 className="text-center text-4xl font-bold">SIGN IN</h1>
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
                onSubmit={handleLogin}
                noValidate
                autoComplete="off"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Grid item xs={12}>
                    <TextField
                      label="Email"
                      variant="standard"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      fullWidth
                    />
                  </Grid>

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
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              title={showPassword ? "Hide password" : "Show password"}
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
                </div>

                <div className="mt-2 col-span-2 text-end">
                  <Link
                    // to="https://wono.co/forgot-password"
                    to="/forgot-password"
                    className="hover:underline text-black"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="flex">
                  <div className="flex flex-col justify-center w-full items-center gap-4 mt-4">
                    <Grid item xs={12}>
                      <div className="centerInPhone">
                        <button
                          disabled={loading}
                          onClick={handleLogin}
                          type="submit"
                          className="loginButtonStyling text-decoration-none text-subtitle w-40"
                        >
                          {loading ? (
                            <CircularProgress size={20} color="white" />
                          ) : (
                            "SIGN IN"
                          )}
                        </button>
                        {/* <button
                          disabled={loading}
                          type="button"
                          className="loginButtonStyling text-decoration-none text-subtitle w-40"
                          onClick={() => navigate("/company-settings")}>
                          SIGN IN
                        </button> */}
                      </div>
                    </Grid>
                    <p className="text-[0.9rem]">
                      Don't have an account?{" "}
                      <span
                        onClick={() =>
                          (window.location.href =
                            "https://host.wono.co/signup")
                        }
                        className="underline hover:text-primary cursor-pointer"
                      >
                        Sign Up
                      </span>
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

export default LoginPage;

