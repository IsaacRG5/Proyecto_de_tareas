// ======================================================
// MODULE: utils.js
// ======================================================

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

// ======================================================
// MODULE: session.js
// ======================================================

const Session = {

  save(user) {
    sessionStorage.setItem("riwiflow_user", JSON.stringify(user));
  },

  get() {
    const guardado = sessionStorage.getItem("riwiflow_user");
    return guardado ? JSON.parse(guardado) : null;
  },

  clear() {
    sessionStorage.removeItem("riwiflow_user");
  },

  isLoggedIn() {
    return !!this.get();
  },

  isAdmin() {
    const usuario = this.get();
    return !!(usuario && usuario.role === "admin");
  }

};

// ======================================================
// MODULE: api.js
// ======================================================

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

// ======================================================
// MODULE: router.js
// ======================================================

function guardRoutes() {
  if (isLoginPage() && Session.isLoggedIn()) {
    window.location.href = "board.html";
    return;
  }
  if (isBoardPage() && !Session.isLoggedIn()) {
    window.location.href = "login.html";
  }
}

// ======================================================
// MODULE: login.js
// ======================================================

function createErrorEl() {
  const div = document.createElement("div");
  div.className = "hidden mt-2 p-3 bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm";
  return div;
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

function hideError(el) {
  el.textContent = "";
  el.classList.add("hidden");
}

function initLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const errorEl = createErrorEl();
  form.appendChild(errorEl);

  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    hideError(errorEl);

    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const users = await Api.getUsers();
      let usuarioEncontrado = null;

      for (let i = 0; i < users.length; i++) {
        if (users[i].email === email && users[i].password === password) {
          usuarioEncontrado = users[i];
          break;
        }
      }

      if (usuarioEncontrado) {
        Session.save(usuarioEncontrado);
        window.location.href = "board.html";
      } else {
        showError(errorEl, "Invalid email or password.");
      }
    } catch (err) {
      showError(errorEl, "Could not connect to server.");
    }
  });
}

// ======================================================
// MODULE: admin.js
// Modales exclusivos para rol "admin":
//   · Crear nueva tarea       (abierto desde "New Project")
//   · Editar tarea existente  (abierto desde botón en cada tarjeta)
//   · Crear nuevo usuario
// ======================================================

const MODAL_INPUT_CLASS =
  "w-full px-md py-2 bg-white border border-outline-variant rounded-lg " +
  "font-body-sm text-body-sm text-on-surface focus:outline-none " +
  "focus:border-primary focus:ring-2 focus:ring-primary-fixed transition-all";

// ── Helpers de modal ────────────────────────────────────

function createOverlay(onClose) {
  const overlay = document.createElement("div");
  overlay.id = "admin-modal-overlay";
  overlay.className =
    "fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4";
  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) onClose();
  });
  return overlay;
}

function createModalBox(title) {
  const box = document.createElement("div");
  box.className =
    "bg-surface-container-lowest border border-outline-variant rounded-xl " +
    "shadow-xl w-full max-w-md p-xl space-y-lg";

  const header = document.createElement("div");
  header.className = "flex items-center justify-between";

  const h2 = document.createElement("h2");
  h2.className = "font-headline-md text-headline-md text-on-surface";
  h2.textContent = title;

  const closeBtn = document.createElement("button");
  closeBtn.className =
    "material-symbols-outlined text-outline hover:text-on-surface transition-colors";
  closeBtn.textContent = "close";
  closeBtn.addEventListener("click", closeAdminModal);

  header.appendChild(h2);
  header.appendChild(closeBtn);
  box.appendChild(header);
  return box;
}

function closeAdminModal() {
  const overlay = document.getElementById("admin-modal-overlay");
  if (overlay) overlay.remove();
}

function createField(labelText, inputEl) {
  const wrapper = document.createElement("div");
  wrapper.className = "space-y-xs";

  const label = document.createElement("label");
  label.className = "font-label-md text-label-md text-on-surface block";
  label.textContent = labelText;

  const errorMsg = document.createElement("p");
  errorMsg.className = "hidden font-body-sm text-body-sm text-error mt-xs";

  wrapper.appendChild(label);
  wrapper.appendChild(inputEl);
  wrapper.appendChild(errorMsg);

  return { wrapper, errorMsg };
}

function showSuccessAndClose(msg) {
  const overlay = document.getElementById("admin-modal-overlay");
  if (!overlay) return;

  const box = overlay.querySelector(".bg-surface-container-lowest");
  if (!box) return;

  box.innerHTML =
    '<div class="flex flex-col items-center gap-md py-xl">' +
      '<span class="material-symbols-outlined text-5xl text-primary" ' +
        'style="font-variation-settings:\'FILL\' 1">check_circle</span>' +
      '<p class="font-title-sm text-title-sm text-on-surface text-center">' +
        escapeHtml(msg) +
      "</p>" +
    "</div>";

  setTimeout(closeAdminModal, 1500);
}

// ── Helpers para construir el formulario de tarea ───────

function buildTaskForm(users, prefill = {}) {
  const form = document.createElement("div");
  form.className = "space-y-lg";

  // Título
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.placeholder = "Task title";
  titleInput.className = MODAL_INPUT_CLASS;
  titleInput.value = prefill.title || "";
  const titleField = createField("Title *", titleInput);

  // Descripción
  const descInput = document.createElement("textarea");
  descInput.rows = 3;
  descInput.placeholder = "Describe the task…";
  descInput.className = MODAL_INPUT_CLASS + " resize-none";
  descInput.value = prefill.description || "";
  const descField = createField("Description", descInput);

  // Estado
  const statusSelect = document.createElement("select");
  statusSelect.className = MODAL_INPUT_CLASS;
  for (const s of STATUSES) {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = STATUS_LABELS[s];
    if (s === prefill.status) opt.selected = true;
    statusSelect.appendChild(opt);
  }
  const statusField = createField("Status *", statusSelect);

  // Asignar a
  const assignSelect = document.createElement("select");
  assignSelect.className = MODAL_INPUT_CLASS;
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "— Unassigned —";
  assignSelect.appendChild(defaultOpt);
  for (const u of users) {
    const uOpt = document.createElement("option");
    uOpt.value = u.id;
    uOpt.textContent = u.name + " (" + u.role + ")";
    if (String(u.id) === String(prefill.userId)) uOpt.selected = true;
    assignSelect.appendChild(uOpt);
  }
  const assignField = createField("Assign to", assignSelect);

  // Error general
  const generalError = document.createElement("p");
  generalError.className = "hidden font-body-sm text-body-sm text-error";

  form.appendChild(titleField.wrapper);
  form.appendChild(descField.wrapper);
  form.appendChild(statusField.wrapper);
  form.appendChild(assignField.wrapper);
  form.appendChild(generalError);

  return { form, titleInput, descInput, statusSelect, assignSelect, titleField, generalError };
}

// ── Modal: Nueva Tarea ──────────────────────────────────

async function openNewTaskModal() {
  closeAdminModal();

  let users = [];
  try {
    users = await Api.getUsers();
  } catch (e) {
    console.error("No se pudieron cargar los usuarios:", e);
  }

  const overlay = createOverlay(closeAdminModal);
  const box     = createModalBox("New Task");

  const { form, titleInput, descInput, statusSelect, assignSelect, titleField, generalError } =
    buildTaskForm(users);

  // Botones
  const btnRow = document.createElement("div");
  btnRow.className = "flex gap-md pt-sm";

  const cancelBtn = document.createElement("button");
  cancelBtn.className =
    "flex-1 py-md border border-outline-variant rounded-lg font-label-md " +
    "text-label-md text-on-surface hover:bg-surface-container-low transition-colors";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", closeAdminModal);

  const submitBtn = document.createElement("button");
  submitBtn.className =
    "flex-1 py-md bg-primary text-on-primary rounded-lg font-label-md " +
    "text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm";
  submitBtn.innerHTML =
    '<span class="material-symbols-outlined text-[18px]">add</span> Create Task';

  submitBtn.addEventListener("click", async function() {
    const titleVal = titleInput.value.trim();
    if (!titleVal) {
      titleField.errorMsg.textContent = "Title is required.";
      titleField.errorMsg.classList.remove("hidden");
      return;
    }
    titleField.errorMsg.classList.add("hidden");

    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<span class="material-symbols-outlined text-[18px] animate-spin">autorenew</span> Saving…';

    const newTask = {
      id:          generateId(),
      title:       titleVal,
      description: descInput.value.trim(),
      status:      statusSelect.value,
      userId:      assignSelect.value ? Number(assignSelect.value) : null
    };

    try {
      await Api.createTask(newTask);
      showSuccessAndClose("Task created successfully!");
      setTimeout(async () => { await renderBoard(); }, 1600);
    } catch (err) {
      generalError.textContent = "Could not save task. Check the server.";
      generalError.classList.remove("hidden");
      submitBtn.disabled = false;
      submitBtn.innerHTML =
        '<span class="material-symbols-outlined text-[18px]">add</span> Create Task';
    }
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(submitBtn);
  form.appendChild(btnRow);

  box.appendChild(form);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  titleInput.focus();
}

// ── Modal: Editar Tarea existente ───────────────────────

async function openEditTaskModal(task) {
  closeAdminModal();

  let users = [];
  try {
    users = await Api.getUsers();
  } catch (e) {
    console.error("No se pudieron cargar los usuarios:", e);
  }

  const overlay = createOverlay(closeAdminModal);
  const box     = createModalBox("Edit Task");

  const { form, titleInput, descInput, statusSelect, assignSelect, titleField, generalError } =
    buildTaskForm(users, task);

  // Botones
  const btnRow = document.createElement("div");
  btnRow.className = "flex gap-md pt-sm";

  const cancelBtn = document.createElement("button");
  cancelBtn.className =
    "flex-1 py-md border border-outline-variant rounded-lg font-label-md " +
    "text-label-md text-on-surface hover:bg-surface-container-low transition-colors";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", closeAdminModal);

  const saveBtn = document.createElement("button");
  saveBtn.className =
    "flex-1 py-md bg-primary text-on-primary rounded-lg font-label-md " +
    "text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm";
  saveBtn.innerHTML =
    '<span class="material-symbols-outlined text-[18px]">save</span> Save Changes';

  saveBtn.addEventListener("click", async function() {
    const titleVal = titleInput.value.trim();
    if (!titleVal) {
      titleField.errorMsg.textContent = "Title is required.";
      titleField.errorMsg.classList.remove("hidden");
      return;
    }
    titleField.errorMsg.classList.add("hidden");

    saveBtn.disabled = true;
    saveBtn.innerHTML =
      '<span class="material-symbols-outlined text-[18px] animate-spin">autorenew</span> Saving…';

    const updatedData = {
      title:       titleVal,
      description: descInput.value.trim(),
      status:      statusSelect.value,
      userId:      assignSelect.value ? Number(assignSelect.value) : null
    };

    try {
      await Api.updateTask(task.id, updatedData);
      showSuccessAndClose("Task updated successfully!");
      setTimeout(async () => { await renderBoard(); }, 1600);
    } catch (err) {
      generalError.textContent = "Could not update task. Check the server.";
      generalError.classList.remove("hidden");
      saveBtn.disabled = false;
      saveBtn.innerHTML =
        '<span class="material-symbols-outlined text-[18px]">save</span> Save Changes';
    }
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  form.appendChild(btnRow);

  box.appendChild(form);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  titleInput.focus();
}

// ── Modal: Nuevo Usuario ────────────────────────────────

function openNewUserModal() {
  closeAdminModal();

  const overlay = createOverlay(closeAdminModal);
  const box     = createModalBox("New User");

  const form = document.createElement("div");
  form.className = "space-y-lg";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Full name";
  nameInput.className = MODAL_INPUT_CLASS;
  const nameField = createField("Full Name *", nameInput);

  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.placeholder = "email@company.com";
  emailInput.className = MODAL_INPUT_CLASS;
  const emailField = createField("Email *", emailInput);

  const passInput = document.createElement("input");
  passInput.type = "password";
  passInput.placeholder = "••••••••";
  passInput.className = MODAL_INPUT_CLASS;
  const passField = createField("Password *", passInput);

  // Roles: solo admin o coder
  const roleSelect = document.createElement("select");
  roleSelect.className = MODAL_INPUT_CLASS;
  ["admin", "coder"].forEach(function(r) {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r.charAt(0).toUpperCase() + r.slice(1);
    roleSelect.appendChild(opt);
  });
  const roleField = createField("Role *", roleSelect);

  const generalError = document.createElement("p");
  generalError.className = "hidden font-body-sm text-body-sm text-error";

  const btnRow = document.createElement("div");
  btnRow.className = "flex gap-md pt-sm";

  const cancelBtn = document.createElement("button");
  cancelBtn.className =
    "flex-1 py-md border border-outline-variant rounded-lg font-label-md " +
    "text-label-md text-on-surface hover:bg-surface-container-low transition-colors";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", closeAdminModal);

  const submitBtn = document.createElement("button");
  submitBtn.className =
    "flex-1 py-md bg-primary text-on-primary rounded-lg font-label-md " +
    "text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm";
  submitBtn.innerHTML =
    '<span class="material-symbols-outlined text-[18px]">person_add</span> Create User';

  submitBtn.addEventListener("click", async function() {
    const nameVal  = nameInput.value.trim();
    const emailVal = emailInput.value.trim();
    const passVal  = passInput.value;

    let valid = true;

    if (!nameVal) {
      nameField.errorMsg.textContent = "Name is required.";
      nameField.errorMsg.classList.remove("hidden");
      valid = false;
    } else {
      nameField.errorMsg.classList.add("hidden");
    }

    if (!emailVal || !emailVal.includes("@")) {
      emailField.errorMsg.textContent = "Enter a valid email.";
      emailField.errorMsg.classList.remove("hidden");
      valid = false;
    } else {
      emailField.errorMsg.classList.add("hidden");
    }

    if (!passVal || passVal.length < 4) {
      passField.errorMsg.textContent = "Password must be at least 4 characters.";
      passField.errorMsg.classList.remove("hidden");
      valid = false;
    } else {
      passField.errorMsg.classList.add("hidden");
    }

    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<span class="material-symbols-outlined text-[18px] animate-spin">autorenew</span> Saving…';

    const newUser = {
      id:       generateId(),
      name:     nameVal,
      email:    emailVal,
      password: passVal,
      role:     roleSelect.value
    };

    try {
      await Api.createUser(newUser);
      showSuccessAndClose('User "' + nameVal + '" created!');
    } catch (err) {
      generalError.textContent = "Could not save user. Check the server.";
      generalError.classList.remove("hidden");
      submitBtn.disabled = false;
      submitBtn.innerHTML =
        '<span class="material-symbols-outlined text-[18px]">person_add</span> Create User';
    }
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(submitBtn);

  form.appendChild(nameField.wrapper);
  form.appendChild(emailField.wrapper);
  form.appendChild(passField.wrapper);
  form.appendChild(roleField.wrapper);
  form.appendChild(generalError);
  form.appendChild(btnRow);

  box.appendChild(form);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  nameInput.focus();
}

// ── Botones admin en el sidebar ─────────────────────────

function renderAdminButtons() {
  if (!Session.isAdmin()) return;

  const sidebar = document.querySelector("aside");
  if (!sidebar) return;

  // "New Project" existente → abre modal de nueva tarea
  const newProjectBtn = sidebar.querySelector(".px-4.mt-auto button");
  if (newProjectBtn) {
    newProjectBtn.addEventListener("click", openNewTaskModal);
  }

  // Inyectar solo el botón "New User"
  const adminSection = document.createElement("div");
  adminSection.className = "px-4 mt-2";

  const newUserBtn = document.createElement("button");
  newUserBtn.className =
    "w-full border border-primary text-primary py-3 rounded-xl font-label-md text-label-md " +
    "flex items-center justify-center gap-2 hover:bg-primary-fixed transition-colors";
  newUserBtn.innerHTML =
    '<span class="material-symbols-outlined text-[18px]">person_add</span> New User';
  newUserBtn.addEventListener("click", openNewUserModal);

  adminSection.appendChild(newUserBtn);

  const mtAutoDiv = sidebar.querySelector(".px-4.mt-auto");
  if (mtAutoDiv && mtAutoDiv.parentNode) {
    mtAutoDiv.parentNode.insertBefore(adminSection, mtAutoDiv.nextSibling);
  }
}

// ======================================================
// MODULE: board.js
// ======================================================

async function initBoard() {
  const user = Session.get();
  renderTopBar(user);
  renderAdminButtons();
  await renderBoard();
}

function renderTopBar(user) {
  const header = document.querySelector("header");
  if (!header) return;

  const badge = document.createElement("span");
  badge.className = "font-label-md text-label-md text-on-surface-variant hidden md:block";
  badge.textContent = user.name + " (" + user.role + ")";

  const logoutBtn = document.createElement("button");
  logoutBtn.className =
    "flex items-center gap-1 text-error font-label-md text-label-md hover:underline ml-2";
  logoutBtn.innerHTML =
    '<span class="material-symbols-outlined text-sm">logout</span> Logout';

  logoutBtn.addEventListener("click", function() {
    Session.clear();
    window.location.href = "login.html";
  });

  const actions = header.querySelector(".flex.items-center.gap-4.ml-4");
  if (actions) {
    actions.insertBefore(badge, actions.firstChild);
    actions.appendChild(logoutBtn);
  }
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
  const tasks = await Api.getTasks();
  const users = await Api.getUsers();

  // Limpiar columnas
  const columnas = document.querySelectorAll(".kanban-column .flex-1.space-y-md");
  for (const col of columnas) col.innerHTML = "";

  // Actualizar contadores
  for (const status of STATUSES) {
    const count = tasks.filter(t => t.status === status).length;
    const h3s   = document.querySelectorAll(".kanban-column h3");
    for (const h3 of h3s) {
      if (h3.textContent.trim() === COLUMN_HEADERS[status]) {
        const badge = h3.nextElementSibling;
        if (badge) badge.textContent = count;
      }
    }
  }

  // Pintar tarjetas
  for (const task of tasks) {
    const assignedUser = users.find(u => u.id === task.userId) || null;
    const container    = getColumnContainer(task.status);
    if (!container) continue;
    container.appendChild(buildTaskCard(task, assignedUser));
  }

  initDragAndDrop();
}

function buildTaskCard(task, assignedUser) {
  const isDone = task.status === "done";

  const card = document.createElement("div");
  card.className =
    "task-card bg-surface border border-outline-variant rounded-xl p-md shadow-sm " +
    (isDone ? "opacity-80" : "");
  card.dataset.taskId = task.id;
  card.dataset.userId = task.userId;

  const checkIconHTML = isDone
    ? '<span class="material-symbols-outlined text-sm dnd-check-icon" ' +
      'style="font-variation-settings:\'FILL\' 1;color:#8f4200">check_circle</span>'
    : "";

  const titleClass =
    "font-label-md text-label-md text-on-surface mb-xs" +
    (isDone ? " line-through" : "");

  // Botón editar (solo admin)
  const editBtnHTML = Session.isAdmin()
    ? '<button class="edit-task-btn material-symbols-outlined text-sm text-outline ' +
      'hover:text-primary transition-colors" title="Edit task">edit</button>'
    : "";

  card.innerHTML =
    '<div class="flex items-start justify-between mb-xs">' +
      '<span class="bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded-full font-label-sm text-label-sm">' +
        STATUS_LABELS[task.status] +
      "</span>" +
      '<div class="flex items-center gap-1">' +
        editBtnHTML +
        checkIconHTML +
      "</div>" +
    "</div>" +
    '<h4 class="' + titleClass + '">' + escapeHtml(task.title) + "</h4>" +
    '<p class="font-body-sm text-body-sm text-on-surface-variant">' +
      escapeHtml(task.description) +
    "</p>" +
    '<div class="mt-md flex items-center justify-between">' +
      '<span class="font-label-sm text-label-sm text-on-surface-variant">' +
        "👤 " + (assignedUser ? escapeHtml(assignedUser.name) : "Unassigned") +
      "</span>" +
    "</div>";

  // Conectar botón editar al modal
  if (Session.isAdmin()) {
    const editBtn = card.querySelector(".edit-task-btn");
    if (editBtn) {
      editBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        openEditTaskModal(task);
      });
    }
  }

  return card;
}

// ── Drag & Drop ──────────────────────────────────────────

let tarjetaArrastrada = null;
let idTareaArrastrada = null;

function initDragAndDrop() {
  attachDragToCards();
  attachDropZones();
}

function attachDragToCards() {
  const cards = document.querySelectorAll(".task-card[data-task-id]");
  for (const card of cards) {
    card.setAttribute("draggable", "true");

    card.addEventListener("dragstart", function(e) {
      tarjetaArrastrada = this;
      idTareaArrastrada = this.dataset.taskId;
      this.classList.add("opacity-50");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", idTareaArrastrada);
    });

    card.addEventListener("dragend", function() {
      this.classList.remove("opacity-50");
      tarjetaArrastrada = null;
      idTareaArrastrada = null;
    });
  }
}

function attachDropZones() {
  const zones = document.querySelectorAll(".kanban-column .flex-1.space-y-md");
  for (const zone of zones) {
    zone.addEventListener("dragover",  e => e.preventDefault());
    zone.addEventListener("dragenter", e => e.preventDefault());

    zone.addEventListener("drop", function(e) {
      e.preventDefault();
      e.stopPropagation();

      if (!tarjetaArrastrada || !idTareaArrastrada) return;

      const column      = this.closest(".kanban-column");
      const nuevoEstado = getStatusFromColumn(column);
      if (!nuevoEstado) return;

      this.appendChild(tarjetaArrastrada);
      updateCardVisual(tarjetaArrastrada, nuevoEstado);
      updateColumnCounts();

      const idParaGuardar = idTareaArrastrada;
      Api.updateTask(idParaGuardar, { status: nuevoEstado })
        .catch(err => console.error("No se pudo guardar el cambio:", err));
    });
  }
}

function getStatusFromColumn(columnEl) {
  const h3 = columnEl.querySelector("h3");
  if (!h3) return null;
  const label = h3.textContent.trim();
  return Object.keys(COLUMN_HEADERS).find(k => COLUMN_HEADERS[k] === label) || null;
}

function updateCardVisual(card, status) {
  const badge  = card.querySelector(".bg-primary-fixed");
  if (badge) badge.textContent = STATUS_LABELS[status];

  const title  = card.querySelector("h4");
  const topRow = card.querySelector(".flex.items-start.justify-between.mb-xs");
  const isDone = status === "done";

  card.classList.toggle("opacity-80", isDone);
  if (title) title.classList.toggle("line-through", isDone);

  const iconContainer = topRow ? topRow.querySelector(".flex.items-center.gap-1") : null;
  let checkIcon = iconContainer ? iconContainer.querySelector(".dnd-check-icon") : null;

  if (isDone && !checkIcon && iconContainer) {
    checkIcon = document.createElement("span");
    checkIcon.className = "material-symbols-outlined text-sm dnd-check-icon";
    checkIcon.style.fontVariationSettings = "'FILL' 1";
    checkIcon.style.color = "#8f4200";
    checkIcon.textContent = "check_circle";
    iconContainer.appendChild(checkIcon);
  }

  if (!isDone && checkIcon) checkIcon.remove();
}

function updateColumnCounts() {
  const columns = document.querySelectorAll(".kanban-column");
  for (const column of columns) {
    const count = column.querySelectorAll(".task-card").length;
    const h3    = column.querySelector("h3");
    if (h3 && h3.nextElementSibling) {
      h3.nextElementSibling.textContent = count;
    }
  }
}

// ======================================================
// app.js — Punto de entrada
// ======================================================

document.addEventListener("DOMContentLoaded", async function() {

  guardRoutes();

  if (isLoginPage()) {
    initLogin();
    return;
  }

  if (isBoardPage()) {
    await initBoard();
  }

});