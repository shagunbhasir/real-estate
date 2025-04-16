import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Building, Users } from "lucide-react";

interface SidebarItem {
  title: string;
  icon: React.ReactNode;
  href: string;
}

const SidebarItems: SidebarItem[] = [
  {
    title: "Properties",
    icon: <Building className="h-4 w-4" />,
    href: "/property-management",
  },
  {
    title: "Users",
    icon: <Users className="h-4 w-4" />,
    href: "/user-management",
  },
];

const Sidebar = () => {
  const location = useLocation();
  
  return (
    <aside className="w-56 bg-white border-r border-gray-200 hidden md:block">
      <div className="flex flex-col h-full">
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-2">
            {SidebarItems.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium",
                    location.pathname === item.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {item.icon}
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar; 