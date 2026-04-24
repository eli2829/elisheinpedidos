import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, TrendingUp, Wallet, Clock } from "lucide-react";
import { Summary } from "@/lib/api";
import { formatMXN } from "@/lib/format";

const StatTile = ({ label, value, tone = "default", icon: Icon, testid }) => {
  const toneMap = {
    positive: "money-positive",
    warning: "text-[#D97706]",
    neutral: "text-gray-900",
    default: "text-gray-900",
  };
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon size={14} className="text-gray-400" />}
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
          {label}
        </p>
      </div>
      <p
        data-testid={testid}
        className={`font-heading text-xl font-bold ${toneMap[tone]}`}
      >
        {value}
      </p>
    </div>
  );
};

const SummaryPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await Summary.global());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="hero-gradient pt-8 pb-8 px-5 rounded-b-3xl">
        <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FF4D6D] mb-1">
          Resumen
        </p>
        <h1 className="font-heading text-4xl font-bold text-gray-900" data-testid="summary-title">
          Tus <span className="text-[#FF4D6D]">ganancias</span>
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Todo lo que has ganado y lo que queda por cobrar.
        </p>
      </div>

      <div className="px-5 pt-5">
        {loading || !data ? (
          <div className="space-y-3">
            <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
            <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
          </div>
        ) : (
          <>
            {/* Hero total */}
            <div className="bg-gradient-to-br from-[#FF4D6D] to-[#E03A58] rounded-3xl p-5 text-white shadow-lg shadow-pink-200 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={14} />
                <p className="text-[11px] uppercase tracking-[0.2em] font-semibold opacity-80">
                  Ganancia total
                </p>
              </div>
              <p
                data-testid="summary-ganancia-total"
                className="font-heading text-4xl font-bold"
              >
                {formatMXN(data.total_ganancia)}
              </p>
              <p className="text-xs opacity-80 mt-1">
                {data.months.length} {data.months.length === 1 ? "mes" : "meses"} registrado
                {data.months.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatTile
                label="Cobrado"
                value={formatMXN(data.total_cobrado)}
                tone="positive"
                icon={Wallet}
                testid="summary-total-cobrado"
              />
              <StatTile
                label="Por cobrar"
                value={formatMXN(data.total_pendiente)}
                tone="warning"
                icon={Clock}
                testid="summary-total-pendiente"
              />
              <StatTile
                label="Ventas totales"
                value={formatMXN(data.total_clientes)}
                tone="neutral"
                icon={TrendingUp}
              />
              <StatTile
                label="Costo total"
                value={formatMXN(data.total_costo)}
                tone="neutral"
              />
            </div>

            <h2 className="font-heading text-lg font-semibold mb-3">Por mes</h2>
            {data.months.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-white border border-gray-100">
                <p className="text-sm text-gray-500">
                  Agrega meses desde la pestaña principal.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.months.map((m) => (
                  <Link
                    key={m.id}
                    to={`/months/${m.id}`}
                    data-testid={`summary-month-${m.id}`}
                    className="block bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                          {m.orders_count} pedido{m.orders_count !== 1 ? "s" : ""}
                        </p>
                        <h3 className="font-heading text-lg font-semibold">
                          {m.label}
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400">
                          Ganancia
                        </p>
                        <p
                          className={`font-heading text-lg font-bold ${m.ganancia >= 0 ? "money-positive" : "money-negative"}`}
                        >
                          {formatMXN(m.ganancia)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-400">Ventas</p>
                        <p className="font-semibold">{formatMXN(m.total_clientes)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Cobrado</p>
                        <p className="font-semibold money-positive">{formatMXN(m.cobrado)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Saldo</p>
                        <p className="font-semibold text-[#D97706]">
                          {formatMXN(m.pendiente_cobrar)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SummaryPage;
