import React from "react";
import TopNavigation from "./TopNavigation";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-white">
      <TopNavigation />
      <div className="pt-16">
        {children}
      </div>
    </div>
  );
};

export default Layout; 