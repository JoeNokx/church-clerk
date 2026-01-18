
---

# 📘 BACKEND README  
`/backend/README.md`

```md
# Church Clerk Backend API 🧠

This is the **core backend service** for the Church Clerk system.

It provides:
- Authentication
- Church onboarding
- Multi-tenant data isolation
- Role-based access
- HQ ↔ Branch management

---

## 🚀 Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- Cookie Authentication

---

## 📁 Folder Structure

```txt
backend/
│
├── controllers/      # Business logic
├── models/           # Mongoose schemas
├── routes/           # API routes
├── middleware/       # Auth & tenant guards
├── config/           # DB & env config
├── server.js         # App entry point
└── README.md
