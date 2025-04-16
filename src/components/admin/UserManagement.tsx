import { useState, useEffect } from "react";
import { supabase } from "../../../supabase/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, MoreHorizontal, Search, UserMinus, ShieldAlert, Edit, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

// User interface for the admin panel
interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
  phone?: string;
  listed_properties?: {
    id: string;
    title: string;
    listed_at: string;
    views_count: number;
    verification_status: number;
  }[];
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  const { toast } = useToast();
  const [showDeletePropertyDialog, setShowDeletePropertyDialog] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<{ id: string; title: string } | null>(null);

  // Fetch users with their listed properties
  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log("Fetching users from database...");
      
      const { data, error } = await supabase
        .from("users")
        .select(`
          id,
          email,
          full_name,
          created_at,
          updated_at,
          phone,
          properties!properties_user_id_fkey (
            id,
            title,
            created_at,
            views_count,
            verification_status
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
        throw error;
      }

      // Transform the data to match our interface
      const transformedData = data.map(user => ({
        ...user,
        listed_properties: user.properties?.map(prop => ({
          id: prop.id,
          title: prop.title,
          listed_at: prop.created_at,
          views_count: prop.views_count,
          verification_status: prop.verification_status
        })) || []
      }));

      console.log("Users fetched successfully:", transformedData);
      setUsers(transformedData as User[]);
    } catch (error) {
      console.error("Error in fetchUsers:", error);
      toast({
        title: "Error fetching users",
        description: "Could not load user data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginate users
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      // Delete user's saved properties first
      const { error: savedPropsError } = await supabase
        .from("saved_properties")
        .delete()
        .eq("user_id", selectedUser.id);

      if (savedPropsError) throw savedPropsError;

      // Delete user profile
      const { error: profileError } = await supabase
        .from("users")
        .delete()
        .eq("id", selectedUser.id);

      if (profileError) throw profileError;

      // Update local state
      setUsers(users.filter((user) => user.id !== selectedUser.id));
      setShowDeleteDialog(false);
      setSelectedUser(null);

      toast({
        title: "User deleted",
        description: "The user has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error deleting user",
        description: "There was an error deleting the user. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle property deletion
  const handleDeleteProperty = async () => {
    if (!selectedProperty) return;

    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", selectedProperty.id);

      if (error) throw error;

      // Refresh the users list to update the properties
      await fetchUsers();

      toast({
        title: "Property deleted",
        description: "The property has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting property:", error);
      toast({
        title: "Error deleting property",
        description: "There was an error deleting the property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowDeletePropertyDialog(false);
      setSelectedProperty(null);
    }
  };

  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
        
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2">Loading users...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No users found in the database.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Listed Properties</TableHead>
                  <TableHead>Total Views</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || "N/A"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || "N/A"}</TableCell>
                    <TableCell>
                      {user.listed_properties?.length ? (
                        <div className="space-y-2">
                          {user.listed_properties.map(prop => (
                            <div key={prop.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{prop.title}</span>
                                <span className="text-gray-500 text-sm">({formatDate(prop.listed_at)})</span>
                                <Badge 
                                  variant={prop.verification_status === 1 ? "default" : "destructive"}
                                  className="ml-2"
                                >
                                  {prop.verification_status === 1 ? "Verified" : "Not Verified"}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    window.location.href = `/admin/properties/${prop.id}/edit`;
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setSelectedProperty({ id: prop.id, title: prop.title });
                                    setShowDeletePropertyDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        "No properties listed"
                      )}
                    </TableCell>
                    <TableCell>
                      {user.listed_properties?.reduce((sum, prop) => sum + prop.views_count, 0) || 0}
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600"
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.full_name || selectedUser?.email}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Property Dialog */}
      <AlertDialog open={showDeletePropertyDialog} onOpenChange={setShowDeletePropertyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the property "{selectedProperty?.title}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProperty} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement; 