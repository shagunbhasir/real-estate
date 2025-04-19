import { supabase } from "../../../supabase/supabase";

// Define the User interface
export interface User {
  id: string;
  email?: string;
  full_name?: string;
  created_at?: string;
  updated_at?: string;
  phone?: string;
}

// Define the Admin interface
export interface Admin {
  id: string;
  email: string;
  name: string;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetches all users from the database
 * This function attempts different approaches to get all users
 */
export const fetchAllUsers = async (): Promise<User[]> => {
  console.log("AdminService: Attempting to fetch all users...");

  try {
    // Method 1: Try standard query with specific columns
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, created_at, updated_at, phone')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error("Standard user query failed:", usersError);

      // Method 2: Try with minimal fields
      const { data: minimalData, error: minimalError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .order('created_at', { ascending: false });

      if (minimalError) {
        console.error("Minimal user query failed:", minimalError);
        throw new Error(`Could not fetch users: ${minimalError.message}`);
      }

      console.log(`AdminService: Fetched ${minimalData?.length || 0} users with minimal fields`);

      // Format minimal data to match User interface
      return (minimalData || []).map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name || '',
        created_at: new Date().toISOString(), // Default value since we don't have this field
      }));
    }

    console.log(`AdminService: Fetched ${usersData?.length || 0} users`);

    // Format complete data to match User interface
    return (usersData || []).map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name || '',
      created_at: user.created_at,
      updated_at: user.updated_at,
      phone: user.phone
    }));

  } catch (error) {
    console.error("Error in fetchAllUsers:", error);
    throw error;
  }
};

/**
 * Gets the RLS policies for the users table
 * This helps debug permission issues
 */
export const checkTablePolicies = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_table_access');

    if (error) {
      console.error("Error checking table access:", error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error("Error in checkTablePolicies:", error);
    return false;
  }
};

// Admin Authentication Functions

// Login as admin using the secure RPC function
export const adminLogin = async (email: string, password: string): Promise<Admin | null> => {
  try {
    console.log('Attempting admin login via RPC with email:', email);

    // Call the secure database function to verify credentials
    const { data: adminData, error } = await supabase.rpc('get_admin_by_credentials', {
      admin_email: email,
      admin_password: password,
    });

    if (error) {
      console.error('Admin login RPC error:', error);
      // Handle specific errors if needed, e.g., invalid credentials vs. server error
      if (error.message.includes('Invalid credentials')) { // Example check
        console.log('Invalid credentials provided.');
        return null;
      }
      throw error; // Re-throw other errors
    }

    // The RPC returns an array. If login is successful, it contains one admin object.
    // If unsuccessful (wrong email/password), it returns an empty array.
    if (!adminData || adminData.length === 0) {
      console.log('No admin found with these credentials or login failed.');
      return null;
    }

    // Extract the admin object from the array
    const admin = adminData[0] as Admin; // Assuming the RPC returns fields matching the Admin interface

    console.log('Admin login successful for:', admin.email);

    // Set admin session in localStorage
    localStorage.setItem('adminId', admin.id);
    localStorage.setItem('adminEmail', admin.email);
    // Consider adding name to localStorage if needed frequently
    // localStorage.setItem('adminName', admin.name);
    localStorage.setItem('adminExpiry', (Date.now() + 8 * 60 * 60 * 1000).toString()); // 8 hours expiry

    // Return the admin object which now includes id, email, name from the RPC
    return admin;
  } catch (error) {
    console.error('Admin login error:', error);
    throw error;
  }
};

// Get current admin from localStorage
export const getCurrentAdmin = async (): Promise<Admin | null> => {
  try {
    const adminId = localStorage.getItem('adminId');
    const adminExpiry = localStorage.getItem('adminExpiry');

    // Check if admin session is expired
    if (!adminId || !adminExpiry || Date.now() > parseInt(adminExpiry)) {
      // Clear expired session
      logoutAdmin();
      return null;
    }

    // Verify admin still exists in database
    const { data, error } = await supabase
      .from('admins')
      .select('id, email, name, last_login, created_at, updated_at')
      .eq('id', adminId)
      .single();

    if (error || !data) {
      console.error("Error fetching admin data:", error);
      logoutAdmin();
      return null;
    }

    return data as Admin;
  } catch (error) {
    console.error("Error in getCurrentAdmin:", error);
    logoutAdmin();
    return null;
  }
};

// Logout admin
export const logoutAdmin = (): void => {
  localStorage.removeItem('adminId');
  localStorage.removeItem('adminEmail');
  localStorage.removeItem('adminExpiry');

  // Also remove legacy items
  localStorage.removeItem('isAdmin');
  localStorage.removeItem('adminExpiry');
};

// Check if user is admin
export const isAdmin = (): boolean => {
  const adminId = localStorage.getItem('adminId');
  const adminExpiry = localStorage.getItem('adminExpiry');

  // Also check legacy admin session
  const legacyIsAdmin = localStorage.getItem('isAdmin');
  const legacyAdminExpiry = localStorage.getItem('adminExpiry');

  // Check current format first
  if (adminId && adminExpiry && Date.now() < parseInt(adminExpiry)) {
    return true;
  }

  // Check legacy format as fallback
  if (legacyIsAdmin === 'true' && legacyAdminExpiry && Date.now() < parseInt(legacyAdminExpiry)) {
    return true;
  }

  return false;
};

// Get all admins
export const fetchAllAdmins = async (): Promise<Admin[]> => {
  try {
    if (!isAdmin()) {
      return [];
    }

    const { data, error } = await supabase
      .from('admins')
      .select('id, email, name, last_login, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching admins:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchAllAdmins:", error);
    return [];
  }
};
