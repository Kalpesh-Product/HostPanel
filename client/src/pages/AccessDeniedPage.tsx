import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AccessDeniedPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(-1);
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">403</h1>
        <p className="text-xl text-gray-600 mb-2">Access Denied</p>
        <p className="text-gray-500">This module isn't included in your plan. Redirecting you back...</p>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
