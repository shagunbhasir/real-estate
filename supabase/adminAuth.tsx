import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "./supabase";

interface Admin {
  id: string;
  email: string;
  created_at: string;
  last_login: string | null;
}

interface AdminAuthContextType {
  admin: Admin | null;
  loading: boolean;
  adminSignUp: (email: string, password: string) => Promise<void>;
  adminSignIn: (email: string, password: string) => Promise<void>;
  adminSignOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing admin session
    const checkAdminSession = async () => {
      try {
        const adminData = localStorage.getItem("admin");
        if (adminData) {
          const parsedAdmin = JSON.parse(adminData);
          const sessionExpiry = localStorage.getItem("adminSessionExpiry");
          
          if (sessionExpiry && new Date(sessionExpiry) > new Date()) {
            // Verify admin still exists in database
            const { data, error } = await supabase
              .from("admins")
              .select("*")
              .eq("id", parsedAdmin.id)
              .single();
              
            if (error || !data) {
              // Admin no longer exists or error occurred
              localStorage.removeItem("admin");
              localStorage.removeItem("adminSessionExpiry");
              setAdmin(null);
            } else {
              setAdmin(data);
            }
          } else {
            // Session expired
            localStorage.removeItem("admin");
            localStorage.removeItem("adminSessionExpiry");
            setAdmin(null);
          }
        }
      } catch (error) {
        console.error("Error checking admin session:", error);
        localStorage.removeItem("admin");
        localStorage.removeItem("adminSessionExpiry");
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    };

    checkAdminSession();
  }, []);

  const adminSignUp = async (
    email: string,
    password: string
  ) => {
    try {
      const { data, error } = await supabase.rpc("create_admin", {
        admin_email: email,
        admin_password: password,
 
      });

      if (error) throw error;

      // Automatically sign in after successful signup
      await adminSignIn(email, password);
    } catch (error) {
      console.error("Error signing up admin:", error);
      throw error;
    }
  };

  const adminSignIn = async (email: string, password: string) => {
    console.log("Attempting admin sign in for email:", email);
    try {
      console.log("Calling Supabase RPC: get_admin_by_credentials");
      const { data, error } = await supabase.rpc("get_admin_by_credentials", {
        admin_email: email,
        admin_password: password,
      });

      console.log("RPC response - data:", data);
      console.log("RPC response - error:", error);

      if (error) {
        console.error("Supabase RPC error during sign in:", error);
        throw error; // Re-throw the original Supabase error
      }

      if (data) {
        console.log("Admin credentials verified. Admin data:", data);
        // Update last login time
        try {
          console.log("Updating last login time for admin ID:", data.id);
          await supabase
            .from("admins")
            .update({ last_login: new Date().toISOString() })
            .eq("id", data.id);
          console.log("Last login time updated successfully.");
        } catch (updateError) {
          console.error("Failed to update last login time:", updateError);
          // Continue with login even if last login update fails
        }

        // Set session expiry to 24 hours from now
        const sessionExpiry = new Date();
        sessionExpiry.setHours(sessionExpiry.getHours() + 24);
        console.log("Setting session expiry:", sessionExpiry.toISOString());

        // Store admin data and session expiry
        localStorage.setItem("admin", JSON.stringify(data));
        localStorage.setItem("adminSessionExpiry", sessionExpiry.toISOString());
        setAdmin(data);
        console.log("Admin session stored in local storage and state updated.");
      } else {
        console.warn("Admin credentials invalid or no admin found.");
        throw new Error("Invalid credentials or admin not found");
      }
    } catch (error) {
      console.error("Error during admin sign in process:", error);
      // Ensure admin state is null if sign-in fails
      setAdmin(null);
      localStorage.removeItem("admin");
      localStorage.removeItem("adminSessionExpiry");
      throw error; // Re-throw the error to be caught by the calling component
    }
  };

  const adminSignOut = async () => {
    try {
      localStorage.removeItem("admin");
      localStorage.removeItem("adminSessionExpiry");
      setAdmin(null);
    } catch (error) {
      console.error("Error signing out admin:", error);
      throw error;
    }
  };

  const value = {
    admin,
    loading,
    adminSignUp,
    adminSignIn,
    adminSignOut,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}