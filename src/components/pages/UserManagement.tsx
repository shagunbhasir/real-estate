import React, { useState, useEffect } from "react";
import Sidebar from "../layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Filter, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "../../../supabase/supabase";
import { useToast } from "@/components/ui/use-toast";
import { fetchAllUsers, checkTablePolicies } from "../admin/AdminService";

// Define user type based on Supabase schema
interface User {
  id: string;
  email?: string;
  full_name?: string;
  name?: string;
  role?: string;
  status?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
  phone?: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log("Fetching all users from database...");
      
      // First, check table access
      const policyCheck = await checkTablePolicies();
      console.log("Table access check:", policyCheck);
      
      // Try to fetch users using the admin service
      const userData = await fetchAllUsers();
      console.log("Fetched users from service:", userData?.length || 0);
      
      if (userData && userData.length > 0) {
        // Transform data to ensure it fits our component's needs
        const formattedUsers = userData.map(user => ({
          id: user.id,
          email: user.email,
          full_name: user.full_name || '',
          role: user.role || 'User',
          status: user.status || 'Active',
          avatar_url: user.avatar_url,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: user.updated_at,
          phone: user.phone
        } as User));
        
        console.log("Formatted users:", formattedUsers.length);
        setUsers(formattedUsers);
      } else {
        console.log("No users data returned");
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error fetching users",
        description: "Could not load user data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <div className="flex h-[calc(100vh-64px)]">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-gray-500">Manage all users and their permissions</p>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -mt-2 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search users..." 
                className="pl-10 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={fetchUsers}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
                {loading ? "Loading..." : "Refresh"}
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Add User
              </Button>
            </div>
          </div>

          <Card className="bg-white/70 backdrop-blur-sm border border-gray-200 shadow-sm rounded-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">User List</CardTitle>
              <CardDescription>
                {loading ? "Loading users..." : `Showing ${filteredUsers.length} users`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? "No users match your search" : "No users found"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8 mr-3">
                                {user.avatar_url ? (
                                  <AvatarImage src={user.avatar_url} />
                                ) : (
                                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}`} />
                                )}
                                <AvatarFallback>{(user.full_name || '').substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-gray-800">{user.full_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{user.email}</td>
                          <td className="py-3 px-4">
                            <Badge variant={user.role === "Admin" ? "default" : user.role === "Agent" ? "outline" : "secondary"}>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge 
                              className={`${
                                user.status === "Active" ? "bg-green-100 text-green-800 hover:bg-green-100" : 
                                user.status === "Inactive" ? "bg-gray-100 text-gray-800 hover:bg-gray-100" : 
                                "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                              }`}
                            >
                              {user.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600">
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default UserManagement; 