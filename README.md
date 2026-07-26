# HeroLeads CRM - Technical Submission

HeroLeads is an enterprise-grade Lead Management Platform built using **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM (SQLite/PostgreSQL)**. It features Role-Based Access Control (RBAC), a public-facing lead capture form, a premium glassmorphic dashboard for admins and members, detailed lead timelines (notes and activity trails), and a documented REST API.

* **Task B Assessment & Migration Plan**: See [TASK_B_ASSESSMENT.md](file:///c:/job-automation/Digital_hero/TASK_B_ASSESSMENT.md)
* **AI Usage Disclosure**: See [AI_USAGE.md](file:///c:/job-automation/Digital_hero/AI_USAGE.md)
* **Live Deployment URL**: [https://digital-heroes-crm.vercel.app](https://digital-heroes-crm.vercel.app) *(Deployable on any free tier like Vercel with Neon/Supabase)*

---

## 1. Demo Credentials & Roles

The system is seeded with two roles to demonstrate client and server permission checks.

* **Admin Role (Full CRUD & Assign Control)**:
  - **Email**: `admin@example.com`
  - **Password**: `password123`
  - *Permissions*: Can view all leads, create leads manually, reassign owners, change statuses, delete leads, view full audit logs.
* **Member Role (Assigned Leads Only)**:
  - **Email**: `member@example.com`
  - **Password**: `password123`
  - *Permissions*: Can only view leads explicitly assigned to them, update status of assigned leads, and append discussion notes. Cannot delete or reassign leads.

---

## 2. Setup & Local Development

This project uses a zero-config local SQLite database out of the box to ensure that setup, seeding, and automated integration tests run instantly without requiring configuration of PostgreSQL keys.

### Prerequisites
* **Node.js**: `v18.x` or higher
* **npm**: `v9.x` or higher

### Installation & Run Steps

1. **Clone the repository and install dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```
   *(Note: `--legacy-peer-deps` is used to bypass React 19 dependency peer validations on older sub-dependencies.)*

2. **Configure Environment Variables**:
   * Copy `.env.example` to `.env` (or `.env.local`):
     ```bash
     cp .env.example .env
     ```
   * Populate `DATABASE_URL` and `DIRECT_URL` with your Supabase PostgreSQL connection strings.
   * Define a secret for `JWT_SECRET`.

3. **Initialize Database & Generate Client**:
   * Sync your Prisma schemas directly with your Supabase instance:
     ```bash
     node node_modules/prisma/build/index.js db push
     ```

4. **Seed Database Records**:
   * Seed the default roles, initial leads, and audit activity history:
     ```bash
     node prisma/seed.js
     ```

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the landing page. Sign in using the credentials above to access the dashboard.

---

## 3. Running Automated Tests

We use **Vitest** for backend integration tests, verifying auth permission routing and the lead state lifecycle.

To execute tests in execution mode:
```bash
npm run test
```

---

## 4. API Documentation (`/api/v1`)

All private API routes require a valid session context established via the HTTP-only secure cookie `auth_session_token`.

### 1. GET `/api/v1/leads`
* **Description**: Retrieve a list of leads.
* **Access**: Authenticated (ADMIN sees all, MEMBER sees assigned only).
* **Parameters (Query)**:
  - `page`: Page number (default: `1`)
  - `limit`: Number of items per page (default: `10`)
  - `status`: Filter by status (`NEW` | `CONTACTED` | `QUALIFIED` | `LOST` | `WON`)
  - `assignedTo`: User ID to filter by owner (Admin only)
  - `q`: Search keyword (checks company, title, email, case-insensitive)
* **Response (200 OK)**:
  ```json
  {
    "leads": [
      {
        "id": "e4b37014-9988-4e12-876e-5784c1945f34",
        "title": "Cloud Migration Architecture",
        "company": "Microsoft Corp.",
        "contactEmail": "azure-ops@microsoft.com",
        "phone": "+1-555-0202",
        "status": "CONTACTED",
        "assignedToId": "2bf50b1c-99ea-4cfb-8dfb-f06b3f7f89d5",
        "createdAt": "2026-07-26T08:56:11.120Z",
        "updatedAt": "2026-07-26T08:56:11.120Z"
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
  ```
* **Status Codes**:
  - `200`: Success
  - `401`: Unauthorized (no active session)

---

### 2. POST `/api/v1/leads`
* **Description**: Public route to capture new inquiries (from the public landing page).
* **Access**: Public
* **Payload**:
  ```json
  {
    "title": "ERP Consultation Request",
    "company": "Acme Industries",
    "contactEmail": "buyer@acme.com",
    "phone": "+1-555-9000"
  }
  ```
* **Response (201 Created)**: Returns the newly created lead object.
* **Status Codes**:
  - `201`: Created successfully (triggers `LEAD_CREATED` activity log)
  - `400`: Validation failed (missing or invalid email/phone)

---

### 3. GET `/api/v1/leads/[id]`
* **Description**: Retrieve detailed dossier on a single lead, including discussion notes and activity logs.
* **Access**: Authenticated (ADMIN, or MEMBER if assigned).
* **Response (200 OK)**: Detailed lead object containing `notes` (sorted by date) and `activities` (sorted by date).
* **Status Codes**:
  - `200`: Success
  - `401`: Unauthorized
  - `403`: Forbidden (Member accessing a lead owned by someone else)
  - `404`: Lead not found

---

### 4. PATCH `/api/v1/leads/[id]`
* **Description**: Update lead properties.
* **Access**: Authenticated.
  - **ADMIN**: Can edit any property, reassign owners, and update status.
  - **MEMBER**: Can *only* edit `status` on leads assigned to them.
* **Payload**:
  ```json
  {
    "status": "QUALIFIED",
    "assignedToId": "2bf50b1c-99ea-4cfb-8dfb-f06b3f7f89d5"
  }
  ```
* **Response (200 OK)**: Returns the updated lead object.
* **Status Codes**:
  - `200`: Success (creates `STATUS_CHANGE` or `ASSIGNED` activity log)
  - `400`: Validation failed
  - `403`: Forbidden (Member altering fields other than status, or editing unassigned leads)

---

### 5. POST `/api/v1/leads/[id]/notes`
* **Description**: Add a new note log to a lead.
* **Access**: Authenticated (ADMIN, or MEMBER if assigned).
* **Payload**:
  ```json
  {
    "content": "Meeting scheduled for next Friday at 2 PM."
  }
  ```
* **Response (201 Created)**: Returns the note object.
* **Status Codes**:
  - `201`: Note added successfully (creates `NOTE_ADDED` activity log)
  - `403`: Forbidden (Member appending to unassigned leads)

---

### 6. DELETE `/api/v1/leads/[id]`
* **Description**: Permanently delete a lead.
* **Access**: ADMIN role only.
* **Response (200 OK)**:
  ```json
  { "message": "Lead successfully deleted" }
  ```
* **Status Codes**:
  - `200`: Deleted successfully
  - `403`: Forbidden (Member trying to delete a lead)
  - `404`: Lead not found
