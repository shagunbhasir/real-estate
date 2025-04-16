import React, { useState, useEffect } from "react";
import Sidebar from "../layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Filter, Home as HomeIcon, MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "../../../supabase/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";

// Define property type based on Supabase schema
interface Property {
  id: string;
  title: string;
  description?: string;
  address?: string;
  price: number;
  type?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  imageUrl?: string;
  user_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

const PropertyManagement = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        // Transform data to ensure it fits our component's needs
        const formattedProperties = data.map(property => ({
          ...property,
          // Default values or transformations
          status: property.status || 'Available',
          // Format price as currency if needed
          price: property.price
        }));
        setProperties(formattedProperties);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: "Error fetching properties",
        description: "Could not load property data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter properties based on search term
  const filteredProperties = properties.filter(property => 
    property.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Format price to currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <div className="flex h-[calc(100vh-64px)]">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Property Management</h1>
            <p className="mt-1 text-gray-500">Manage all properties in your portfolio</p>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -mt-2 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search properties..." 
                className="pl-10 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={fetchProperties}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
                {loading ? "Loading..." : "Refresh"}
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2" asChild>
                <Link to="/list-property">
                  <PlusCircle className="h-4 w-4" />
                  Add Property
                </Link>
              </Button>
            </div>
          </div>

          <Card className="bg-white/70 backdrop-blur-sm border border-gray-200 shadow-sm rounded-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Property List</CardTitle>
              <CardDescription>
                {loading ? "Loading properties..." : `Showing ${filteredProperties.length} properties`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? "No properties match your search" : "No properties found"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Property</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Location</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Price</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.map((property) => (
                        <tr key={property.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-md bg-blue-100 flex items-center justify-center mr-3 overflow-hidden">
                                {property.imageUrl ? (
                                  <img src={property.imageUrl} alt={property.title} className="h-full w-full object-cover" />
                                ) : (
                                  <HomeIcon className="h-5 w-5 text-blue-600" />
                                )}
                              </div>
                              <span className="font-medium text-gray-800">{property.title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center text-gray-600">
                              <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                              {property.address || 'No address provided'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-800">
                            {formatPrice(property.price)}
                            {property.type === 'rent' && '/month'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="bg-gray-50 capitalize">
                              {property.type || 'Unknown'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge 
                              className={`${
                                property.status === "Available" ? "bg-green-100 text-green-800 hover:bg-green-100" : 
                                property.status === "Rented" || property.status === "Sold" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : 
                                "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                              }`}
                            >
                              {property.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600" asChild>
                              <Link to={`/property/${property.id}`}>
                                View
                              </Link>
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

export default PropertyManagement; 