import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Calendar, TrendingUp, ChevronRight } from "lucide-react";
import { Months, Summary } from "@/lib/api";
import { formatMXN } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MonthsList = () => {
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const load = async () => {
    setLoading(true);
    try {
      let data = await Months.list();
      if (!data || data.length === 0) {
        await Summary.seed();
        data = await Months.list();
      }
      setMonths(data);
    } catch (e) {
      toast.error("Error cargando meses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    try {
      await Months.create({ year: Number(year), month: Number(month) });
      toast.success("Mes agregado");
      setOpen(false);
      load();
    } catch {
      toast.error("No se pudo crear el mes");
    }
  };

  const totalGanancia = months.reduce((s, m) => s + (m.ganancia || 0), 0);
  const totalCobrado = months.reduce((s, m) => s + (m.cobrado || 0), 0);
  const totalPendiente = months.reduce((s, m) => s + (m.pendiente_cobrar || 0), 0);

  return (
    <div>
      <div className="hero-gradient pt-8 pb-8 px-5 rounded-b-3xl">
        <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FF4D6D] mb-1">
          Mis Pedidos
        </p>
        <h1 className="font-heading text-4xl font-bold text-gray-900 tracking-tight" data-testid="home-title">
          Hola <span className="text-[#FF4D6D]">bonita</span> ✦
        </h1>
        <p className="text-sm text-gray-600 mt-1 font-body">
          Organiza tus pedidos SHEIN mes a mes.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-3 border border-pink-100/60 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
              Ganancia total
            </p>
            <p className="font-heading text-lg font-bold money-positive mt-0.5" data-testid="home-total-ganancia">
              {formatMXN(totalGanancia)}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-pink-100/60 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
              Por cobrar
            </p>
            <p className="font-heading text-lg font-bold text-[#D97706] mt-0.5" data-testid="home-total-pendiente">
              {formatMXN(totalPendiente)}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-semibold">Meses</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-month-btn"
                className="rounded-full bg-[#FF4D6D] hover:bg-[#E03A58] text-white px-4 h-9 shadow-sm shadow-pink-200"
              >
                <Plus size={16} className="mr-1" /> Mes
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-heading">Nuevo mes</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Mes</Label>
                  <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger data-testid="new-month-select" className="mt-1.5 rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS_ES.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Año</Label>
                  <Input
                    data-testid="new-month-year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="mt-1.5 rounded-xl h-11"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  data-testid="save-month-btn"
                  onClick={handleCreate}
                  className="w-full rounded-full bg-[#FF4D6D] hover:bg-[#E03A58]"
                >
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : months.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-white border border-gray-100">
            <Calendar size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">
              Aún no tienes meses. Agrega uno para empezar.
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="months-list">
            {months.map((m) => {
              const cobrado = m.cobrado || 0;
              const total = m.total_clientes || 0;
              const pct = total > 0 ? Math.min(100, (cobrado / total) * 100) : 0;
              return (
                <Link
                  key={m.id}
                  to={`/months/${m.id}`}
                  data-testid={`month-card-${m.id}`}
                  className="block bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.15em] text-gray-400 font-semibold">
                        {m.orders_count} pedido{m.orders_count !== 1 ? "s" : ""}
                      </p>
                      <h3 className="font-heading text-xl font-semibold">
                        {m.label}
                      </h3>
                    </div>
                    <ChevronRight className="text-gray-300" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400">Total</p>
                      <p className="font-semibold text-sm">{formatMXN(total)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400">Cobrado</p>
                      <p className="font-semibold text-sm money-positive">{formatMXN(cobrado)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400">Ganancia</p>
                      <p className={`font-semibold text-sm ${m.ganancia >= 0 ? "money-positive" : "money-negative"}`}>
                        {formatMXN(m.ganancia)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Progress value={pct} className="h-2 bg-pink-100" />
                    <span className="text-[11px] text-gray-500 font-semibold shrink-0">
                      {Math.round(pct)}%
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthsList;
