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
import MapSearch from "../home/MapSearch";
import PropertyCard from "../home/PropertyCard";
import SearchFilters from "../home/SearchFilters";

export default function LandingPage() {
  const { user, signOut } = useAuth();

  const navigate = useNavigate();

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
                <Link to="/dashboard">
                  <Button
                    variant="ghost"
                    className="text-sm font-light hover:text-gray-500"
                  >
                    Dashboard
                  </Button>
                </Link>
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
          <SearchFilters />
        </section>

        {/* Features section */}
        <FeaturesSection />

        {/* Map Search Section */}
        <section className="py-16 bg-[#f5f5f7]">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-semibold tracking-tight mb-2">
                Find Properties on the Map
              </h2>
              <p className="text-xl text-gray-500">
                Explore neighborhoods and discover properties in your desired
                location
              </p>
            </div>

            <MapSearch />
          </div>
        </section>

        {/* Property Listings Preview */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-semibold tracking-tight mb-2">
                Featured Properties
              </h2>
              <p className="text-xl text-gray-500">
                Handpicked properties for you to explore
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <PropertyCard
                type="sale"
                title="Modern Family Home"
                address="123 Park Avenue, New York"
                price="$850,000"
                beds={4}
                baths={3}
                sqft={2400}
                imageUrl="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"
              />

              <PropertyCard
                type="rent"
                title="Luxury Apartment"
                address="456 Central Park, Manhattan"
                price="$3,500/mo"
                beds={2}
                baths={2}
                sqft={1200}
                imageUrl="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80"
              />

              <PropertyCard
                type="sale"
                title="Waterfront Villa"
                address="789 Ocean Drive, Miami"
                price="$1,250,000"
                beds={5}
                baths={4}
                sqft={3500}
                imageUrl="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80"
              />
            </div>

            <div className="text-center mt-10">
              <Link to="/browse-properties">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                  View All Properties
                </Button>
              </Link>
            </div>
          </div>
        </section>
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
                Schedule visits, make offers, and complete transactions - all
                without brokerage fees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 text-xs text-gray-500 border-t border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="border-b border-gray-300 pb-8 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-4">
                ZeroBroker
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="hover:underline">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Testimonials
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-4">
                Properties
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="hover:underline">
                    Buy
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Rent
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Sell
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Property Guides
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-4">
                Resources
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="hover:underline">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Real Estate Blog
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Market Insights
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Agent Directory
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="hover:underline">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Fair Housing Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="py-4">
            <p>Copyright © 2025 ZeroBroker. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
