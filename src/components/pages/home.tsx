import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  Home,
  MapPin,
  Search,
  Settings,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../supabase/auth";
import FeaturesSection from "../home/FeaturesSection";
import PropertyCard from "../home/PropertyCard";
import { useState, useEffect } from "react";
import { supabase } from "../../../supabase/supabase";
import LocationSearchWithProperties from "../home/LocationSearchWithProperties";

interface Property {
  id: string;
  title: string;
  address?: string;
  price: number;
  type?: "sale" | "rent";
  beds?: number;
  baths?: number;
  sqft?: number;
  imageUrl?: string;
}

export default function LandingPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProperties();
  }, []);

  const fetchFeaturedProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .limit(3);

      if (error) {
        throw error;
      }

      if (data) {
        setFeaturedProperties(data);
      }
    } catch (error) {
      console.error('Error fetching featured properties:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatPrice = (price: number, type?: string) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
    
    return type === 'rent' ? `${formatted}/mo` : formatted;
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Navigation */}
      <header className="fixed top-0 z-50 w-full bg-[rgba(255,255,255,0.8)] backdrop-blur-md border-b border-[#f5f5f7]/30">
        <div className="max-w-[1200px] mx-auto flex h-12 items-center justify-between px-4">
          <div className="flex items-center">
            <Link to="/" className="font-medium text-xl">
              <span className="text-blue-600">Zero</span>Broker
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-8 w-8 hover:cursor-pointer">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                        alt={user.email || ""}
                      />
                      <AvatarFallback>
                        {user.email?.[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="rounded-xl border-none shadow-lg"
                  >
                    <DropdownMenuLabel className="text-xs text-gray-500">
                      {user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => signOut()}
                    >
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="text-sm font-light hover:text-gray-500"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="rounded-full bg-blue-600 text-white hover:bg-blue-700 text-sm px-4">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-12">
        {/* Hero section */}
        <section className="py-20 text-center">
          <h2 className="text-5xl font-semibold tracking-tight mb-1">
            Find Your Dream Property
          </h2>
          <h3 className="text-2xl font-medium text-gray-500 mb-4">
            Zero brokerage fees. Direct connections. Transparent transactions.
          </h3>
          <div className="flex justify-center space-x-6 text-xl text-blue-600">
            <Link
              to="/browse-properties"
              className="flex items-center hover:underline"
            >
              Browse properties <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              to="/list-property"
              className="flex items-center hover:underline"
            >
              List your property <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Location Search with Properties Section */}
        <section className="py-16 bg-[#f5f5f7]">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-semibold tracking-tight mb-2">
                Find Properties by Location
              </h2>
              <p className="text-xl text-gray-500">
                Search for properties in your desired location with powerful map-based search
              </p>
            </div>

            <LocationSearchWithProperties />
          </div>
        </section>

        {/* Features section */}
        <FeaturesSection />

        {/* Property Listings Preview */}
        
      </main>

      {/* How It Works Section */}
      <section className="py-16 bg-[#f5f5f7]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-semibold tracking-tight mb-2">
              How ZeroBroker Works
            </h2>
            <p className="text-xl text-gray-500">
              Simple steps to buy, sell, or rent properties without the
              middleman
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Create Your Account
              </h3>
              <p className="text-gray-500">
                Sign up and complete your profile to start browsing or listing
                properties.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Connect Directly</h3>
              <p className="text-gray-500">
                Browse listings or create your own. Chat directly with buyers or
                sellers.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Close the Deal</h3>
              <p className="text-gray-500">
                Schedule visits, negotiate, and finalize transactions securely
                without broker fees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">ZeroBroker</h3>
              <p className="text-gray-500 mb-4">
                Connecting property owners and seekers directly, with zero
                brokerage fees.
              </p>
              <div className="flex space-x-4"></div>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-500 hover:text-blue-600">
                    Home
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-500 hover:text-blue-600">
                    Browse Properties
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-500 hover:text-blue-600">
                    List Your Property
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-500 hover:text-blue-600">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-500 hover:text-blue-600">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-500 hover:text-blue-600">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-500 hover:text-blue-600">
                    Guides
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-500 hover:text-blue-600">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-500 hover:text-blue-600">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-500 hover:text-blue-600">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-500 hover:text-blue-600">
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-gray-500">
            <p>&copy; {new Date().getFullYear()} ZeroBroker. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
