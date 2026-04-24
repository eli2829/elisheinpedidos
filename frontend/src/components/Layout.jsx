import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, PieChart } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

const Layout = ({ children }) => {
  const { pathname } = useLocation();
  const isSummary = pathname.startsWith("/summary");
  const isHome = pathname === "/" || pathname.startsWith("/months") === false && !isSummary ? pathname === "/" : pathname === "/";

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex justify-center">
      <div className="w-full max-w-md relative pb-24">
        {children}

        <nav
          className="fixed bottom-0 w-full max-w-md bg-white/85 backdrop-blur-xl border-t border-gray-100 px-4 py-3 flex justify-around items-center z-50"
          data-testid="bottom-nav"
        >
          <Link
            to="/"
            data-testid="nav-home"
            className={`flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-full transition-all ${
              pathname === "/" ? "text-[#FF4D6D]" : "text-gray-400"
            }`}
          >
            <Home size={22} strokeWidth={pathname === "/" ? 2.5 : 2} />
            <span className="text-[11px] font-semibold">Meses</span>
          </Link>
          <Link
            to="/summary"
            data-testid="nav-summary"
            className={`flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-full transition-all ${
              isSummary ? "text-[#FF4D6D]" : "text-gray-400"
            }`}
          >
            <PieChart size={22} strokeWidth={isSummary ? 2.5 : 2} />
            <span className="text-[11px] font-semibold">Ganancias</span>
          </Link>
        </nav>

        <Toaster richColors position="top-center" />
      </div>
    </div>
  );
};

export default Layout;
