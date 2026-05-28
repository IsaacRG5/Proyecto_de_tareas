var STATUSES = ["todo", "in progress", "in review", "done"];

var STATUS_LABELS = {
  "todo":        "To Do",
  "in progress": "In Progress",
  "in review":   "In Review",
  "done":        "Done"
};

var COLUMN_HEADERS = {
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

var Session = {

  save: function(user) {
    sessionStorage.setItem("riwiflow_user", JSON.stringify(user));
  },

  get: function() {
    var guardado = sessionStorage.getItem("riwiflow_user");
    if (guardado) {
      return JSON.parse(guardado);
    }
    return null;
  },

  clear: function() {
    sessionStorage.removeItem("riwiflow_user");
  },

  isLoggedIn: function() {
    return !!this.get();
  },

  isAdmin: function() {
    var usuario = this.get();
    return !!(usuario && usuario.role === "admin");
  }

};


var API_URL = "http://localhost:3000";

var Api = {

  // ---------- USUARIOS ----------

  getUsers: async function() {
    var res = await fetch(API_URL + "/users");
    return res.json();
  },

  createUser: async function(userData) {
    var res = await fetch(API_URL + "/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    });
    return res.json();
  },


  getTasks: async function() {
    var res = await fetch(API_URL + "/tasks");
    return res.json();
  },

  createTask: async function(task) {
    var res = await fetch(API_URL + "/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task)
    });
    return res.json();
  },

  updateTask: async function(id, data) {
    var res = await fetch(API_URL + "/tasks/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  deleteTask: async function(id) {
    await fetch(API_URL + "/tasks/" + id, { method: "DELETE" });
  }

};

function guardRoutes() {
  // Usuario logueado intentando entrar al login → mandarlo al tablero
  if (isLoginPage() && Session.isLoggedIn()) {
    window.location.href = "board.html";
    return;
  }

  // Usuario sin sesion intentando entrar al tablero → mandarlo al login
  if (isBoardPage() && !Session.isLoggedIn()) {
    window.location.href = "login.html";
  }
}

function createErrorEl() {
  var div = document.createElement("div");
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
  var form = document.getElementById("loginForm");
  if (!form) return;

  var errorEl = createErrorEl();
  form.appendChild(errorEl);

  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    hideError(errorEl);

    var email    = document.getElementById("email").value.trim();
    var password = document.getElementById("password").value;

    try {
      var users = await Api.getUsers();

      var usuarioEncontrado = null;
      for (var i = 0; i < users.length; i++) {
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

var MODAL_INPUT_CLASS =
  "w-full px-md py-2 bg-white border border-outline-variant rounded-lg " +
  "font-body-sm text-body-sm text-on-surface focus:outline-none " +
  "focus:border-primary focus:ring-2 focus:ring-primary-fixed transition-all";

// Crea la capa de fondo oscuro del modal
function createOverlay(onClose) {
  var overlay = document.createElement("div");
  overlay.id = "admin-modal-overlay";
  overlay.className =
    "fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4";

  // Cerrar al hacer click fuera del modal
  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) onClose();
  });

  return overlay;
}

function createModalBox(title) {
  var box = document.createElement("div");
  box.className =
    "bg-surface-container-lowest border border-outline-variant rounded-xl " +
    "shadow-xl w-full max-w-md p-xl space-y-lg";

  var header = document.createElement("div");
  header.className = "flex items-center justify-between";

  var h2 = document.createElement("h2");
  h2.className = "font-headline-md text-headline-md text-on-surface";
  h2.textContent = title;

  var closeBtn = document.createElement("button");
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
  var overlay = document.getElementById("admin-modal-overlay");
  if (overlay) overlay.remove();
}

function createField(labelText, inputEl) {
  var wrapper = document.createElement("div");
  wrapper.className = "space-y-xs";

  var label = document.createElement("label");
  label.className = "font-label-md text-label-md text-on-surface block";
  label.textContent = labelText;

  var errorMsg = document.createElement("p");
  errorMsg.className = "hidden font-body-sm text-body-sm text-error mt-xs";

  wrapper.appendChild(label);
  wrapper.appendChild(inputEl);
  wrapper.appendChild(errorMsg);

  return { wrapper, errorMsg };
}

// Muestra un texto de exito temporal en el modal y lo cierra
function showSuccessAndClose(msg) {
  var overlay = document.getElementById("admin-modal-overlay");
  if (!overlay) return;

  var box = overlay.querySelector(".bg-surface-container-lowest");
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

// ── Modal: Nueva Tarea ──────────────────────────────────

async function openNewTaskModal() {
  closeAdminModal();

  var users = [];
  try {
    users = await Api.getUsers();
  } catch (e) {
    console.error("No se pudieron cargar los usuarios:", e);
  }

  var overlay = createOverlay(closeAdminModal);
  var box = createModalBox("New Task");

  var form = document.createElement("div");
  form.className = "space-y-lg";

  var titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.placeholder = "Task title";
  titleInput.className = MODAL_INPUT_CLASS;
  var titleField = createField("Title *", titleInput);

  var descInput = document.createElement("textarea");
  descInput.rows = 3;
  descInput.placeholder = "Describe the task…";
  descInput.className = MODAL_INPUT_CLASS + " resize-none";
  var descField = createField("Description", descInput);

  var statusSelect = document.createElement("select");
  statusSelect.className = MODAL_INPUT_CLASS;
  for (var s = 0; s < STATUSES.length; s++) {
    var opt = document.createElement("option");
    opt.value = STATUSES[s];
    opt.textContent = STATUS_LABELS[STATUSES[s]];
    statusSelect.appendChild(opt);
  }
  var statusField = createField("Status *", statusSelect);

  var assignSelect = document.createElement("select");
  assignSelect.className = MODAL_INPUT_CLASS;
  var defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "— Unassigned —";
  assignSelect.appendChild(defaultOpt);
  for (var u = 0; u < users.length; u++) {
    var uOpt = document.createElement("option");
    uOpt.value = users[u].id;
    uOpt.textContent = users[u].name + " (" + users[u].role + ")";
    assignSelect.appendChild(uOpt);
  }
  var assignField = createField("Assign to", assignSelect);

  var generalError = document.createElement("p");
  generalError.className = "hidden font-body-sm text-body-sm text-error";

  var btnRow = document.createElement("div");
  btnRow.className = "flex gap-md pt-sm";

  var cancelBtn = document.createElement("button");
  cancelBtn.className =
    "flex-1 py-md border border-outline-variant rounded-lg font-label-md " +
    "text-label-md text-on-surface hover:bg-surface-container-low transition-colors";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", closeAdminModal);

  var submitBtn = document.createElement("button");
  submitBtn.className =
    "flex-1 py-md bg-primary text-on-primary rounded-lg font-label-md " +
    "text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm";
  submitBtn.innerHTML =
    '<span class="material-symbols-outlined text-[18px]">add</span> Create Task';

  submitBtn.addEventListener("click", async function() {
    
    var titleVal = titleInput.value.trim();
    if (!titleVal) {
      titleField.errorMsg.textContent = "Title is required.";
      titleField.errorMsg.classList.remove("hidden");
      return;
    }
    titleField.errorMsg.classList.add("hidden");

    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<span class="material-symbols-outlined text-[18px] animate-spin">autorenew</span> Saving…';

    var newTask = {
      id:          generateId(),
      title:       titleVal,
      description: descInput.value.trim(),
      status:      statusSelect.value,
      userId:      assignSelect.value ? Number(assignSelect.value) : null
    };

    try {
      await Api.createTask(newTask);
      showSuccessAndClose("Task created successfully!");
      setTimeout(async function() {
        await renderBoard();
      }, 1600);
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

  form.appendChild(titleField.wrapper);
  form.appendChild(descField.wrapper);
  form.appendChild(statusField.wrapper);
  form.appendChild(assignField.wrapper);
  form.appendChild(generalError);
  form.appendChild(btnRow);

  box.appendChild(form);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // Focus en el primer campo
  titleInput.focus();
}


function openNewUserModal() {
  closeAdminModal();

  var overlay = createOverlay(closeAdminModal);
  var box = createModalBox("New User");

  var form = document.createElement("div");
  form.className = "space-y-lg";

  var nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Full name";
  nameInput.className = MODAL_INPUT_CLASS;
  var nameField = createField("Full Name *", nameInput);

  var emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.placeholder = "email@company.com";
  emailInput.className = MODAL_INPUT_CLASS;
  var emailField = createField("Email *", emailInput);

  var passInput = document.createElement("input");
  passInput.type = "password";
  passInput.placeholder = "••••••••";
  passInput.className = MODAL_INPUT_CLASS;
  var passField = createField("Password *", passInput);

  var roleSelect = document.createElement("select");
  roleSelect.className = MODAL_INPUT_CLASS;
  ["user", "admin"].forEach(function(r) {
    var opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r.charAt(0).toUpperCase() + r.slice(1);
    roleSelect.appendChild(opt);
  });
  var roleField = createField("Role *", roleSelect);

  var generalError = document.createElement("p");
  generalError.className = "hidden font-body-sm text-body-sm text-error";

  var btnRow = document.createElement("div");
  btnRow.className = "flex gap-md pt-sm";

  var cancelBtn = document.createElement("button");
  cancelBtn.className =
    "flex-1 py-md border border-outline-variant rounded-lg font-label-md " +
    "text-label-md text-on-surface hover:bg-surface-container-low transition-colors";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", closeAdminModal);

  var submitBtn = document.createElement("button");
  submitBtn.className =
    "flex-1 py-md bg-primary text-on-primary rounded-lg font-label-md " +
    "text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm";
  submitBtn.innerHTML =
    '<span class="material-symbols-outlined text-[18px]">person_add</span> Create User';

  submitBtn.addEventListener("click", async function() {
    // Validaciones
    var nameVal  = nameInput.value.trim();
    var emailVal = emailInput.value.trim();
    var passVal  = passInput.value;

    var valid = true;

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

    var newUser = {
      id:       generateId(),
      name:     nameVal,
      email:    emailVal,
      password: passVal,
      role:     roleSelect.value
    };

    try {
      await Api.createUser(newUser);
      showSuccessAndClose("User \"" + nameVal + "\" created!");
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


function renderAdminButtons() {
  if (!Session.isAdmin()) return;

  var sidebar = document.querySelector("aside");
  if (!sidebar) return;

  var newProjectBtn = sidebar.querySelector(".px-4.mt-auto button");
  if (newProjectBtn) {
    newProjectBtn.addEventListener("click", openNewTaskModal);
  }
  var adminSection = document.createElement("div");
  adminSection.className = "px-4 mt-2";

  var newUserBtn = document.createElement("button");
  newUserBtn.className =
    "w-full border border-primary text-primary py-3 rounded-xl font-label-md text-label-md " +
    "flex items-center justify-center gap-2 hover:bg-primary-fixed transition-colors";
  newUserBtn.innerHTML =
    '<span class="material-symbols-outlined text-[18px]">person_add</span> New User';
  newUserBtn.addEventListener("click", openNewUserModal);

  adminSection.appendChild(newUserBtn);

  // Insertar justo después del bloque mt-auto (donde vive "New Project")
  var mtAutoDiv = sidebar.querySelector(".px-4.mt-auto");
  if (mtAutoDiv && mtAutoDiv.parentNode) {
    mtAutoDiv.parentNode.insertBefore(adminSection, mtAutoDiv.nextSibling);
  }
}

async function initBoard() {
  var user = Session.get();

  renderTopBar(user);
  renderAdminButtons();   // Solo muestra botones si es admin (verificado internamente)

  await renderBoard();
}


function renderTopBar(user) {
  var header = document.querySelector("header");
  if (!header) return;

  // Badge con nombre y rol
  var badge = document.createElement("span");
  badge.className = "font-label-md text-label-md text-on-surface-variant hidden md:block";
  badge.textContent = user.name + " (" + user.role + ")";

  var logoutBtn = document.createElement("button");
  logoutBtn.className =
    "flex items-center gap-1 text-error font-label-md text-label-md hover:underline ml-2";
  logoutBtn.innerHTML =
    '<span class="material-symbols-outlined text-sm">logout</span> Logout';

  logoutBtn.addEventListener("click", function() {
    Session.clear();
    window.location.href = "login.html";
  });

  var actions = header.querySelector(".flex.items-center.gap-4.ml-4");
  if (actions) {
    actions.insertBefore(badge, actions.firstChild);
    actions.appendChild(logoutBtn);
  }
}


function getColumnContainer(status) {
  var h3s = document.querySelectorAll(".kanban-column h3");

  for (var i = 0; i < h3s.length; i++) {
    if (h3s[i].textContent.trim() === COLUMN_HEADERS[status]) {
      return h3s[i].closest(".kanban-column").querySelector(".flex-1.space-y-md");
    }
  }

  return null;
}

async function renderBoard() {
  var tasks = await Api.getTasks();
  var users = await Api.getUsers();

  // Limpia columnas antes de repintar
  var columnas = document.querySelectorAll(".kanban-column .flex-1.space-y-md");
  for (var i = 0; i < columnas.length; i++) {
    columnas[i].innerHTML = "";
  }

  // Actualiza contadores de columnas
  for (var s = 0; s < STATUSES.length; s++) {
    var status = STATUSES[s];
    var count  = 0;

    for (var t = 0; t < tasks.length; t++) {
      if (tasks[t].status === status) count++;
    }

    var h3s = document.querySelectorAll(".kanban-column h3");
    for (var h = 0; h < h3s.length; h++) {
      if (h3s[h].textContent.trim() === COLUMN_HEADERS[status]) {
        var badge = h3s[h].nextElementSibling;
        if (badge) badge.textContent = count;
      }
    }
  }

  for (var t = 0; t < tasks.length; t++) {
    var task = tasks[t];

    var assignedUser = null;
    for (var u = 0; u < users.length; u++) {
      if (users[u].id === task.userId) {
        assignedUser = users[u];
        break;
      }
    }

    var container = getColumnContainer(task.status);
    if (!container) continue;

    container.appendChild(buildTaskCard(task, assignedUser));
  }

  initDragAndDrop();
}

function buildTaskCard(task, assignedUser) {
  var isDone = task.status === "done";

  var card = document.createElement("div");
  card.className =
    "task-card bg-surface border border-outline-variant rounded-xl p-md shadow-sm " +
    (isDone ? "opacity-80" : "");
  card.dataset.taskId = task.id;
  card.dataset.userId = task.userId;

  var checkIconHTML = isDone
    ? '<span class="material-symbols-outlined text-sm dnd-check-icon" ' +
      'style="font-variation-settings:\'FILL\' 1;color:#8f4200">check_circle</span>'
    : "";

  var titleClass =
    "font-label-md text-label-md text-on-surface mb-xs" +
    (isDone ? " line-through" : "");

  card.innerHTML =
    '<div class="flex items-start justify-between mb-xs">' +
      '<span class="bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded-full font-label-sm text-label-sm">' +
        STATUS_LABELS[task.status] +
      "</span>" +
      checkIconHTML +
    "</div>" +
    '<h4 class="' + titleClass + '">' +
      escapeHtml(task.title) +
    "</h4>" +
    '<p class="font-body-sm text-body-sm text-on-surface-variant">' +
      escapeHtml(task.description) +
    "</p>" +
    '<div class="mt-md flex items-center justify-between">' +
      '<span class="font-label-sm text-label-sm text-on-surface-variant">' +
        "👤 " + (assignedUser ? escapeHtml(assignedUser.name) : "Unassigned") +
      "</span>" +
    "</div>";

  return card;
}


var tarjetaArrastrada  = null;
var idTareaArrastrada  = null;

function initDragAndDrop() {
  attachDragToCards();
  attachDropZones();
}

function attachDragToCards() {
  var cards = document.querySelectorAll(".task-card[data-task-id]");

  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
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
  var zones = document.querySelectorAll(".kanban-column .flex-1.space-y-md");

  for (var i = 0; i < zones.length; i++) {
    var zone = zones[i];

    zone.addEventListener("dragover",  function(e) { e.preventDefault(); });
    zone.addEventListener("dragenter", function(e) { e.preventDefault(); });

    zone.addEventListener("drop", function(e) {
      e.preventDefault();
      e.stopPropagation();

      if (!tarjetaArrastrada || !idTareaArrastrada) return;

      var column     = this.closest(".kanban-column");
      var nuevoEstado = getStatusFromColumn(column);
      if (!nuevoEstado) return;

      this.appendChild(tarjetaArrastrada);

      updateCardVisual(tarjetaArrastrada, nuevoEstado);

      updateColumnCounts();

      var idParaGuardar = idTareaArrastrada;
      Api.updateTask(idParaGuardar, { status: nuevoEstado })
        .catch(function(err) {
          console.error("No se pudo guardar el cambio:", err);
        });
    });
  }
}

function getStatusFromColumn(columnEl) {
  var h3 = columnEl.querySelector("h3");
  if (!h3) return null;

  var label   = h3.textContent.trim();
  var estados = Object.keys(COLUMN_HEADERS);

  for (var i = 0; i < estados.length; i++) {
    if (COLUMN_HEADERS[estados[i]] === label) return estados[i];
  }

  return null;
}

function updateCardVisual(card, status) {
  var badge  = card.querySelector(".bg-primary-fixed");
  if (badge) badge.textContent = STATUS_LABELS[status];

  var title  = card.querySelector("h4");
  var topRow = card.querySelector(".flex.items-start.justify-between.mb-xs");
  var isDone = status === "done";

  card.classList.toggle("opacity-80", isDone);
  if (title) title.classList.toggle("line-through", isDone);

  var checkIcon = topRow ? topRow.querySelector(".dnd-check-icon") : null;

  if (isDone && !checkIcon) {
    checkIcon = document.createElement("span");
    checkIcon.className = "material-symbols-outlined text-sm dnd-check-icon";
    checkIcon.style.fontVariationSettings = "'FILL' 1";
    checkIcon.style.color = "#8f4200";
    checkIcon.textContent = "check_circle";
    if (topRow) topRow.appendChild(checkIcon);
  }

  if (!isDone && checkIcon) {
    checkIcon.remove();
  }
}

function updateColumnCounts() {
  var columns = document.querySelectorAll(".kanban-column");

  for (var i = 0; i < columns.length; i++) {
    var column = columns[i];
    var count  = column.querySelectorAll(".task-card").length;
    var h3     = column.querySelector("h3");

    if (h3 && h3.nextElementSibling) {
      h3.nextElementSibling.textContent = count;
    }
  }
}

document.addEventListener("DOMContentLoaded", async function() {

  guardRoutes();

  // Página de login
  if (isLoginPage()) {
    initLogin();
    return;
  }

  // Tablero kanban
  if (isBoardPage()) {
    await initBoard();
  }

});