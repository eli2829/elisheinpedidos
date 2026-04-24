import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const PageHeader = ({ title, subtitle, onBack, right }) => {
  const navigate = useNavigate();
  return (
    <div className="hero-gradient sticky top-0 z-40 pt-6 pb-5 px-5 rounded-b-3xl border-b border-pink-100/60">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {onBack !== false && (
            <button
              onClick={() => (onBack ? onBack() : navigate(-1))}
              data-testid="header-back-btn"
              className="shrink-0 w-9 h-9 rounded-full bg-white/70 border border-white flex items-center justify-center text-gray-700 active:scale-95 transition-all"
              aria-label="Volver"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="min-w-0">
            {subtitle && (
              <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[#FF4D6D]/80 truncate">
                {subtitle}
              </p>
            )}
            <h1
              className="font-heading text-2xl font-bold text-gray-900 truncate"
              data-testid="page-title"
            >
              {title}
            </h1>
          </div>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
