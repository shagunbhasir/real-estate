import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../../supabase/adminAuth";
import { LoadingScreen } from "../ui/loading-spinner";

interface AdminAuthProps {
  children: ReactNode;
}

const AdminAuth = ({ children }: AdminAuthProps) => {
  const { admin, loading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If loading is finished and there's no admin, redirect to login
    if (!loading && !admin) {
      navigate("/admin/login");
    }
  }, [admin, loading, navigate]);

  // Show loading screen while checking auth status
  if (loading) {
    return <LoadingScreen text="Authenticating admin..." />;
  }

  // If admin is authenticated, render the protected children components
  if (admin) {
    return <>{children}</>;
  }

  // If not loading and no admin, return null (or redirect handled by useEffect)
  // Returning null prevents rendering children briefly before redirect
  return null;
};

export default AdminAuth; 