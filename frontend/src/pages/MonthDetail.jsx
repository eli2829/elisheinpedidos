import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, Package, ChevronRight, Trash2, CheckCircle2, Clock } from "lucide-react";
import { Months, Orders } from "@/lib/api";
import { formatMXN } from "@/lib/format";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const MonthDetail = () => {
  const { id } = useParams();
  const [month, setMonth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setMonth(await Months.get(id));
    } catch {
      toast.error("Error cargando mes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  load();
}, [id, load]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Escribe un nombre");
      return;
    }
    try {
      await Orders.create({
        month_id: id,
        name: name.trim(),
        cost: Number(cost || 0),
      });
      toast.success("Pedido creado");
      setOpen(false);
      setName("");
      setCost("");
      load();
    } catch {
      toast.error("No se pudo crear el pedido");
    }
  };

  const handleDeleteMonth = async () => {
    try {
      await Months.remove(id);
      toast.success("Mes eliminado");
      window.history.back();
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  if (loading || !month) {
    return (
      <div>
        <PageHeader title="Cargando..." />
        <div className="p-5 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={month.label}
        subtitle={`${month.orders_count} pedido${month.orders_count !== 1 ? "s" : ""}`}
        right={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                data-testid="delete-month-btn"
                className="w-9 h-9 rounded-full bg-white/70 border border-white flex items-center justify-center text-gray-500 active:scale-95"
                aria-label="Eliminar mes"
              >
                <Trash2 size={17} />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar este mes?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminarán todos los pedidos y clientes dentro de él.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  data-testid="confirm-delete-month"
                  onClick={handleDeleteMonth}
                  className="rounded-full bg-red-500 hover:bg-red-600"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />

      <div className="px-5 pt-5">
        {/* Summary card */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-5">
          <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-400 mb-3">
            Resumen del mes
          </p>
          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            <div>
              <p className="text-xs text-gray-500">Total clientes</p>
              <p className="font-semibold" data-testid="month-total-clientes">{formatMXN(month.total_clientes)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Costo pedidos</p>
              <p className="font-semibold">{formatMXN(month.costo_total)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Cobrado</p>
              <p className="font-semibold money-positive">{formatMXN(month.cobrado)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Por cobrar</p>
              <p className="font-semibold text-[#D97706]">{formatMXN(month.pendiente_cobrar)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Ganancia mensual</p>
            <p
              data-testid="month-ganancia"
              className={`font-heading text-xl font-bold ${month.ganancia >= 0 ? "money-positive" : "money-negative"}`}
            >
              {formatMXN(month.ganancia)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg font-semibold">Pedidos</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-order-btn"
                className="rounded-full bg-[#FF4D6D] hover:bg-[#E03A58] text-white h-9 px-4"
              >
                <Plus size={16} className="mr-1" /> Pedido
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-heading">Nuevo pedido</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    data-testid="order-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Pedido SHEIN #1"
                    className="mt-1.5 rounded-xl h-11"
                  />
                </div>
                <div>
                  <Label>Costo total del pedido (MXN)</Label>
                  <Input
                    data-testid="order-cost-input"
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0"
                    className="mt-1.5 rounded-xl h-11"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  data-testid="save-order-btn"
                  onClick={handleCreate}
                  className="w-full rounded-full bg-[#FF4D6D] hover:bg-[#E03A58]"
                >
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {month.orders.length === 0 ? (
          <div className="text-center py-14 rounded-2xl bg-white border border-gray-100">
            <Package size={30} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Sin pedidos. Agrega el primero.</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="orders-list">
            {month.orders.map((o) => {
              const pct =
                o.total_clientes > 0
                  ? Math.min(100, (o.cobrado / o.total_clientes) * 100)
                  : 0;
              return (
                <Link
                  key={o.id}
                  to={`/orders/${o.id}`}
                  data-testid={`order-card-${o.id}`}
                  className="block bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <h3 className="font-heading text-lg font-semibold truncate">
                        {o.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {o.notes_count} cliente{o.notes_count !== 1 ? "s" : ""} · {o.delivered_count} entregados
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {o.delivered ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#059669] text-[10px] font-bold uppercase tracking-wider">
                          <CheckCircle2 size={11} /> Entregado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] text-[10px] font-bold uppercase tracking-wider">
                          <Clock size={11} /> Pendiente
                        </span>
                      )}
                      <ChevronRight className="text-gray-300" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div>
                      <p className="text-[10px] uppercase text-gray-400">Cobrado</p>
                      <p className="text-sm font-semibold money-positive">
                        {formatMXN(o.cobrado)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-400">Por cobrar</p>
                      <p className="text-sm font-semibold text-[#D97706]">
                        {formatMXN(o.pendiente_cobrar)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-400">Ganancia</p>
                      <p
                        className={`text-sm font-semibold ${o.ganancia >= 0 ? "money-positive" : "money-negative"}`}
                      >
                        {formatMXN(o.ganancia)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 bg-pink-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF4D6D] rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
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

export default MonthDetail;
