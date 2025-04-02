import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state (signed in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          name: fullName.split(" ")[0], // Add first name as name
        },
      },
    });

    if (error) throw error;

    // Ensure user data is properly created in the public.users table
    if (data.user) {
      const { error: profileError } = await supabase.from("users").upsert({
        id: data.user.id,
        user_id: data.user.id,
        email: email,
        full_name: fullName,
        name: fullName.split(" ")[0],
        token_identifier: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profileError)
        console.error("Error creating user profile:", profileError);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Sign in error:", error);
      throw error;
    }

    // Verify user exists in the public.users table
    if (data.user) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", data.user.id)
        .single();

      if (userError && userError.code !== "PGRST116") {
        // If user doesn't exist in public.users table, create it
        const { error: createError } = await supabase.from("users").upsert({
          id: data.user.id,
          user_id: data.user.id,
          email: email,
          token_identifier: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (createError)
          console.error(
            "Error creating user profile during sign in:",
            createError,
          );
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
