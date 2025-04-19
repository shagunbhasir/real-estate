import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
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

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined
);

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

  const adminSignUp = async (email: string, password: string) => {
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

  // Simplified adminSignIn using verify_password RPC + separate fetch
  const adminSignIn = async (email: string, password: string) => {
    console.log("Attempting admin sign in for email:", email);
    try {
      // Step 1: Verify credentials using verify_password RPC
      console.log("Calling Supabase RPC: verify_password");
      const { data: verifiedAdminId, error: verifyError } = await supabase.rpc(
        "verify_password",
        {
          p_email: email,
          p_password: password,
        }
      );

      console.log(
        "verify_password RPC response - verifiedAdminId:",
        verifiedAdminId
      );
      console.log("verify_password RPC response - error:", verifyError);

      if (verifyError) {
        console.error(
          "Supabase RPC error during password verification:",
          verifyError
        );
        throw verifyError; // Re-throw the original Supabase error
      }

      // verify_password returns UUID on success, null on failure
      if (!verifiedAdminId) {
        console.warn(
          "Admin credentials invalid (verify_password returned null)."
        );
        throw new Error("Invalid credentials");
      }

      console.log("Password verified. Admin ID:", verifiedAdminId);

      // Step 2: Fetch full admin details using the verified ID
      console.log(
        "Fetching admin details from 'admins' table for ID:",
        verifiedAdminId
      );
      const { data: adminDetails, error: fetchError } = await supabase
        .from("admins")
        .select("id, email, name, created_at, last_login") // Select desired fields
        .eq("id", verifiedAdminId)
        .single(); // Expecting only one row

      console.log("Fetch admin details response - adminDetails:", adminDetails);
      console.log("Fetch admin details response - error:", fetchError);

      if (fetchError) {
        console.error(
          "Error fetching admin details after verification:",
          fetchError
        );
        throw new Error("Could not fetch admin details after login.");
      }

      if (!adminDetails) {
        console.error(
          "Admin details not found for verified ID:",
          verifiedAdminId
        );
        throw new Error("Admin record not found after verification.");
      }

      console.log("Successfully fetched admin details:", adminDetails);

      // Step 3: Store session (verify_password already updated last_login)
      const sessionExpiry = new Date();
      sessionExpiry.setHours(sessionExpiry.getHours() + 24); // 24-hour expiry
      console.log("Setting session expiry:", sessionExpiry.toISOString());

      localStorage.setItem("admin", JSON.stringify(adminDetails)); // Store the fetched object
      localStorage.setItem("adminSessionExpiry", sessionExpiry.toISOString());
      setAdmin(adminDetails as Admin); // Set state with the fetched object (cast if needed)
      console.log("Admin session stored in local storage and state updated.");
    } catch (error) {
      console.error("Error during simplified admin sign in process:", error);
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
