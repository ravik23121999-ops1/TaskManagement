# QuickLifeNow - Internal Enterprise Management Platform

A high-performance, production-ready enterprise task management, hierarchy collaboration, and organizational governance system.

![QuickLifeNow Platform](frontend/public/favicon.svg)

---

## 🌟 Technology Stack

### Backend
- **Laravel 12 / 13** (PHP 8.4)
- **Database Support**: MySQL 8+, PostgreSQL 15+, and SQLite
- **Security & Authentication**: Laravel Sanctum with Bearer Token Exchange
- **Architecture**: Multi-Branch Hierarchical Task Orchestration, Real-time Activity Logging, Defensively Guarded RESTful API

### Frontend
- **React 19 + TypeScript**
- **Build Engine**: Vite (Ultra-fast ESM bundler)
- **Styling**: Tailwind CSS v4 + Glassmorphism UI
- **Typography**: Google Font Outfit
- **Icons**: Lucide Icons
- **State & Data**: TanStack Query & Axios Interceptors

### Production & Cloud Deployment
- **Container**: Multi-Stage Docker Build (`node:20-bookworm-slim` + `php:8.4-fpm-alpine` + `nginx` + `supervisord`)
- **Hosting**: Render.com Blueprint (`render.yaml`) & Docker Web Service
- **Health Checks**: Built-in `/up` route for automated zero-downtime health monitoring

---

## 🚀 Key Features

1. **Multi-Branch Task Delegation & Collaboration**
   - Direct Assignee-to-Creator feedback loops.
   - Sub-branch delegation with deep ancestor hierarchy visibility.
   - Peer communication isolation (assignees only view their branch and overseer communication).

2. **Enterprise Branch Messaging with Attachments**
   - Instant deliverable exchange with dedicated document uploads (`.pdf`, `.png`, `.jpg`, `.zip`, `.doc`).
   - Authenticated stream downloads preventing unauthorized direct access.

3. **Multi-Stage Review & SLA Workflow**
   - Structured submission gate with approval, revision requests, or conditional rejection.
   - Hold & Resume workflows with mandatory audit notes.
   - Task cancellation safeguards with role-based administrative permissions.

4. **Role-Based Access Control (RBAC)**
   - **Admin**: Full administrative command, system settings management, user creation, department configuration, permanent deletion.
   - **Sub-Admin**: Departmental oversight, delegated review management, optional delete & cancel capabilities governed by Admin switch.
   - **Employee**: Focused work dashboard, branch deliverables, task messaging, work log inspection.

5. **Work Logs & Complete Audit Dossier**
   - End-to-end task journey inspection tracking creation to final completion.
   - Exportable PDF testing and setup guides.

6. **100% Modern Non-Blocking UI**
   - Zero raw browser alerts (`window.alert`, `window.confirm`, `window.prompt` completely eliminated).
   - Auto-dismissing glassmorphic toasts and custom modal confirmation dialogs.

---

## 👥 Default Demo Credentials

All test accounts use the password: `password`

| Role | Name | Email | Department |
| :--- | :--- | :--- | :--- |
| **Admin** | Admin User | `admin@example.com` | IT Infrastructure |
| **Admin** | Ravi Singh | `ravi@company.com` | IT Infrastructure |
| **Sub-Admin** | Priya Sharma | `priya@company.com` | Operations & Facilities |
| **Employee** | Karan Sharma | `karan@gmail.com` | IT Infrastructure |
| **Employee** | Aman Verma | `aman@company.com` | IT Infrastructure |
| **Employee** | Neha Kapoor | `neha@company.com` | Human Resources |
| **Employee** | Rohit Mehta | `rohit@company.com` | Sales & Growth |

---

## 🛠️ Local Development Setup

### Prerequisites
- PHP 8.4+ with `pdo`, `mbstring`, `fileinfo`, `gd`, `zip` extensions
- Composer 2+
- Node.js 20+ & npm
- MySQL 8.0+ or SQLite

### 1. Clone & Setup Backend
```bash
git clone https://github.com/ravik23121999-ops1/TaskManagement.git
cd TaskManagement/backend

cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```
Backend runs at: `http://localhost:8000`

### 2. Setup Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Frontend runs at: `http://localhost:5173`

---

## ☁️ Deployment on Render.com

This repository includes a production-ready `Dockerfile` and `render.yaml` configured for zero-configuration deployment on **Render.com**.

### Option A: 1-Click Blueprint Deploy (Recommended)
1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Blueprint**.
3. Connect this GitHub repository: `https://github.com/ravik23121999-ops1/TaskManagement`.
4. Render will read `render.yaml` and provision:
   - A **Docker Web Service** (`quicklifenow-app`) with Nginx + PHP 8.4 FPM + React SPA.
   - A managed **PostgreSQL Database** (`quicklifenow-db`).
5. Click **Apply**.
6. The container automatically runs migrations and seeds default demo data on first startup.

### Option B: Deploy as a Standalone Web Service
1. Click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Choose **Docker** as the Runtime.
4. Set the Health Check Path to: `/up`.
5. Under **Environment Variables**, set:
   - `APP_NAME` = `QuickLifeNow`
   - `APP_ENV` = `production`
   - `APP_DEBUG` = `false`
   - `APP_KEY` = *(Click Generate or run `php artisan key:generate --show`)*
   - `RUN_SEEDER` = `true`
   - `DB_CONNECTION` = `sqlite` *(or `pgsql` if linking external database)*
6. Click **Create Web Service**. Render builds the multi-stage Docker container and launches your app!

---

## 🧪 Testing & Verification

Run the comprehensive PHPUnit test suite:
```bash
cd backend
php vendor/bin/phpunit
```
*Current test suite: 37/37 passed, 322 assertions, 0 errors.*

Build the production frontend bundle:
```bash
cd frontend
npm run build
```
*Compiled with 0 TypeScript errors and optimized Rollup chunks.*

---

## 📄 License
Internal Enterprise Management - QuickLifeNow. All rights reserved.
