# Church Clerk System 🏛️

Church Clerk is a **multi-tenant church management system** designed to support
Independent churches, Headquarters, and Branch structures.

The system is built as a **full-stack application** with:
- **Backend API** (Node.js, Express, MongoDB)
- **Frontend Web App** (React + Vite + Tailwind CSS)

---

## 🧠 Core Concepts

- **Multi-tenant architecture**
- **Church-scoped data isolation**
- **Role-based access control**
- **HQ → Branch hierarchy**
- **Onboarding-first user flow**

> A user **cannot be active** in the system without belonging to a church.  
> A church **must always have a creator user**.

---

## 📁 Project Structure

```txt
church-clerk/
│
├── backend/            # Node.js / Express API
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── config/
│   ├── server.js
│   └── README.md
│
├── frontend/           # React + Vite + Tailwind
│   ├── src/
│   ├── public/
│   └── README.md
│
└── README.md           # You are here
