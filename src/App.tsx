import { Suspense } from "react";
import { Navigate, Route, Routes, useRoutes } from "react-router-dom";
import routes from "tempo-routes";
import LoginForm from "./components/auth/LoginForm";
import SignUpForm from "./components/auth/SignUpForm";
import Success from "./components/pages/success";
import Home from "./components/pages/home";
import PropertyListing from "./components/properties/PropertyListing";
import PropertyForm from "./components/properties/PropertyForm";
import PropertyFormEditor from "./components/properties/PropertyFormEditor";
import PropertyDetail from "./components/properties/PropertyDetail";
import UserManagement from "./components/pages/UserManagement";
import PropertyManagement from "./components/pages/PropertyManagement";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminLoginPage from "./components/admin/AdminLoginPage";
import AdminSignUpPage from "./components/admin/AdminSignUpPage";
import { AuthProvider, useAuth } from "../supabase/auth";
import { AdminAuthProvider, useAdminAuth } from "../supabase/adminAuth";
import { Toaster } from "./components/ui/toaster";
import { LoadingScreen } from "./components/ui/loading-spinner";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen text="Authenticating..." />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return <LoadingScreen text="Authenticating admin..." />;
  }

  if (!admin) {
    return <Navigate to="/admin/login" />;
  }

  return <>{children}</>;
}



function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/signup" element={<SignUpForm />} />
        <Route
          path="/user-management"
          element={
            <PrivateRoute>
              <UserManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/property-management"
          element={
            <PrivateRoute>
              <PropertyManagement />
            </PrivateRoute>
          }
        />
        <Route path="/success" element={<Success />} />
        <Route path="/browse-properties" element={<PropertyListing />} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route
          path="/list-property"
          element={
            <PrivateRoute>
              <PropertyForm />
            </PrivateRoute>
          }
        />
        
        {/* Property Edit Route */}
        <Route
          path="/property/edit/:propertyId"
          element={
            <PrivateRoute>
              <PropertyFormEditor />
            </PrivateRoute>
          }
        />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/signup" element={<AdminSignUpPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
      </Routes>
      {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <Suspense fallback={<LoadingScreen text="Loading application..." />}>
          <AppRoutes />
        </Suspense>
        <Toaster />
      </AdminAuthProvider>
    </AuthProvider>
  );
}

export default App;
