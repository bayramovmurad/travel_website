import Footer from "@/components/shared/footer/Footer";
import Header from "@/components/shared/header/Header";
import React from "react";

interface RouteLayoutProps {
  children: React.ReactNode;
}

const ReactLayout = ({ children }: RouteLayoutProps) => {
  return (
    <div>
      <Header />
      <div className="min-h-screen">
        {children}
      </div>
      <Footer />
    </div>
  );
};

export default ReactLayout;
