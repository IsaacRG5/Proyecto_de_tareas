const STATUSES = ["todo", "in progress", "in review", "done"];

const STATUS_LABELS = {
  "todo":        "To Do",
  "in progress": "In Progress",
  "in review":   "In Review",
  "done":        "Done"
};

const COLUMN_HEADERS = {
  "todo":        "To Do",
  "in progress": "In Progress",
  "in review":   "In Review",
  "done":        "Done"
};

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isLoginPage() {
  return document.getElementById("loginForm") !== null;
}

function isBoardPage() {
  return document.querySelector(".kanban-column") !== null;
}

function generateId() {
  return Date.now();
}

const Session = {
  save(user) {
    sessionStorage.setItem("riwiflow_user", JSON.stringify(user));
  },
  get() {
    const data = sessionStorage.getItem("riwiflow_user");
    return data ? JSON.parse(data) : null;
  },
  clear() {
    sessionStorage.removeItem("riwiflow_user");
  },
  isLoggedIn() {
    return !!this.get();
  },
  isAdmin() {
    const user = this.get();
    return !!(user && user.role === "admin");
  }
};

const API_URL = "http://localhost:3000";

const Api = {
  async getUsers() {
    const res = await fetch(API_URL + "/users");
    return res.json();
  },
  async createUser(userData) {
    const res = await fetch(API_URL + "/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    });
    return res.json();
  },
  async getTasks() {
    const res = await fetch(API_URL + "/tasks");
    return res.json();
  },
  async createTask(task) {
    const res = await fetch(API_URL + "/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task)
    });
    return res.json();
  },
  async updateTask(id, data) {
    const res = await fetch(API_URL + "/tasks/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async deleteTask(id) {
    await fetch(API_URL + "/tasks/" + id, { method: "DELETE" });
  }
};

function guardRoutes() {
  if (isLoginPage() && Session.isLoggedIn()) {
    window.location.href = "board.html";
    return;
  }
  if (isBoardPage() && !Session.isLoggedIn()) {
    window.location.href = "login.html";
  }
}