import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Plus, Users, ChevronRight, Trash2, CheckCircle2,
  Clock, Edit3, Coins,
} from "lucide-react";
import { Orders, Notes } from "@/lib/api";
import { formatMXN, formatDateES, todayISO } from "@/lib/format";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const DISCOUNT_PRESETS = [0, 5, 10, 15, 20, 25, 30];

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [noteOpen, setNoteOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [noteDate, setNoteDate] = useState(todayISO());
  const [subtotal, setSubtotal] = useState("");
  const [discount, setDiscount] = useState("10");
  const [customDiscount, setCustomDiscount] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCost, setEditCost] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const o = await Orders.get(id);
      setOrder(o);
      setEditName(o.name);
      setEditCost(String(o.cost || 0));
    } catch {
      toast.error("Error cargando pedido");
    } finally {
      setLoading(false);
    }
  };

 useEffect(() => {
  load();
}, [id]);

  const handleCreateNote = async () => {
    if (!clientName.trim()) {
      toast.error("Nombre del cliente requerido");
      return;
    }
    try {
      await Notes.create({
        order_id: id,
        client_name: clientName.trim(),
        date: noteDate,
        subtotal: Number(subtotal || 0),
        discount_pct: Number(discount || 0),
      });
      toast.success("Cliente agregado");
      setNoteOpen(false);
      setClientName("");
      setSubtotal("");
      setDiscount("10");
      setCustomDiscount(false);
      load();
    } catch {
      toast.error("No se pudo agregar");
    }
  };

  const handleSaveEdit = async () => {
    try {
      await Orders.update(id, {
        name: editName.trim(),
        cost: Number(editCost || 0),
      });
      toast.success("Pedido actualizado");
      setEditOpen(false);
      load();
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  const handleToggleDelivered = async (checked) => {
    try {
      await Orders.update(id, { delivered: !!checked });
      load();
    } catch {
      toast.error("Error");
    }
  };

  const handleToggleNoteDelivered = async (note, checked) => {
    try {
      await Notes.update(note.id, { delivered: !!checked });
      load();
    } catch {
      toast.error("Error");
    }
  };

  const handleDeleteOrder = async () => {
    try {
      await Orders.remove(id);
      toast.success("Pedido eliminado");
      window.history.back();
    } catch {
      toast.error("Error");
    }
  };

  if (loading || !order) {
    return (
      <div>
        <PageHeader title="Cargando..." />
        <div className="p-5 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const previewTotal =
    Number(subtotal || 0) * (1 - Number(discount || 0) / 100);

  return (
    <div>
      <PageHeader
        title={order.name}
        subtitle={order.month_label}
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditOpen(true)}
              data-testid="edit-order-btn"
              className="w-9 h-9 rounded-full bg-white/70 border border-white flex items-center justify-center text-gray-600 active:scale-95"
              aria-label="Editar pedido"
            >
              <Edit3 size={16} />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  data-testid="delete-order-btn"
                  className="w-9 h-9 rounded-full bg-white/70 border border-white flex items-center justify-center text-gray-500 active:scale-95"
                  aria-label="Eliminar pedido"
                >
                  <Trash2 size={16} />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar este pedido?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminarán todos los clientes dentro de él.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteOrder}
                    className="rounded-full bg-red-500 hover:bg-red-600"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      <div className="px-5 pt-5">
        {/* Delivered toggle */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {order.delivered ? (
              <div className="w-9 h-9 rounded-full bg-[#D1FAE5] flex items-center justify-center">
                <CheckCircle2 size={18} className="text-[#059669]" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#FEF3C7] flex items-center justify-center">
                <Clock size={18} className="text-[#D97706]" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">Pedido entregado</p>
              <p className="text-xs text-gray-500">
                Marca cuando hayas entregado todo
              </p>
            </div>
          </div>
          <Checkbox
            data-testid="order-delivered-checkbox"
            checked={!!order.delivered}
            onCheckedChange={handleToggleDelivered}
            className="w-6 h-6 rounded-md data-[state=checked]:bg-[#FF4D6D] data-[state=checked]:border-[#FF4D6D]"
          />
        </div>

        {/* Finance summary */}
        <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-white rounded-2xl p-4 border border-pink-100/60 mb-5">
          <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500 mb-3">
            Ganancia del pedido
          </p>
          <p
            data-testid="order-ganancia"
            className={`font-heading text-3xl font-bold ${order.ganancia >= 0 ? "money-positive" : "money-negative"}`}
          >
            {formatMXN(order.ganancia)}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Ganancia potencial (todo cobrado): <span className="font-semibold text-gray-700">{formatMXN(order.ganancia_potencial)}</span>
          </p>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/70 rounded-xl p-3 border border-white">
              <p className="text-[10px] uppercase text-gray-400">Total clientes</p>
              <p className="font-semibold text-sm" data-testid="order-total-clientes">{formatMXN(order.total_clientes)}</p>
            </div>
            <div className="bg-white/70 rounded-xl p-3 border border-white">
              <p className="text-[10px] uppercase text-gray-400">Costo pedido</p>
              <p className="font-semibold text-sm">{formatMXN(order.cost)}</p>
            </div>
            <div className="bg-white/70 rounded-xl p-3 border border-white">
              <p className="text-[10px] uppercase text-gray-400">Cobrado</p>
              <p className="font-semibold text-sm money-positive" data-testid="order-cobrado">
                {formatMXN(order.cobrado)}
              </p>
            </div>
            <div className="bg-white/70 rounded-xl p-3 border border-white">
              <p className="text-[10px] uppercase text-gray-400">Por cobrar</p>
              <p className="font-semibold text-sm text-[#D97706]" data-testid="order-pendiente">
                {formatMXN(order.pendiente_cobrar)}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg font-semibold">Clientes</h2>
          <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-note-btn"
                className="rounded-full bg-[#FF4D6D] hover:bg-[#E03A58] text-white h-9 px-4"
              >
                <Plus size={16} className="mr-1" /> Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-heading">Nueva nota</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-1">
                <div>
                  <Label>Nombre de la clienta</Label>
                  <Input
                    data-testid="note-name-input"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej. María López"
                    className="mt-1.5 rounded-xl h-11"
                  />
                </div>
                <div>
                  <Label>Fecha</Label>
                  <Input
                    data-testid="note-date-input"
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="mt-1.5 rounded-xl h-11"
                  />
                </div>
                <div>
                  <Label>Total sin descuento (MXN)</Label>
                  <Input
                    data-testid="note-subtotal-input"
                    type="number"
                    value={subtotal}
                    onChange={(e) => setSubtotal(e.target.value)}
                    placeholder="0"
                    className="mt-1.5 rounded-xl h-11"
                  />
                </div>
                <div>
                  <Label>Descuento</Label>
                  {!customDiscount ? (
                    <div className="flex gap-2 mt-1.5">
                      <Select value={discount} onValueChange={setDiscount}>
                        <SelectTrigger data-testid="note-discount-select" className="rounded-xl h-11 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DISCOUNT_PRESETS.map((d) => (
                            <SelectItem key={d} value={String(d)}>
                              {d}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCustomDiscount(true)}
                        className="rounded-xl h-11 text-xs"
                      >
                        Otro %
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        data-testid="note-discount-custom"
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        placeholder="Ej. 12"
                        className="rounded-xl h-11 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCustomDiscount(false);
                          setDiscount("10");
                        }}
                        className="rounded-xl h-11 text-xs"
                      >
                        Preset
                      </Button>
                    </div>
                  )}
                </div>
                {Number(subtotal) > 0 && (
                  <div className="mt-2 bg-[#FFF0F3] rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs text-gray-600">Total con descuento</span>
                    <span className="font-heading font-bold text-[#FF4D6D]">
                      {formatMXN(previewTotal)}
                    </span>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  data-testid="save-note-btn"
                  onClick={handleCreateNote}
                  className="w-full rounded-full bg-[#FF4D6D] hover:bg-[#E03A58]"
                >
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {order.notes.length === 0 ? (
          <div className="text-center py-14 rounded-2xl bg-white border border-gray-100">
            <Users size={30} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">
              Aún no hay clientes. Agrega la primera nota.
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="notes-list">
            {order.notes.map((n) => {
              const pct =
                n.total_final > 0
                  ? Math.min(100, (n.paid / n.total_final) * 100)
                  : 0;
              return (
                <div
                  key={n.id}
                  data-testid={`note-card-${n.id}`}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Checkbox
                        data-testid={`note-delivered-${n.id}`}
                        checked={!!n.delivered}
                        onCheckedChange={(c) => handleToggleNoteDelivered(n, c)}
                        className="mt-1 w-5 h-5 rounded-md data-[state=checked]:bg-[#FF4D6D] data-[state=checked]:border-[#FF4D6D]"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/notes/${n.id}`}
                          className="block"
                        >
                          <h3
                            className={`font-heading font-semibold text-base truncate ${n.delivered ? "text-gray-400 line-through" : ""}`}
                          >
                            {n.client_name}
                          </h3>
                          <p className="text-[11px] text-gray-500">
                            {formatDateES(n.date)} · {n.discount_pct}% desc.
                          </p>
                        </Link>
                      </div>
                    </div>
                    <Link
                      to={`/notes/${n.id}`}
                      className="shrink-0 text-gray-300"
                    >
                      <ChevronRight />
                    </Link>
                  </div>

                  <Link to={`/notes/${n.id}`} className="block mt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase text-gray-400">Total</p>
                        <p className="font-semibold text-sm">{formatMXN(n.total_final)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase text-gray-400">Saldo</p>
                        <p
                          className={`font-semibold text-sm ${n.payment_status === "pagado" ? "money-positive" : "text-[#D97706]"}`}
                        >
                          {formatMXN(n.balance)}
                        </p>
                      </div>
                      {n.payment_status === "pagado" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#059669] text-[10px] font-bold uppercase tracking-wider">
                          <Coins size={11} /> Pagado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] text-[10px] font-bold uppercase tracking-wider">
                          <Coins size={11} /> Pendiente
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 h-1.5 bg-pink-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${n.payment_status === "pagado" ? "bg-[#10B981]" : "bg-[#FF4D6D]"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit order dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Editar pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <Label>Nombre</Label>
              <Input
                data-testid="edit-order-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1.5 rounded-xl h-11"
              />
            </div>
            <div>
              <Label>Costo total del pedido (MXN)</Label>
              <Input
                data-testid="edit-order-cost"
                type="number"
                value={editCost}
                onChange={(e) => setEditCost(e.target.value)}
                className="mt-1.5 rounded-xl h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              data-testid="save-edit-order"
              onClick={handleSaveEdit}
              className="w-full rounded-full bg-[#FF4D6D] hover:bg-[#E03A58]"
            >
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetail;
