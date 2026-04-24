"""
SHEIN-style order management API tests.
Covers: months, orders, notes, abonos, summary, seed.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://order-tracker-pro-10.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# -------- Health & Seed --------

def test_root_health(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert "message" in r.json()


def test_seed_idempotent(session):
    r = session.post(f"{API}/seed")
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    # seeded may be True or False depending on existing state
    assert "seeded" in data


# -------- Months --------

def test_list_months(session):
    r = session.get(f"{API}/months")
    assert r.status_code == 200
    months = r.json()
    assert isinstance(months, list)
    assert len(months) >= 2
    for m in months:
        for k in ["id", "label", "year", "month", "total_clientes", "cobrado",
                  "pendiente_cobrar", "costo_total", "ganancia", "ganancia_potencial"]:
            assert k in m, f"missing {k} in month"


def test_create_month_invalid(session):
    r = session.post(f"{API}/months", json={"year": 2030, "month": 13})
    assert r.status_code == 400


def test_create_and_get_month_flow(session):
    # Create a test month
    r = session.post(f"{API}/months", json={"year": 2099, "month": 7})
    assert r.status_code == 200
    m = r.json()
    assert m["year"] == 2099
    assert m["month"] == 7
    assert m["label"].startswith("Julio 2099")
    mid = m["id"]

    # GET detail
    r = session.get(f"{API}/months/{mid}")
    assert r.status_code == 200
    detail = r.json()
    assert detail["id"] == mid
    assert "orders" in detail
    assert detail["orders"] == []

    # Idempotency: creating same year/month returns existing
    r2 = session.post(f"{API}/months", json={"year": 2099, "month": 7})
    assert r2.status_code == 200
    assert r2.json()["id"] == mid

    # Cleanup
    r = session.delete(f"{API}/months/{mid}")
    assert r.status_code == 200
    r = session.get(f"{API}/months/{mid}")
    assert r.status_code == 404


# -------- Full flow: Orders, Notes, Abonos --------

@pytest.fixture(scope="module")
def test_month(session):
    r = session.post(f"{API}/months", json={"year": 2098, "month": 3})
    assert r.status_code == 200
    mid = r.json()["id"]
    yield mid
    session.delete(f"{API}/months/{mid}")


def test_order_crud_and_note_calculations(session, test_month):
    # Create order
    r = session.post(f"{API}/orders", json={
        "month_id": test_month, "name": "TEST_Pedido", "cost": 1000.0
    })
    assert r.status_code == 200
    order = r.json()
    assert order["name"] == "TEST_Pedido"
    assert order["cost"] == 1000.0
    assert order["delivered"] is False
    oid = order["id"]

    # Order not found case
    r = session.post(f"{API}/orders", json={
        "month_id": "nonexistent", "name": "x", "cost": 0
    })
    assert r.status_code == 404

    # Create note with discount 15%, subtotal 850 -> 722.5
    r = session.post(f"{API}/notes", json={
        "order_id": oid, "client_name": "TEST_Ana", "date": "2026-01-15",
        "subtotal": 850.0, "discount_pct": 15.0
    })
    assert r.status_code == 200
    note = r.json()
    assert note["total_final"] == 722.5
    assert note["paid"] == 0
    assert note["balance"] == 722.5
    assert note["payment_status"] == "pendiente"
    nid = note["id"]

    # GET note detail
    r = session.get(f"{API}/notes/{nid}")
    assert r.status_code == 200
    assert r.json()["total_final"] == 722.5

    # Add partial abono
    r = session.post(f"{API}/notes/{nid}/abonos", json={"date": "2026-01-16", "amount": 200})
    assert r.status_code == 200
    n = r.json()
    assert n["paid"] == 200.0
    assert n["balance"] == 522.5
    assert n["payment_status"] == "pendiente"

    # Add abono to pay balance (722.5 total - 200 -> 522.5 remaining)
    r = session.post(f"{API}/notes/{nid}/abonos", json={"date": "2026-01-17", "amount": 522.5})
    assert r.status_code == 200
    n = r.json()
    assert n["paid"] == 722.5
    assert n["balance"] == 0.0
    assert n["payment_status"] == "pagado"
    abono_id = n["abonos"][-1]["id"]

    # Check order summary reflects cobrado
    r = session.get(f"{API}/orders/{oid}")
    assert r.status_code == 200
    o = r.json()
    assert o["cobrado"] == 722.5
    assert o["total_clientes"] == 722.5
    assert o["pendiente_cobrar"] == 0.0
    # ganancia = cobrado - cost = 722.5 - 1000 = -277.5
    assert o["ganancia"] == -277.5
    assert o["notes_count"] == 1

    # Delete abono -> balance should return
    r = session.delete(f"{API}/notes/{nid}/abonos/{abono_id}")
    assert r.status_code == 200
    n = r.json()
    assert n["paid"] == 200.0
    assert n["payment_status"] == "pendiente"

    # Toggle delivered on note
    r = session.patch(f"{API}/notes/{nid}", json={"delivered": True})
    assert r.status_code == 200
    assert r.json()["delivered"] is True

    # Toggle delivered on order
    r = session.patch(f"{API}/orders/{oid}", json={"delivered": True, "cost": 1500.0})
    assert r.status_code == 200
    assert r.json()["delivered"] is True
    assert r.json()["cost"] == 1500.0

    # Update note discount -> total recomputes
    r = session.patch(f"{API}/notes/{nid}", json={"discount_pct": 0})
    assert r.status_code == 200
    assert r.json()["total_final"] == 850.0

    # Month detail includes this order with orders list
    r = session.get(f"{API}/months/{test_month}")
    assert r.status_code == 200
    md = r.json()
    assert any(o["id"] == oid for o in md["orders"])

    # Delete note -> order should have 0 notes
    r = session.delete(f"{API}/notes/{nid}")
    assert r.status_code == 200
    r = session.get(f"{API}/orders/{oid}")
    assert r.json()["notes_count"] == 0

    # 404 for deleted note
    r = session.get(f"{API}/notes/{nid}")
    assert r.status_code == 404

    # Delete order cascades (no notes anyway)
    r = session.delete(f"{API}/orders/{oid}")
    assert r.status_code == 200
    r = session.get(f"{API}/orders/{oid}")
    assert r.status_code == 404


def test_cascade_delete_month(session):
    # Create month with order + note
    r = session.post(f"{API}/months", json={"year": 2097, "month": 4})
    mid = r.json()["id"]
    oid = session.post(f"{API}/orders", json={"month_id": mid, "name": "TEST_C", "cost": 100}).json()["id"]
    nid = session.post(f"{API}/notes", json={
        "order_id": oid, "client_name": "TEST_X", "date": "2026-01-01",
        "subtotal": 100, "discount_pct": 0
    }).json()["id"]

    # Delete month -> order and note should be gone
    r = session.delete(f"{API}/months/{mid}")
    assert r.status_code == 200
    assert session.get(f"{API}/orders/{oid}").status_code == 404
    assert session.get(f"{API}/notes/{nid}").status_code == 404


# -------- Global Summary --------

def test_global_summary(session):
    r = session.get(f"{API}/summary")
    assert r.status_code == 200
    s = r.json()
    for k in ["months", "total_ganancia", "total_cobrado", "total_pendiente",
              "total_clientes", "total_costo"]:
        assert k in s
    # ganancia = cobrado - costo
    expected = round(s["total_cobrado"] - s["total_costo"], 2)
    assert abs(s["total_ganancia"] - expected) < 0.01


# -------- 404 cases --------

def test_404_cases(session):
    assert session.get(f"{API}/months/nope").status_code == 404
    assert session.get(f"{API}/orders/nope").status_code == 404
    assert session.get(f"{API}/notes/nope").status_code == 404
    assert session.patch(f"{API}/orders/nope", json={"name": "x"}).status_code == 404
    assert session.patch(f"{API}/notes/nope", json={"delivered": True}).status_code == 404
