from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------- MODELS ----------

class MonthCreate(BaseModel):
    year: int
    month: int  # 1-12

class MonthUpdate(BaseModel):
    year: Optional[int] = None
    month: Optional[int] = None

class OrderCreate(BaseModel):
    month_id: str
    name: str
    cost: float = 0.0

class OrderUpdate(BaseModel):
    name: Optional[str] = None
    cost: Optional[float] = None
    delivered: Optional[bool] = None

class NoteCreate(BaseModel):
    order_id: str
    client_name: str
    date: str  # ISO date string yyyy-mm-dd
    subtotal: float
    discount_pct: float = 0.0

class NoteUpdate(BaseModel):
    client_name: Optional[str] = None
    date: Optional[str] = None
    subtotal: Optional[float] = None
    discount_pct: Optional[float] = None
    delivered: Optional[bool] = None

class AbonoCreate(BaseModel):
    date: str
    amount: float

# ---------- HELPERS ----------

MONTH_NAMES_ES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

def month_label(year: int, month: int) -> str:
    return f"{MONTH_NAMES_ES[month-1]} {year}"

def compute_note_totals(note: dict) -> dict:
    subtotal = float(note.get("subtotal", 0) or 0)
    discount_pct = float(note.get("discount_pct", 0) or 0)
    total_final = round(subtotal * (1 - discount_pct / 100.0), 2)
    abonos = note.get("abonos", []) or []
    paid = round(sum(float(a.get("amount", 0) or 0) for a in abonos), 2)
    balance = round(total_final - paid, 2)
    payment_status = "pagado" if balance <= 0.009 else "pendiente"
    note["total_final"] = total_final
    note["paid"] = paid
    note["balance"] = max(balance, 0.0)
    note["payment_status"] = payment_status
    return note

async def compute_order_summary(order: dict) -> dict:
    notes = await db.notes.find({"order_id": order["id"]}, {"_id": 0}).to_list(1000)
    notes = [compute_note_totals(n) for n in notes]
    total_clientes = round(sum(n["total_final"] for n in notes), 2)
    cobrado = round(sum(n["paid"] for n in notes), 2)
    pendiente_cobrar = round(sum(n["balance"] for n in notes), 2)
    cost = float(order.get("cost", 0) or 0)
    ganancia = round(cobrado - cost, 2)
    ganancia_potencial = round(total_clientes - cost, 2)
    order["notes_count"] = len(notes)
    order["delivered_count"] = sum(1 for n in notes if n.get("delivered"))
    order["total_clientes"] = total_clientes
    order["cobrado"] = cobrado
    order["pendiente_cobrar"] = pendiente_cobrar
    order["ganancia"] = ganancia
    order["ganancia_potencial"] = ganancia_potencial
    return order

async def compute_month_summary(month: dict) -> dict:
    orders = await db.orders.find({"month_id": month["id"]}, {"_id": 0}).to_list(1000)
    orders = [await compute_order_summary(o) for o in orders]
    total_clientes = round(sum(o["total_clientes"] for o in orders), 2)
    cobrado = round(sum(o["cobrado"] for o in orders), 2)
    pendiente_cobrar = round(sum(o["pendiente_cobrar"] for o in orders), 2)
    costo_total = round(sum(float(o.get("cost", 0) or 0) for o in orders), 2)
    ganancia = round(cobrado - costo_total, 2)
    ganancia_potencial = round(total_clientes - costo_total, 2)
    month["label"] = month_label(month["year"], month["month"])
    month["orders_count"] = len(orders)
    month["delivered_orders"] = sum(1 for o in orders if o.get("delivered"))
    month["total_clientes"] = total_clientes
    month["cobrado"] = cobrado
    month["pendiente_cobrar"] = pendiente_cobrar
    month["costo_total"] = costo_total
    month["ganancia"] = ganancia
    month["ganancia_potencial"] = ganancia_potencial
    return month

# ---------- ROUTES: MONTHS ----------

@api_router.get("/months")
async def list_months():
    months = await db.months.find({}, {"_id": 0}).sort([("year", -1), ("month", -1)]).to_list(1000)
    return [await compute_month_summary(m) for m in months]

@api_router.post("/months")
async def create_month(payload: MonthCreate):
    if payload.month < 1 or payload.month > 12:
        raise HTTPException(status_code=400, detail="Mes inválido")
    existing = await db.months.find_one({"year": payload.year, "month": payload.month}, {"_id": 0})
    if existing:
        return await compute_month_summary(existing)
    doc = {
        "id": str(uuid.uuid4()),
        "year": payload.year,
        "month": payload.month,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.months.insert_one(doc.copy())
    return await compute_month_summary(doc)

@api_router.get("/months/{month_id}")
async def get_month(month_id: str):
    m = await db.months.find_one({"id": month_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Mes no encontrado")
    m = await compute_month_summary(m)
    orders = await db.orders.find({"month_id": month_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    orders = [await compute_order_summary(o) for o in orders]
    m["orders"] = orders
    return m

@api_router.delete("/months/{month_id}")
async def delete_month(month_id: str):
    orders = await db.orders.find({"month_id": month_id}, {"_id": 0}).to_list(1000)
    order_ids = [o["id"] for o in orders]
    if order_ids:
        await db.notes.delete_many({"order_id": {"$in": order_ids}})
    await db.orders.delete_many({"month_id": month_id})
    await db.months.delete_one({"id": month_id})
    return {"ok": True}

# ---------- ROUTES: ORDERS ----------

@api_router.post("/orders")
async def create_order(payload: OrderCreate):
    m = await db.months.find_one({"id": payload.month_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Mes no encontrado")
    doc = {
        "id": str(uuid.uuid4()),
        "month_id": payload.month_id,
        "name": payload.name,
        "cost": float(payload.cost or 0),
        "delivered": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(doc.copy())
    return await compute_order_summary(doc)

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    o = await compute_order_summary(o)
    notes = await db.notes.find({"order_id": order_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    notes = [compute_note_totals(n) for n in notes]
    o["notes"] = notes
    # also include month context
    m = await db.months.find_one({"id": o["month_id"]}, {"_id": 0})
    if m:
        o["month_label"] = month_label(m["year"], m["month"])
    return o

@api_router.patch("/orders/{order_id}")
async def update_order(order_id: str, payload: OrderUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        o = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not o:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        return await compute_order_summary(o)
    result = await db.orders.update_one({"id": order_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return await compute_order_summary(o)

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str):
    await db.notes.delete_many({"order_id": order_id})
    await db.orders.delete_one({"id": order_id})
    return {"ok": True}

# ---------- ROUTES: NOTES ----------

@api_router.post("/notes")
async def create_note(payload: NoteCreate):
    o = await db.orders.find_one({"id": payload.order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    doc = {
        "id": str(uuid.uuid4()),
        "order_id": payload.order_id,
        "client_name": payload.client_name,
        "date": payload.date,
        "subtotal": float(payload.subtotal or 0),
        "discount_pct": float(payload.discount_pct or 0),
        "delivered": False,
        "abonos": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notes.insert_one(doc.copy())
    return compute_note_totals(doc)

@api_router.get("/notes/{note_id}")
async def get_note(note_id: str):
    n = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if not n:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    n = compute_note_totals(n)
    o = await db.orders.find_one({"id": n["order_id"]}, {"_id": 0})
    if o:
        n["order_name"] = o["name"]
        m = await db.months.find_one({"id": o["month_id"]}, {"_id": 0})
        if m:
            n["month_label"] = month_label(m["year"], m["month"])
    return n

@api_router.patch("/notes/{note_id}")
async def update_note(note_id: str, payload: NoteUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        n = await db.notes.find_one({"id": note_id}, {"_id": 0})
        if not n:
            raise HTTPException(status_code=404, detail="Nota no encontrada")
        return compute_note_totals(n)
    result = await db.notes.update_one({"id": note_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    n = await db.notes.find_one({"id": note_id}, {"_id": 0})
    return compute_note_totals(n)

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    await db.notes.delete_one({"id": note_id})
    return {"ok": True}

# ---------- ROUTES: ABONOS ----------

@api_router.post("/notes/{note_id}/abonos")
async def add_abono(note_id: str, payload: AbonoCreate):
    n = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if not n:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    abono = {
        "id": str(uuid.uuid4()),
        "date": payload.date,
        "amount": float(payload.amount or 0),
    }
    await db.notes.update_one({"id": note_id}, {"$push": {"abonos": abono}})
    n = await db.notes.find_one({"id": note_id}, {"_id": 0})
    return compute_note_totals(n)

@api_router.delete("/notes/{note_id}/abonos/{abono_id}")
async def delete_abono(note_id: str, abono_id: str):
    await db.notes.update_one({"id": note_id}, {"$pull": {"abonos": {"id": abono_id}}})
    n = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if not n:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    return compute_note_totals(n)

# ---------- SUMMARY ----------

@api_router.get("/summary")
async def global_summary():
    months = await db.months.find({}, {"_id": 0}).sort([("year", -1), ("month", -1)]).to_list(1000)
    months = [await compute_month_summary(m) for m in months]
    total_ganancia = round(sum(m["ganancia"] for m in months), 2)
    total_cobrado = round(sum(m["cobrado"] for m in months), 2)
    total_pendiente = round(sum(m["pendiente_cobrar"] for m in months), 2)
    total_clientes = round(sum(m["total_clientes"] for m in months), 2)
    total_costo = round(sum(m["costo_total"] for m in months), 2)
    return {
        "months": months,
        "total_ganancia": total_ganancia,
        "total_cobrado": total_cobrado,
        "total_pendiente": total_pendiente,
        "total_clientes": total_clientes,
        "total_costo": total_costo,
    }

# ---------- SEED ----------

@api_router.post("/seed")
async def seed_data(force: bool = False):
    existing_count = await db.months.count_documents({})
    if existing_count > 0 and not force:
        return {"ok": True, "seeded": False, "message": "Ya existen datos"}
    if force:
        await db.months.delete_many({})
        await db.orders.delete_many({})
        await db.notes.delete_many({})

    now = datetime.now(timezone.utc)
    # Month 1: current month
    m1 = {
        "id": str(uuid.uuid4()),
        "year": now.year,
        "month": now.month,
        "created_at": now.isoformat(),
    }
    # Month 2: previous month
    prev_month = now.month - 1 if now.month > 1 else 12
    prev_year = now.year if now.month > 1 else now.year - 1
    m2 = {
        "id": str(uuid.uuid4()),
        "year": prev_year,
        "month": prev_month,
        "created_at": now.isoformat(),
    }
    await db.months.insert_many([m1.copy(), m2.copy()])

    # Orders for m1
    o1 = {
        "id": str(uuid.uuid4()),
        "month_id": m1["id"],
        "name": "Pedido SHEIN #1",
        "cost": 3200.0,
        "delivered": False,
        "created_at": now.isoformat(),
    }
    o2 = {
        "id": str(uuid.uuid4()),
        "month_id": m1["id"],
        "name": "Pedido SHEIN #2",
        "cost": 2100.0,
        "delivered": True,
        "created_at": now.isoformat(),
    }
    # Orders for m2
    o3 = {
        "id": str(uuid.uuid4()),
        "month_id": m2["id"],
        "name": "Pedido SHEIN #1",
        "cost": 4500.0,
        "delivered": True,
        "created_at": now.isoformat(),
    }
    await db.orders.insert_many([o1.copy(), o2.copy(), o3.copy()])

    today_str = now.date().isoformat()
    notes = [
        # Order 1 notes
        {"id": str(uuid.uuid4()), "order_id": o1["id"], "client_name": "María López",
         "date": today_str, "subtotal": 1200.0, "discount_pct": 10.0, "delivered": False,
         "abonos": [{"id": str(uuid.uuid4()), "date": today_str, "amount": 500.0}],
         "created_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "order_id": o1["id"], "client_name": "Ana Torres",
         "date": today_str, "subtotal": 850.0, "discount_pct": 15.0, "delivered": True,
         "abonos": [{"id": str(uuid.uuid4()), "date": today_str, "amount": 722.5}],
         "created_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "order_id": o1["id"], "client_name": "Sofía Ramírez",
         "date": today_str, "subtotal": 2100.0, "discount_pct": 20.0, "delivered": False,
         "abonos": [],
         "created_at": now.isoformat()},
        # Order 2 notes
        {"id": str(uuid.uuid4()), "order_id": o2["id"], "client_name": "Lucía Hernández",
         "date": today_str, "subtotal": 1500.0, "discount_pct": 10.0, "delivered": True,
         "abonos": [{"id": str(uuid.uuid4()), "date": today_str, "amount": 1350.0}],
         "created_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "order_id": o2["id"], "client_name": "Valeria Ruiz",
         "date": today_str, "subtotal": 980.0, "discount_pct": 15.0, "delivered": True,
         "abonos": [
             {"id": str(uuid.uuid4()), "date": today_str, "amount": 400.0},
             {"id": str(uuid.uuid4()), "date": today_str, "amount": 433.0},
         ],
         "created_at": now.isoformat()},
        # Order 3 notes
        {"id": str(uuid.uuid4()), "order_id": o3["id"], "client_name": "Paola Jiménez",
         "date": today_str, "subtotal": 3200.0, "discount_pct": 10.0, "delivered": True,
         "abonos": [{"id": str(uuid.uuid4()), "date": today_str, "amount": 2880.0}],
         "created_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "order_id": o3["id"], "client_name": "Camila Vega",
         "date": today_str, "subtotal": 1800.0, "discount_pct": 20.0, "delivered": True,
         "abonos": [{"id": str(uuid.uuid4()), "date": today_str, "amount": 1440.0}],
         "created_at": now.isoformat()},
    ]
    await db.notes.insert_many([n.copy() for n in notes])
    return {"ok": True, "seeded": True}

# ---------- HEALTH ----------

@api_router.get("/")
async def root():
    return {"message": "Mis Pedidos SHEIN API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
