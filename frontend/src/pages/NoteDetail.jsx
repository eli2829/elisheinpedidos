import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Trash2, Coins, Receipt, CheckCircle2, Clock } from "lucide-react";
import { Notes } from "@/lib/api";
import { formatMXN, formatDateES, todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const NoteDetail = () => {
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setNote(await Notes.get(id));
    } catch {
      toast.error("Error cargando nota");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  load();
}, [id, load]);

  const handleAddAbono = async () => {
    const amt = Number(amount || 0);
    if (amt <= 0) {
      toast.error("Monto inválido");
      return;
    }
    try {
      await Notes.addAbono(id, { date, amount: amt });
      toast.success("Abono registrado");
      setOpen(false);
      setAmount("");
      setDate(todayISO());
      load();
    } catch {
      toast.error("Error");
    }
  };

  const handleRemoveAbono = async (abonoId) => {
    try {
      await Notes.removeAbono(id, abonoId);
      toast.success("Abono eliminado");
      load();
    } catch {
      toast.error("Error");
    }
  };

  const handleToggleDelivered = async (checked) => {
    try {
      await Notes.update(id, { delivered: !!checked });
      load();
    } catch {
      toast.error("Error");
    }
  };

  const handleDelete = async () => {
    try {
      await Notes.remove(id);
      toast.success("Cliente eliminado");
      window.history.back();
    } catch {
      toast.error("Error");
    }
  };

  if (loading || !note) {
    return (
      <div>
        <PageHeader title="Cargando..." />
        <div className="p-5 space-y-3">
          <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  const pct =
    note.total_final > 0
      ? Math.min(100, (note.paid / note.total_final) * 100)
      : 0;

  const abonos = (note.abonos || []).slice().reverse();

  return (
    <div>
      <PageHeader
        title={note.client_name}
        subtitle={note.order_name || "Cliente"}
        right={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                data-testid="delete-note-btn"
                className="w-9 h-9 rounded-full bg-white/70 border border-white flex items-center justify-center text-gray-500 active:scale-95"
                aria-label="Eliminar cliente"
              >
                <Trash2 size={16} />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar a {note.client_name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  También se eliminarán sus abonos registrados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
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
        {/* Header card */}
        <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-white rounded-3xl p-5 border border-pink-100/60 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-gray-500">
              {formatDateES(note.date)}
            </p>
            {note.payment_status === "pagado" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D1FAE5] text-[#059669] text-[10px] font-bold uppercase tracking-wider">
                <CheckCircle2 size={12} /> Pagado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] text-[10px] font-bold uppercase tracking-wider">
                <Clock size={12} /> Pendiente
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500">Total a pagar</p>
          <p
            data-testid="note-total-final"
            className="font-heading text-4xl font-bold text-gray-900"
          >
            {formatMXN(note.total_final)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            Subtotal {formatMXN(note.subtotal)} · Desc. {note.discount_pct}%
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-white/80 rounded-xl p-3 border border-white">
              <p className="text-[10px] uppercase text-gray-400">Pagado</p>
              <p
                data-testid="note-paid"
                className="font-heading text-lg font-bold money-positive"
              >
                {formatMXN(note.paid)}
              </p>
            </div>
            <div className="bg-white/80 rounded-xl p-3 border border-white">
              <p className="text-[10px] uppercase text-gray-400">Saldo</p>
              <p
                data-testid="note-balance"
                className={`font-heading text-lg font-bold ${note.payment_status === "pagado" ? "money-positive" : "text-[#D97706]"}`}
              >
                {formatMXN(note.balance)}
              </p>
            </div>
          </div>

          <div className="mt-4 h-2 bg-white/70 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${note.payment_status === "pagado" ? "bg-[#10B981]" : "bg-[#FF4D6D]"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Delivered toggle */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Entregado</p>
            <p className="text-xs text-gray-500">Marca cuando tu clienta reciba su pedido</p>
          </div>
          <Checkbox
            data-testid="note-detail-delivered"
            checked={!!note.delivered}
            onCheckedChange={handleToggleDelivered}
            className="w-6 h-6 rounded-md data-[state=checked]:bg-[#FF4D6D] data-[state=checked]:border-[#FF4D6D]"
          />
        </div>

        {/* Abonos */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg font-semibold">Abonos</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-abono-btn"
                className="rounded-full bg-[#FF4D6D] hover:bg-[#E03A58] text-white h-9 px-4"
              >
                <Plus size={16} className="mr-1" /> Abono
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-heading">Nuevo abono</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-1">
                <div>
                  <Label>Fecha</Label>
                  <Input
                    data-testid="abono-date-input"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1.5 rounded-xl h-11"
                  />
                </div>
                <div>
                  <Label>Monto (MXN)</Label>
                  <Input
                    data-testid="abono-amount-input"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="mt-1.5 rounded-xl h-11"
                  />
                </div>
                {Number(amount) > 0 && (
                  <div className="bg-[#FFF0F3] rounded-xl p-3 text-xs text-gray-600">
                    Saldo después del abono:{" "}
                    <span className="font-heading font-bold text-[#FF4D6D]">
                      {formatMXN(Math.max(0, note.balance - Number(amount)))}
                    </span>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  data-testid="save-abono-btn"
                  onClick={handleAddAbono}
                  className="w-full rounded-full bg-[#FF4D6D] hover:bg-[#E03A58]"
                >
                  Registrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {abonos.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white border border-gray-100">
            <Receipt size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Sin abonos registrados.</p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="abonos-list">
            {abonos.map((a) => (
              <div
                key={a.id}
                data-testid={`abono-${a.id}`}
                className="bg-white rounded-2xl p-3.5 border border-gray-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#D1FAE5] flex items-center justify-center">
                    <Coins size={16} className="text-[#059669]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm money-positive">
                      {formatMXN(a.amount)}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {formatDateES(a.date)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveAbono(a.id)}
                  data-testid={`remove-abono-${a.id}`}
                  className="w-8 h-8 rounded-full hover:bg-gray-50 flex items-center justify-center text-gray-400 active:scale-95"
                  aria-label="Eliminar abono"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteDetail;
