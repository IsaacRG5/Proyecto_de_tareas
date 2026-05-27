const API_URL = "http://localhost:3000";

const Session = {
  save(user) {
    sessionStorage.setItem("riwiflow_user", JSON.stringify(user));
  },
  get() {
    const raw = sessionStorage.getItem("riwiflow_user");
    return raw ? JSON.parse(raw) : null;
  },
  clear() {
    sessionStorage.removeItem("riwiflow_user");
  },
  isLoggedIn() {
    return !!this.get();
  },
  isAdmin() {
    const u = this.get();
    return u && u.role === "admin";
  },
};

const Api = {
  async getUsers() {
    const res = await fetch(`${API_URL}/users`);
    return res.json();
  },
  async getTasks() {
    const res = await fetch(`${API_URL}/tasks`);
    return res.json();
  },
  async createTask(task) {
    const res = await fetch(`${API_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    return res.json();
  },
  async updateTask(id, data) {
    const res = await fetch(`${API_URL}/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteTask(id) {
    await fetch(`${API_URL}/tasks/${id}`, { method: "DELETE" });
  },
};

const isLoginPage = () => document.getElementById("loginForm") !== null;
const isBoardPage = () => document.querySelector(".kanban-column") !== null;


function guardRoutes() {
  if (isLoginPage() && Session.isLoggedIn()) {
    window.location.href = "board.html";
  }
  if (isBoardPage() && !Session.isLoggedIn()) {
    window.location.href = "login.html";
  }
}

function initLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const errorEl = createErrorEl();
  form.appendChild(errorEl);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const users = await Api.getUsers();
      const user = users.find(
        (u) => u.email === email && u.password === password
      );

      if (user) {
        Session.save(user);
        window.location.href = "board.html";
      } else {
        showError(errorEl, "Invalid email or password. Please try again.");
      }
    } catch {
      showError(
        errorEl,
        "Could not connect to server. Make sure json-server is running on port 3000."
      );
    }
  });
}

function createErrorEl() {
  const div = document.createElement("div");
  div.className =
    "hidden mt-2 p-3 bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm";
  return div;
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

const STATUSES = ["todo", "in progress", "in review", "done"];

const STATUS_LABELS = {
  "todo": "To Do",
  "in progress": "In Progress",
  "in review": "In Review",
  "done": "Done",
};

const COLUMN_HEADERS = {
  "todo": "To Do",
  "in progress": "In Progress",
  "in review": "In Review",
  "done": "Done",
};

async function initBoard() {
  const user = Session.get();

  renderTopBar(user);

  if (Session.isAdmin()) {
    renderNewTaskButton();
  }

  await renderBoard();

  injectModal();
}

function renderTopBar(user) {
  const header = document.querySelector("header");
  if (!header) return;

  const badge = document.createElement("span");
  badge.className =
    "font-label-md text-label-md text-on-surface-variant hidden md:block";
  badge.textContent = `${user.name} (${user.role})`;

  const logoutBtn = document.createElement("button");
  logoutBtn.className =
    "flex items-center gap-1 text-error font-label-md text-label-md hover:underline ml-2";
  logoutBtn.innerHTML = `<span class="material-symbols-outlined text-sm">logout</span> Logout`;
  logoutBtn.addEventListener("click", () => {
    Session.clear();
    window.location.href = "login.html";
  });

  const actions = header.querySelector(".flex.items-center.gap-4.ml-4");
  if (actions) {
    actions.insertBefore(badge, actions.firstChild);
    actions.appendChild(logoutBtn);
  }
}

function renderNewTaskButton() {
  const sideBtn = document.querySelector("aside button");
  if (!sideBtn) return;
  sideBtn.textContent = "";
  sideBtn.innerHTML = `<span class="material-symbols-outlined" style="margin-right:6px">add</span> New Task`;
  sideBtn.addEventListener("click", () => openTaskModal());
}

function getColumnContainer(status) {
  const h3s = document.querySelectorAll(".kanban-column h3");
  for (const h3 of h3s) {
    if (h3.textContent.trim() === COLUMN_HEADERS[status]) {
      return h3.closest(".kanban-column").querySelector(".flex-1.space-y-md");
    }
  }
  return null;
}

async function renderBoard() {
  const [tasks, users] = await Promise.all([Api.getTasks(), Api.getUsers()]);
  const currentUser = Session.get();

  document.querySelectorAll(".kanban-column .flex-1.space-y-md").forEach((col) => {
    col.innerHTML = "";
  });

  STATUSES.forEach((status) => {
    const count = tasks.filter((t) => t.status === status).length;
    const h3 = [...document.querySelectorAll(".kanban-column h3")].find(
      (h) => h.textContent.trim() === COLUMN_HEADERS[status]
    );
    if (h3) {
      const badge = h3.nextElementSibling;
      if (badge) badge.textContent = count;
    }
  });

  tasks.forEach((task) => {
    const assignedUser = users.find((u) => u.id === task.userId);
    // HU-05: admin can edit all | HU-06: coder can only edit their own
    const canEdit =
      Session.isAdmin() ||
      (currentUser.role === "coder" && task.userId === currentUser.id);

    const container = getColumnContainer(task.status);
    if (!container) return;

    const card = buildTaskCard(task, assignedUser, canEdit);
    container.appendChild(card);
  });
}

function buildTaskCard(task, assignedUser, canEdit) {
  const isDone = task.status === "done";
  const card = document.createElement("div");
  card.className = `task-card bg-surface border border-outline-variant rounded-xl p-md shadow-sm${isDone ? " opacity-80" : ""}`;
  card.dataset.taskId = task.id;

  const titleClass = `font-label-md text-label-md text-on-surface mb-xs${isDone ? " line-through" : ""}`;

  card.innerHTML = `
    <div class="flex items-start justify-between mb-xs">
      <span class="bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded-full font-label-sm text-label-sm">
        ${escapeHtml(STATUS_LABELS[task.status] || task.status)}
      </span>
      ${isDone ? `<span class="material-symbols-outlined text-sm" style="font-variation-settings:'FILL' 1;color:#8f4200">check_circle</span>` : ""}
    </div>
    <h4 class="${titleClass}">${escapeHtml(task.title)}</h4>
    <p class="font-body-sm text-body-sm text-on-surface-variant">${escapeHtml(task.description)}</p>
    <div class="mt-md flex items-center justify-between">
      <span class="font-label-sm text-label-sm text-on-surface-variant">
        ${assignedUser ? `👤 ${escapeHtml(assignedUser.name)}` : "Unassigned"}
      </span>
      <div class="flex gap-2">
        ${canEdit ? `<button class="edit-btn text-primary font-label-sm text-label-sm hover:underline" data-id="${task.id}">Edit</button>` : ""}
        ${Session.isAdmin() ? `<button class="delete-btn text-error font-label-sm text-label-sm hover:underline" data-id="${task.id}">Delete</button>` : ""}
      </div>
    </div>
  `;

  if (canEdit) {
    card.querySelector(".edit-btn")?.addEventListener("click", () =>
      openTaskModal(task)
    );
  }

  if (Session.isAdmin()) {
    card.querySelector(".delete-btn")?.addEventListener("click", async () => {
      if (confirm(`Delete task "${task.title}"?`)) {
        await Api.deleteTask(task.id);
        await renderBoard();
      }
    });
  }

  return card;
}

function injectModal() {
  if (document.getElementById("riwiflow-modal")) return;

  const overlay = document.createElement("div");
  overlay.id = "riwiflow-modal";
  overlay.className =
    "fixed inset-0 z-50 flex items-center justify-center bg-black/40 hidden";

  overlay.innerHTML = `
    <div class="bg-surface rounded-xl shadow-xl p-xl w-full max-w-md mx-4 space-y-lg relative">
      <button id="modal-close" class="absolute top-4 right-4 material-symbols-outlined text-outline hover:text-on-surface">close</button>
      <h2 id="modal-title" class="font-headline-md text-headline-md text-on-surface">New Task</h2>
      <div class="space-y-md" id="modal-form">
        <!-- Title -->
        <div class="space-y-sm" id="field-title">
          <label class="font-label-md text-label-md text-on-surface" id="label-title">Title</label>
          <input id="modal-task-title" type="text" placeholder="Task title"
            class="w-full px-md py-md bg-white border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"/>
        </div>
        <!-- Description -->
        <div class="space-y-sm">
          <label class="font-label-md text-label-md text-on-surface">Description</label>
          <textarea id="modal-task-desc" rows="3" placeholder="Task description"
            class="w-full px-md py-md bg-white border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"></textarea>
        </div>
        <!-- Status (HU-07) -->
        <div class="space-y-sm">
          <label class="font-label-md text-label-md text-on-surface">Status</label>
          <select id="modal-task-status"
            class="w-full px-md py-md bg-white border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary">
            <option value="todo">To Do</option>
            <option value="in progress">In Progress</option>
            <option value="in review">In Review</option>
            <option value="done">Done</option>
          </select>
        </div>
        <!-- Assigned User — admin only (HU-03, HU-05) -->
        <div class="space-y-sm hidden" id="field-user">
          <label class="font-label-md text-label-md text-on-surface">Assign to</label>
          <select id="modal-task-user"
            class="w-full px-md py-md bg-white border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary">
          </select>
        </div>
        <!-- Error message -->
        <div id="modal-error" class="hidden p-3 bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm"></div>
        <!-- Submit -->
        <button id="modal-submit"
          class="w-full bg-primary hover:opacity-90 text-on-primary font-label-md text-label-md py-md px-lg rounded-lg transition-all flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-sm">save</span>
          Save Task
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("modal-close").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
}

let _editingTaskId = null;

async function openTaskModal(task = null) {
  _editingTaskId = task ? task.id : null;

  const modal = document.getElementById("riwiflow-modal");
  const isAdmin = Session.isAdmin();

  document.getElementById("modal-title").textContent = task
    ? "Edit Task"
    : "New Task";

  const fieldUser  = document.getElementById("field-user");
  const titleInput = document.getElementById("modal-task-title");
  const labelTitle = document.getElementById("label-title");

  if (isAdmin) {
    // Admin: show user selector, title is editable (HU-03, HU-05)
    fieldUser.classList.remove("hidden");
    titleInput.removeAttribute("readonly");
    titleInput.classList.remove("bg-surface-container", "cursor-not-allowed");

    // Remove lock icon if present from a previous coder session
    labelTitle.querySelector(".lock-icon")?.remove();

    const users = await Api.getUsers();
    const userSelect = document.getElementById("modal-task-user");
    userSelect.innerHTML = users
      .map((u) => `<option value="${u.id}">${escapeHtml(u.name)} (${u.role})</option>`)
      .join("");
    if (task) userSelect.value = task.userId;

  } else {
    fieldUser.classList.add("hidden");
    titleInput.setAttribute("readonly", "readonly");
    titleInput.classList.add("bg-surface-container", "cursor-not-allowed");

    if (!labelTitle.querySelector(".lock-icon")) {
      const lock = document.createElement("span");
      lock.className = "lock-icon material-symbols-outlined text-outline ml-1";
      lock.style.fontSize = "14px";
      lock.style.verticalAlign = "middle";
      lock.title = "You cannot edit this field";
      lock.textContent = "lock";
      labelTitle.appendChild(lock);
    }
  }

  if (task) {
    titleInput.value = task.title;
    document.getElementById("modal-task-desc").value = task.description;
    document.getElementById("modal-task-status").value = task.status;
  } else {
    titleInput.value = "";
    document.getElementById("modal-task-desc").value = "";
    document.getElementById("modal-task-status").value = "todo";
  }

  document.getElementById("modal-error").classList.add("hidden");

  const submitBtn = document.getElementById("modal-submit");
  const newBtn = submitBtn.cloneNode(true);
  submitBtn.replaceWith(newBtn);
  newBtn.addEventListener("click", handleModalSubmit);

  modal.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("riwiflow-modal").classList.add("hidden");
  _editingTaskId = null;
}


function isValidStatus(status) {
  return STATUSES.includes(status);
}


async function validateEditPermission(taskId) {
  const currentUser = Session.get();
  if (!currentUser) {
    return { allowed: false, reason: "Session expired. Please log in again." };
  }


  if (currentUser.role === "admin") return { allowed: true, reason: "" };

  // Coder: cannot create (HU-06)
  if (!taskId) {
    return { allowed: false, reason: "Coders cannot create tasks." };
  }


  try {
    const tasks = await Api.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return { allowed: false, reason: "Task not found." };
    if (task.userId !== currentUser.id) {
      return { allowed: false, reason: "You can only edit tasks assigned to you." };
    }
  } catch {
    return { allowed: false, reason: "Could not verify task ownership. Try again." };
  }

  return { allowed: true, reason: "" };
}


async function handleModalSubmit() {
  const errorEl = document.getElementById("modal-error");
  errorEl.classList.add("hidden");

  const title       = document.getElementById("modal-task-title").value.trim();
  const description = document.getElementById("modal-task-desc").value.trim();
  const status      = document.getElementById("modal-task-status").value;
  const isAdmin     = Session.isAdmin();

  if (!isValidStatus(status)) {
    errorEl.textContent = `Invalid status "${status}". Allowed: ${STATUSES.join(", ")}.`;
    errorEl.classList.remove("hidden");
    return;
  }


  if (isAdmin && !title) {
    errorEl.textContent = "Title is required.";
    errorEl.classList.remove("hidden");
    return;
  }


  if (!description) {
    errorEl.textContent = "Description is required.";
    errorEl.classList.remove("hidden");
    return;
  }

  const { allowed, reason } = await validateEditPermission(_editingTaskId);
  if (!allowed) {
    errorEl.textContent = reason;
    errorEl.classList.remove("hidden");
    return;
  }

  try {
    if (_editingTaskId) {
      // Edit mode
      const updates = { description, status };
      if (isAdmin) {
        updates.title  = title;
        updates.userId = Number(document.getElementById("modal-task-user").value);
      }
      await Api.updateTask(_editingTaskId, updates);
    } else {
      // Create mode — admin only (HU-03)
      const userId = Number(document.getElementById("modal-task-user").value);
      await Api.createTask({ title, description, status, userId });
    }

    closeModal();
    await renderBoard();
  } catch {
    errorEl.textContent = "Server error. Make sure json-server is running.";
    errorEl.classList.remove("hidden");
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


document.addEventListener("DOMContentLoaded", () => {
  guardRoutes();

  if (isLoginPage()) initLogin();
  if (isBoardPage()) initBoard();
});