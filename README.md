# Lead CRM Pro

A modern full-stack CRM application built to manage leads, follow-ups, team members, sales activity, and performance analytics from one clean workspace.

Lead CRM Pro is designed for sales teams that need a simple, professional, and role-based lead management system. It includes authentication, admin/user access control, lead tracking, follow-up scheduling, checklist management, dashboard analytics, and a polished React interface.

---

## Overview

Lead CRM Pro helps teams manage their complete lead workflow:

- Capture and organize leads
- Assign leads to sales personnel
- Track lead source, status, and type
- Schedule and manage follow-ups
- Maintain value-added activity checklists
- View dashboard insights and conversion metrics
- Manage users and roles through admin access

The project is built with a clear separation between frontend and backend, making it easier to maintain, extend, and deploy.

---

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Axios
- Tailwind CSS
- Recharts
- Lucide React Icons

### Backend

- FastAPI
- SQLAlchemy
- Pydantic
- MySQL
- JWT Authentication
- Passlib / Bcrypt
- Uvicorn

---

## Key Features

### Authentication and Role-Based Access

- Secure login using JWT tokens
- Admin and sales personnel roles
- Protected API routes
- Role-based visibility for leads, follow-ups, and users

### Lead Management

- Create, update, search, filter, and delete leads
- Track lead source, lead status, and lead type
- Assign leads to sales personnel
- Prevent duplicate leads by phone number
- Maintain lead status history

### Follow-Up Management

- Schedule follow-ups for leads
- Track pending, completed, and rescheduled follow-ups
- Mark follow-ups as complete
- View upcoming follow-up activity
- Identify overdue follow-ups

### Value Adder Checklist

Track important sales touchpoints such as:

- Initial call
- Call script
- SMS
- WhatsApp
- Email
- Video content
- Case study
- Testimonial
- Newsletter

### Dashboard and Analytics

- Total leads
- New leads
- Interested leads
- Booked leads
- Converted leads
- Cancelled leads
- Conversion rate
- Leads by source
- Leads by status
- Leads by type
- Salesperson performance
- Lead trend over time

### Admin User Management

- Create users
- View users
- Update user details
- Reset passwords
- Toggle account status
- Delete users

---

## Project Structure

```txt
lead-crm-pro/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── security.py
│   ├── seed.py
│   ├── requirements.txt
│   │
│   └── routers/
│       ├── auth.py
│       ├── dashboard.py
│       ├── followups.py
│       ├── leads.py
│       ├── users.py
│       └── value_adders.py
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── index.css
│   │   │
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx
│   │   │
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── LeadForm.jsx
│   │   │   ├── FollowupForm.jsx
│   │   │   └── UserForm.jsx
│   │   │
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Leads.jsx
│   │       ├── Followups.jsx
│   │       └── Users.jsx
│
└── README.md