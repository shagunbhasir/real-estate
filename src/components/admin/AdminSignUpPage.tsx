import React from 'react';
import AdminSignUpForm from './AdminSignUpForm';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../../supabase/adminAuth';

const AdminSignUpPage: React.FC = () => {
  const { admin } = useAdminAuth();
  
  // Only allow super admins to access this page
  if (!admin || admin.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h1 className="text-center text-3xl font-extrabold text-gray-900">
            Access Denied
          </h1>
          <h2 className="mt-2 text-center text-xl text-gray-600">
            Only super admins can create new admin accounts
          </h2>
          <div className="mt-6 text-center">
            <Link to="/admin/login" className="font-medium text-blue-600 hover:text-blue-500">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-gray-900">
          Create Admin Account
        </h1>
        <h2 className="mt-2 text-center text-xl text-gray-600">
          Add a new admin to the system
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <AdminSignUpForm />
        
        <div className="mt-6 text-center">
          <Link to="/admin/dashboard" className="font-medium text-blue-600 hover:text-blue-500">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminSignUpPage; 