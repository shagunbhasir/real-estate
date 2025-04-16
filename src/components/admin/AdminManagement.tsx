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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Edit, Trash2, X, Check, Search, UserPlus, Edit2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fetchAllAdmins, Admin, getCurrentAdmin } from "./AdminService";
import { useAdminAuth } from "../../../supabase/adminAuth";

const AdminManagement = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [filterTerm, setFilterTerm] = useState("");
  const [formData, setFormData] = useState({
    id: "",
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
    status: "active",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const { toast } = useToast();
  const { admin: currentAdminAuth } = useAdminAuth();

  // Fetch admins from supabase
  useEffect(() => {
    const getAdmins = async () => {
      try {
        setLoading(true);
        
        // First get the current admin's role to determine permissions
        const admin = await getCurrentAdmin();
        setCurrentAdmin(admin);
        
        // Fetch all admins
        const adminsData = await fetchAllAdmins();
        setAdmins(adminsData);
      } catch (error) {
        console.error("Error fetching admins:", error);
        toast({
          title: "Error",
          description: "Failed to load admin accounts",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    getAdmins();
  }, [toast]);

  // Filter admins based on search term
  const filteredAdmins = admins.filter(admin => 
    admin.email.toLowerCase().includes(filterTerm.toLowerCase()) ||
    admin.name.toLowerCase().includes(filterTerm.toLowerCase()) ||
    admin.role.toLowerCase().includes(filterTerm.toLowerCase()) ||
    admin.status.toLowerCase().includes(filterTerm.toLowerCase())
  );

  // Reset form data
  const resetForm = () => {
    setFormData({
      id: "",
      email: "",
      name: "",
      password: "",
      confirmPassword: "",
      status: "active",
    });
    setFormErrors({});
  };

  // Open edit dialog with admin data
  const handleEditClick = (admin: Admin) => {
    setFormData({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      password: "",
      confirmPassword: "",
      status: admin.status,
    });
    setSelectedAdmin(admin);
    setShowEditDialog(true);
  };

  // Open delete dialog
  const handleDeleteClick = (admin: Admin) => {
    setSelectedAdmin(admin);
    setShowDeleteDialog(true);
  };

  // Validate form data
  const validateForm = (isEditMode = false): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Please enter a valid email";
    }
    
    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }
    
    if (!isEditMode) {
      if (!formData.password) {
        errors.password = "Password is required";
      } else if (formData.password.length < 8) {
        errors.password = "Password must be at least 8 characters";
      }
      
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    } else if (formData.password) {
      if (formData.password.length < 8) {
        errors.password = "Password must be at least 8 characters";
      }
      
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle add admin submission
  const handleAddSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      // Call RPC function to create new admin (which will hash the password)
      const { data, error } = await supabase.rpc('create_admin', {
        admin_email: formData.email,
        admin_name: formData.name,
        admin_password: formData.password,
      });
      
      if (error) throw error;
      
      // Refresh admin list
      const adminsData = await fetchAllAdmins();
      setAdmins(adminsData);
      
      toast({
        title: "Admin created",
        description: `Admin account for ${formData.name} has been created`,
      });
      
      resetForm();
      setShowAddDialog(false);
    } catch (error) {
      console.error("Error creating admin:", error);
      toast({
        title: "Error",
        description: "Failed to create admin account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle edit admin submission
  const handleEditSubmit = async () => {
    if (!validateForm(true)) return;
    
    try {
      setLoading(true);
      
      const updateData: any = {
        name: formData.name,

        updated_at: new Date().toISOString()
      };
      
      // If password was provided, update it using the hash_password function
      if (formData.password) {
        // Use the RPC function to update admin with password
        const { error } = await supabase.rpc('update_admin_with_password', {
          admin_id: formData.id,
          admin_name: formData.name,
          admin_password: formData.password,

        });
        
        if (error) throw error;
      } else {
        // Update without changing password
        const { error } = await supabase
          .from('admins')
          .update(updateData)
          .eq('id', formData.id);
        
        if (error) throw error;
      }
      
      // Refresh admin list
      const adminsData = await fetchAllAdmins();
      setAdmins(adminsData);
      
      toast({
        title: "Admin updated",
        description: `Admin account for ${formData.name} has been updated`,
      });
      
      resetForm();
      setShowEditDialog(false);
    } catch (error) {
      console.error("Error updating admin:", error);
      toast({
        title: "Error",
        description: "Failed to update admin account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle delete admin
  const handleDeleteConfirm = async () => {
    if (!selectedAdmin) return;
    
    try {
      setLoading(true);
      
      // Cannot delete yourself
      if (currentAdminAuth?.id === selectedAdmin.id) {
        throw new Error("You cannot delete your own account");
      }
      
      // Delete the admin
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', selectedAdmin.id);
      
      if (error) throw error;
      
      // Refresh admin list
      const adminsData = await fetchAllAdmins();
      setAdmins(adminsData);
      
      toast({
        title: "Admin deleted",
        description: `Admin account for ${selectedAdmin.name} has been deleted`,
      });
      
      setSelectedAdmin(null);
      setShowDeleteDialog(false);
    } catch (error) {
      let errorMessage = "Failed to delete admin account";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error("Error deleting admin:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Determine if current admin can manage the given admin
  const canManageAdmin = (admin: Admin): boolean => {
    if (!currentAdminAuth) return false;
    
    // Admins can manage all admins except themselves
    return currentAdminAuth.id !== admin.id;
  };

  // Determine if current admin can add new admins
  const canAddAdmin = (): boolean => {
    return true;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Admin Management</h2>

        <div className="flex items-center gap-3">
          {canAddAdmin() && (
            <Button
              onClick={() => {
                resetForm();
                setShowAddDialog(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Admin
            </Button>
          )}
          
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search admins..."
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
              className="pl-8 min-w-[250px]"
            />
          </div>
        </div>
      </div>

      {loading && admins.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2">Loading admins...</span>
        </div>
      ) : admins.length === 0 ? (
        <Card className="bg-white rounded-lg shadow p-8 text-center">
          <CardContent className="pt-6">
            <p className="text-gray-500">No admin accounts found.</p>
            {canAddAdmin() && (
              <Button
                onClick={() => {
                  resetForm();
                  setShowAddDialog(true);
                }}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Admin Account
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdmins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Badge className="bg-blue-600">
                      Admin
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={admin.status === "active" ? "default" : "destructive"}
                      className={
                        admin.status === "active"
                          ? "bg-green-600"
                          : undefined
                      }
                    >
                      {admin.status === "active" ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <X className="h-3 w-3 mr-1" />
                      )}
                      {admin.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {formatDate(admin.last_login)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {canManageAdmin(admin) && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(admin)}
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(admin)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                      {!canManageAdmin(admin) && (
                        <span className="text-xs text-gray-500">No actions available</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Admin Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
            <DialogDescription>
              Create a new admin account with appropriate permissions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="admin@example.com"
                className={formErrors.email ? "border-red-500" : ""}
              />
              {formErrors.email && (
                <p className="text-xs text-red-500">{formErrors.email}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="John Doe"
                className={formErrors.name ? "border-red-500" : ""}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500">{formErrors.name}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="••••••••"
                className={formErrors.password ? "border-red-500" : ""}
              />
              {formErrors.password && (
                <p className="text-xs text-red-500">{formErrors.password}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                placeholder="••••••••"
                className={formErrors.confirmPassword ? "border-red-500" : ""}
              />
              {formErrors.confirmPassword && (
                <p className="text-xs text-red-500">{formErrors.confirmPassword}</p>
              )}
            </div>
            
          
            
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
            <DialogDescription>
              Update the details for this admin account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500">Email address cannot be changed</p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="edit-name" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="edit-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="John Doe"
                className={formErrors.name ? "border-red-500" : ""}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500">{formErrors.name}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="edit-password" className="text-sm font-medium">
                New Password (leave empty to keep current)
              </label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="••••••••"
                className={formErrors.password ? "border-red-500" : ""}
              />
              {formErrors.password && (
                <p className="text-xs text-red-500">{formErrors.password}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="edit-confirmPassword" className="text-sm font-medium">
                Confirm New Password
              </label>
              <Input
                id="edit-confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                placeholder="••••••••"
                className={formErrors.confirmPassword ? "border-red-500" : ""}
                disabled={!formData.password}
              />
              {formErrors.confirmPassword && (
                <p className="text-xs text-red-500">{formErrors.confirmPassword}</p>
              )}
            </div>
            
        
            
            <div className="space-y-2">
              <label htmlFor="edit-status" className="text-sm font-medium">
                Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Admin Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the admin account for{" "}
              <span className="font-semibold">{selectedAdmin?.name}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={loading}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminManagement;