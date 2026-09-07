# 🏗️ ConstructionERP

A full-stack **Enterprise Resource Planning (ERP)** system purpose-built for the construction industry. It covers the entire project lifecycle — from project creation and BOQ estimation to procurement, inventory, subcontractor management, and financial reporting.

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features & Functionality](#features--functionality)
  - [Authentication & Role-Based Access Control](#1-authentication--role-based-access-control)
  - [Work Center](#2-work-center)
  - [Dashboard](#3-dashboard)
  - [Project Management](#4-project-management)
  - [Bill of Quantities (BOQ)](#5-bill-of-quantities-boq)
  - [Inventory Management](#6-inventory-management)
  - [Procurement](#7-procurement)
  - [Subcontractor Management](#8-subcontractor-management)
  - [Finance](#9-finance)
  - [Reports](#10-reports)
- [Application Flow](#application-flow)
- [API Overview](#api-overview)
- [Getting Started](#getting-started)
- [Permissions Reference](#permissions-reference)

---

## Tech Stack

| Layer             | Technology                                              |
|-------------------|---------------------------------------------------------|
| **Frontend**      | React 18, Vite, React Router v6, Bootstrap 5            |
| **Backend**       | Django 6, Django REST Framework, django-filter          |
| **Database**      | SQLite (dev) / PostgreSQL (prod via psycopg2)           |
| **Auth**          | Django Session Authentication                           |
| **State Mgmt**    | React Context API (`AuthContext`)                       |
| **Styling**       | Bootstrap 5 + Custom CSS (`index.css`)                  |
| **Icons**         | React Icons (Feather set)                               |
| **Notifications** | React Toastify                                          |

---

## Project Structure

```
ConstructionERP/
├── backend/                    # Django REST API
│   ├── apps/
│   │   ├── accounts/           # Auth: login, signup, logout, roles & permissions
│   │   ├── projects/           # Projects & BOQ
│   │   ├── engineering/        # Engineering tasks
│   │   ├── sites/              # Construction sites
│   │   ├── inventory/          # Materials, stock & site consumption
│   │   ├── procurement/        # Material requests, purchase orders & receipts
│   │   ├── contractors/        # Contractor & work order management
│   │   ├── subcontractors/     # Subcontractor lifecycle (work orders → bills)
│   │   ├── finance/            # Cost tracking
│   │   ├── dashboard/          # KPI stats & report endpoints
│   │   ├── workcenter/         # Aggregated operational hub
│   │   └── tasks/              # Task management
│   ├── config/                 # Django settings, URLs, WSGI/ASGI
│   └── requirements.txt
│
└── frontend/                   # React + Vite SPA
    └── src/
        ├── components/         # Reusable UI: Sidebar, Header, DataTable, etc.
        ├── context/            # AuthContext (auth state + permissions)
        ├── layouts/            # ERPLayout (sidebar + content shell)
        ├── pages/              # Full page components (one per module)
        │   └── subcontractors/ # Subcontractor sub-pages
        └── services/           # Axios API service
```

---

## Features & Functionality

### 1. Authentication & Role-Based Access Control

**Login / Signup / Logout** backed by Django session authentication.

- Users are assigned **roles** (e.g., `SUPER_ADMIN`, site engineer, procurement manager).
- Each role carries a granular set of **permissions** (e.g., `projects.view`, `purchase_orders.view`).
- `AuthContext` exposes:
  - `hasPermission(code)` — single permission check
  - `hasAnyPermission(codes)` — OR check
  - `hasAllPermissions(codes)` — AND check
  - `hasRole(roleCode)` — role-level check
- `SUPER_ADMIN` bypasses all permission checks.
- Protected routes (`ProtectedRoute`) redirect unauthenticated users to `/login` and show an **Access Denied** page for insufficient permissions.
- The sidebar is rendered conditionally — users only see sections they have access to.

---

### 2. Work Center

> **Route:** `/work-center`

The operational hub — the first screen a user lands on after login.

- **Project Selector** — filter the entire Work Center view by a specific project.
- **Overview Stats** — key KPIs: active projects, pending requests, pending orders, pending receipts, total spend.
- **Quick Actions** — direct shortcut buttons to common actions (raise a material request, create a PO, etc.).
- **Attention Required** — surface items needing urgent action (overdue tasks, pending approvals).
- **Recent Activity Feed** — chronological activity log across all modules (Material Requests, Purchase Orders, Receipts, Site Consumption, Work Orders, Measurements, Bills).
- **Quick Access Links** — icon-grid shortcuts to all major modules.

---

### 3. Dashboard

> **Route:** `/` (index)

Top-level KPI overview across all projects.

| Stat Card            | Description                           |
|----------------------|---------------------------------------|
| Total Projects       | Count of all projects                 |
| Active Projects      | Projects currently in progress        |
| Delayed Projects     | Projects past their expected end date |
| Active Sites         | Currently operational sites           |
| Pending Tasks        | Open task items                       |
| Low Stock Materials  | Materials below reorder threshold     |
| Total Project Cost   | Sum of all project budgets (₹)        |

- **Recent Alerts** panel highlights low-stock and delayed project warnings in real time.

---

### 4. Project Management

#### Projects
> **Route:** `/projects`

- Full **CRUD** (Create, Read, Update, Delete) for construction projects.
- Fields: Project Code, Name, Client, Location, Description, Start Date, Expected End Date, Estimated Budget, Status (`Planned`, `Active`, `On Hold`, `Completed`, `Cancelled`).
- **Server-side search & filtering** by project name (autocomplete suggestions), status, location, and contract value range.
- **Paginated** data table.
- Click through to a **Project Detail** page (`/projects/:id`) showing a project summary.

---

### 5. Bill of Quantities (BOQ)

> **Route:** `/boq`, `/boq/:id`

- Create BOQs linked to a project with a bill date.
- Add **line items** to each BOQ: select material from the inventory catalog, specify quantity and unit.
- **BOQ List** page: searchable, filterable by project, paginated.
- **BOQ Detail** page: view all line items with quantities, units, and cost breakdown.
- BOQ items are the basis for downstream **Material Requests**.

---

### 6. Inventory Management

#### Materials (Approval)
> **Route:** `/inventory/materials`

- Master catalog of all materials used across projects.
- Add / edit / delete material records (name, code, unit, category, reorder level).
- Permission-gated: only users with `materials.view` can access.

#### Stock
> **Route:** `/inventory/stock`

- **BOQ-based stock summary** per project — shows planned vs. received vs. consumed quantities for each material in a BOQ.
- Filter by project using a combobox search.
- Drill-down modal to see per-BOQ item details.

#### Site Consumption
> **Route:** `/inventory/consumption`

- Record and review **material consumption** at a site level.
- Links consumed quantities back to BOQ items for variance tracking.
- Permission-gated: `site_consumption.view`.

---

### 7. Procurement

The procurement workflow follows a strict linear pipeline:

```
Material Request  ──▶  Purchase Order  ──▶  Material Receipt
```

#### Material Requests
> **Route:** `/procurement/requests`

- Raise a request for materials against a specific **Project** and **BOQ**.
- Each request carries one or more line items (material, quantity, unit, remarks).
- **Status flow:** `Draft` → `Pending` → `Approved` / `Rejected`
- Users with `material_requests.view` can view; additional permissions gate create/edit/delete.
- Combobox project filter + pagination on the list view.
- An approved Material Request can become the basis for a **Purchase Order**.

#### Purchase Orders
> **Route:** `/procurement/orders`

- Create POs linked to a Project and optionally a Material Request.
- Fields: PO Number, Vendor Name, Mobile, Location, Order Date, Expected Delivery Date, Tax %, Remarks, and Line Items (material, qty, unit price).
- View PO detail in a modal with full line-item breakdown.
- Filter by project (combobox) and date.
- **Status:** `Draft`, `Pending`, `Approved`, `Received`.

#### Material Receipts
> **Route:** `/procurement/receipts`

- Record materials physically received against a Purchase Order.
- Specify received quantities per line item; supports **partial receipts**.
- Received stock automatically feeds into the **Stock** module.
- Permission-gated: `material_receipts.view`.

---

### 8. Subcontractor Management

A complete subcontractor lifecycle:

```
Register Subcontractor  ──▶  Assign Work Order  ──▶  Record Measurements  ──▶  Approve  ──▶  Generate Bill
```

#### Subcontractor Registry
> **Route:** `/subcontractors`

- Maintain a directory of subcontractors: name, contact person, mobile, email, address, work category, status.
- Full **CRUD** with inline editing and a details pop-up modal.
- Search by company name or mobile number; paginated list.

#### Work Orders
> **Route:** `/subcontractors/work-orders`, `/subcontractors/work-orders/:id`

- Raise **Work Orders** against a subcontractor for a specific project scope.
- Work Order Detail page shows all tasks, milestones, and linked measurements.
- Permission-gated: `work_orders.view`.

#### Measurement Approval
> **Route:** `/subcontractors/measurements`

- Subcontractors submit measurements for completed work.
- Approvers can **approve or reject** individual measurements.
- Approved measurements unlock bill generation.
- Permission-gated: `measurements.view`.

#### Subcontractor Bills
> **Route:** `/subcontractors/bills`

- Generate bills based on approved measurements.
- Track bill status (draft, submitted, paid).
- Permission-gated: `subcontractor_bills.view`.

---

### 9. Finance

#### Project Costs
> **Route:** `/finance/costs`

- View aggregated cost data per project.
- Tracks **committed costs** (POs raised) vs. **actual spend** (receipts + subcontractor bills).
- Permission-gated: `finance_costs.view`.

---

### 10. Reports

> **Route:** `/finance/reports`

Three built-in report types, all filtered by project:

| Report              | What it shows                                                     |
|---------------------|-------------------------------------------------------------------|
| **BOQ Consumption** | Planned vs. consumed quantities per BOQ line item, % consumed    |
| **PO Status**       | All purchase orders with current status, vendor & total value    |
| **Project Cost**    | Cost breakdown: PO value, material receipts, subcontractor bills |

- Select a project and report type, then click **Generate** to fetch live data.
- All figures displayed in Indian locale format (₹ with `,` separators).

---

## Application Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          User Lands on App                          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────▼────────────────┐
              │     /login  (unauthenticated)    │
              │  Username + Password → Session   │
              └────────────────┬────────────────┘
                               │ Authenticated + Permissions loaded
              ┌────────────────▼─────────────────────────┐
              │         /work-center  (Landing Page)      │
              │  KPI overview • Quick actions • Activity  │
              └───┬───────────────┬──────────────────┬───┘
                  │               │                  │
    ┌─────────────▼──┐  ┌─────────▼─────────┐  ┌───▼──────────────┐
    │Project Mgmt    │  │   Procurement      │  │  Subcontractors  │
    │  /projects     │  │  /requests         │  │  /subcontractors │
    │  /boq          │  │  /orders           │  │  /work-orders    │
    └─────────────┬──┘  │  /receipts         │  │  /measurements   │
                  │     └─────────┬──────────┘  │  /bills          │
    ┌─────────────▼──┐            │             └──────────────────┘
    │  Inventory     │  ┌─────────▼──────────┐
    │  /materials    │  │     Finance        │
    │  /stock        │  │  /costs            │
    │  /consumption  │  │  /reports          │
    └────────────────┘  └────────────────────┘
```

---

## API Overview

All API endpoints are prefixed with `/api/`.

| Prefix                  | Django App      | Key Resources                                       |
|-------------------------|-----------------|-----------------------------------------------------|
| `/api/auth/`            | `accounts`      | login, logout, signup, check, roles, permissions    |
| `/api/projects/`        | `projects`      | projects, BOQs, BOQ items                           |
| `/api/inventory/`       | `inventory`     | materials, project stock, site consumption          |
| `/api/procurement/`     | `procurement`   | material requests, purchase orders, receipts        |
| `/api/subcontractors/`  | `subcontractors`| subcontractors, work orders, measurements, bills    |
| `/api/finance/`         | `finance`       | project costs                                       |
| `/api/dashboard/`       | `dashboard`     | KPI stats, BOQ/PO/cost report endpoints             |
| `/api/work-center/`     | `workcenter`    | aggregated Work Center data                         |
| `/api/sites/`           | `sites`         | construction sites                                  |
| `/api/tasks/`           | `tasks`         | tasks                                               |
| `/api/contractors/`     | `contractors`   | contractors, contractor work orders                 |
| `/api/engineering/`     | `engineering`   | engineering records                                 |

---

## Getting Started

### Prerequisites

- Python ≥ 3.11
- Node.js ≥ 18
- (Optional) PostgreSQL — SQLite is used by default

### Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Create a superuser (admin account)
python manage.py createsuperuser

# Start the development server (runs on port 8000)
python manage.py runserver
```

The API will be available at **`http://localhost:8000/api/`**.

### Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start the Vite dev server (runs on port 5173)
npm run dev
```

The frontend will be available at **`http://localhost:5173`**.

> **Note:** Ensure the Django backend is running before starting the frontend, as the React app proxies API calls to `http://localhost:8000`.

---

## Permissions Reference

| Permission Code            | Module                    |
|----------------------------|---------------------------|
| `projects.view`            | Projects                  |
| `boq.view`                 | Bill of Quantities        |
| `materials.view`           | Materials (Inventory)     |
| `stock.view`               | Stock                     |
| `site_consumption.view`    | Site Consumption          |
| `material_requests.view`   | Material Requests         |
| `purchase_orders.view`     | Purchase Orders           |
| `material_receipts.view`   | Material Receipts         |
| `finance_costs.view`       | Project Costs             |
| `finance_reports.view`     | Reports                   |
| `subcontractors.view`      | Subcontractor Registry    |
| `work_orders.view`         | Subcontractor Work Orders |
| `measurements.view`        | Measurement Approval      |
| `subcontractor_bills.view` | Subcontractor Bills       |

> `SUPER_ADMIN` role has all permissions without any restriction.
