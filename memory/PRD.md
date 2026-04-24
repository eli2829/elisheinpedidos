# Mis Pedidos SHEIN — PRD

## Problem Statement
App en español (MXN) para gestionar pedidos tipo SHEIN. Estructura: Meses → Pedidos → Notas (clientes) → Abonos (pagos parciales). Debe calcular automáticamente descuentos, ganancia por pedido/mes y estado de pago (pagado/pendiente) basado en abonos reales.

## User Choices (Feb 2026)
- Sin login (uso personal)
- Moneda: MXN
- Descuentos: presets (0, 5, 10, 15, 20, 25, 30%) + campo libre
- Diseño: minimalista + colorido/juvenil (coral #FF4D6D + lavanda, Outfit/DM Sans)
- Seed data habilitada

## Architecture
- Backend: FastAPI + MongoDB (motor). 3 colecciones: months, orders, notes (abonos embebidos).
- Frontend: React 19 + React Router 7 + Tailwind + Shadcn UI + Sonner toasts + Lucide icons. Mobile-first max-w-md.
- Cálculos server-side para consistencia:
  - note.total_final = subtotal * (1 - discount_pct/100)
  - note.paid = sum(abonos), balance = total_final - paid, payment_status basado en balance ≤ 0.009
  - order.ganancia = cobrado - cost (dinero real cobrado, no potencial)
  - month aggrega todas las órdenes

## Endpoints (/api)
- Months: GET/POST /months, GET/DELETE /months/{id}
- Orders: POST /orders, GET/PATCH/DELETE /orders/{id}
- Notes: POST /notes, GET/PATCH/DELETE /notes/{id}
- Abonos: POST /notes/{id}/abonos, DELETE /notes/{id}/abonos/{abono_id}
- Summary: GET /summary, POST /seed

## Implemented (Feb 2026)
- [x] Listado de meses con totales y progreso
- [x] Detalle de mes con pedidos, resumen financiero y ganancia mensual
- [x] Detalle de pedido con clientes, delivered checkbox, costo, ganancia
- [x] Detalle de cliente con abonos, estado pagado/pendiente automático
- [x] Dialogo para crear meses/pedidos/notas/abonos (Shadcn Dialog)
- [x] Descuentos con presets y campo libre
- [x] Eliminación en cascada (mes → pedidos → notas → abonos)
- [x] Página de resumen global de ganancias
- [x] Navegación inferior (Meses / Ganancias)
- [x] Seed data automático (2 meses, 3 pedidos, 7 clientes, abonos variados)
- [x] Tests backend pytest: 9/9 PASS
- [x] Tests frontend E2E: PASS en flujos principales

## Personas
- Revendedora pequeña de moda SHEIN que recibe pedidos de clientas, otorga descuentos y cobra en abonos.

## Backlog (P1/P2)
- P1: Exportar resumen mensual como PDF/imagen para WhatsApp
- P1: Gráfica recharts de ganancias por mes en Summary
- P1: Buscador de clientes (historial cross-mes)
- P2: Notas/observaciones por cliente
- P2: Plantilla de mensaje de recordatorio de pago (WhatsApp deep-link)
- P2: Filtro "solo con saldo pendiente" en lista de clientes
- P2: Validación de rangos: discount_pct ∈ [0,100], cost ≥ 0
- P2: Returnear 404 en deletes de IDs inexistentes
- P2: Aria-describedby en Dialogs para accesibilidad
