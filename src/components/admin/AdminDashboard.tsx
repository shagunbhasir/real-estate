import { useState, useEffect } from "react";
import { supabase } from "../../../supabase/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Users, Building, Bookmark, LogOut, BarChart3, Lock, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import UserManagement from "./UserManagement";
import PropertyManagement from "./PropertyManagement";
import SavedPropertiesAdmin from "./SavedPropertiesAdmin";
import AdminManagement from "./AdminManagement";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "../../../supabase/adminAuth";

// Stats interface for dashboard metrics
interface DashboardStats {
  totalUsers: number;
  totalProperties: number;
  totalSavedProperties: number;
  recentPropertiesAdded: number;
  recentUsers: number;
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProperties: 0,
    totalSavedProperties: 0,
    recentPropertiesAdded: 0,
    recentUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { admin, adminSignOut } = useAdminAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Get user count
        const { count: userCount, error: userError } = await supabase
          .from("users")
          .select("id", { count: "exact", head: true });
          
        // Get property count
        const { count: propertyCount, error: propertyError } = await supabase
          .from("properties")
          .select("id", { count: "exact", head: true });
          
        // Get saved property count
        const { count: savedPropertyCount, error: savedPropertyError } = await supabase
          .from("saved_properties")
          .select("id", { count: "exact", head: true });
          
        // Get recent properties count (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count: recentPropertyCount, error: recentPropertyError } = await supabase
          .from("properties")
          .select("id", { count: "exact", head: true })
          .gte("created_at", thirtyDaysAgo.toISOString());
          
        // Get recent users count (last 30 days)
        const { count: recentUserCount, error: recentUserError } = await supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .gte("created_at", thirtyDaysAgo.toISOString());
          
        if (userError || propertyError || recentPropertyError || recentUserError || savedPropertyError) {
          throw new Error("Error fetching dashboard stats");
        }
        
        setStats({
          totalUsers: userCount || 0,
          totalProperties: propertyCount || 0,
          totalSavedProperties: savedPropertyCount || 0,
          recentPropertiesAdded: recentPropertyCount || 0,
          recentUsers: recentUserCount || 0,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        toast({
          title: "Error",
          description: "Failed to load dashboard statistics",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (activeTab === "dashboard") {
      fetchStats();
    }
  }, [activeTab, toast]);
  
  // Handle admin logout
  const handleLogout = async () => {
    try {
      await adminSignOut();
      
      toast({
        title: "Logged out",
        description: "You have been logged out of the admin dashboard",
      });
      
      navigate('/admin/login');
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  if (!admin) {
    return null; // This should not happen due to the AdminRoute wrapper
  }
  
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600">Welcome, {admin.name}</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-1"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
        
        <Tabs onValueChange={setActiveTab} value={activeTab} className="w-full">
          <TabsList className="w-full flex justify-start mb-8 bg-white border rounded-md overflow-x-auto">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 py-3 px-4 flex-shrink-0">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 py-3 px-4 flex-shrink-0">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-2 py-3 px-4 flex-shrink-0">
              <Building className="h-4 w-4" />
              Properties
            </TabsTrigger>
            <TabsTrigger value="savedproperties" className="flex items-center gap-2 py-3 px-4 flex-shrink-0">
              <Bookmark className="h-4 w-4" />
              Saved Properties
            </TabsTrigger>
            (
              <TabsTrigger value="admins" className="flex items-center gap-2 py-3 px-4 flex-shrink-0">
                <Lock className="h-4 w-4" />
                Admin Access
              </TabsTrigger>
            )
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <div className="text-3xl font-bold">
                      {loading ? "..." : stats.totalUsers}
                    </div>
                    <div className={`text-sm font-medium ${stats.recentUsers > 0 ? "text-green-600" : "text-gray-500"}`}>
                      {loading ? "..." : `+${stats.recentUsers} in 30 days`}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Total Properties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <div className="text-3xl font-bold">
                      {loading ? "..." : stats.totalProperties}
                    </div>
                    <div className={`text-sm font-medium ${stats.recentPropertiesAdded > 0 ? "text-green-600" : "text-gray-500"}`}>
                      {loading ? "..." : `+${stats.recentPropertiesAdded} in 30 days`}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Saved Properties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {loading ? "..." : stats.totalSavedProperties}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Admin Dashboard Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-600">
                  <p>Welcome to the admin dashboard. From here you can:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Manage user accounts and permissions</li>
                    <li>Add, edit, or remove property listings</li>
                    <li>View and manage saved properties</li>
                    {admin.role === 'super_admin' && (
                      <li>Manage admin access and permissions</li>
                    )}
                    <li>View system statistics and performance</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            
          </TabsContent>
          
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
          
          <TabsContent value="properties">
            <PropertyManagement />
          </TabsContent>
          
          <TabsContent value="savedproperties">
            <SavedPropertiesAdmin />
          </TabsContent>
          
          (
            <TabsContent value="admins">
              <AdminManagement />
            </TabsContent>
          )
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;