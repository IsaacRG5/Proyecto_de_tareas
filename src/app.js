function initLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const errorEl = document.createElement("div");
  errorEl.className =
    "hidden mt-2 p-3 bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm";
  form.appendChild(errorEl);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");

    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const users = await Api.getUsers();
      let found = null;
      for (let i = 0; i < users.length; i++) {
        if (users[i].email === email && users[i].password === password) {
          found = users[i];
          break;
        }
      }
      if (found) {
        Session.save(found);
        window.location.href = "board.html";
      } else {
        errorEl.textContent = "Invalid email or password.";
        errorEl.classList.remove("hidden");
      }
    } catch {
      errorEl.textContent = "Could not connect to server.";
      errorEl.classList.remove("hidden");
    }
  });
}

let currentSearchQuery = "";

function initSearch() {
  const input = document.querySelector("header input[type='text']");
  if (!input) return;

  input.addEventListener("input", () => {
    currentSearchQuery = input.value.trim().toLowerCase();
    filterTasks(currentSearchQuery);
  });
}

function filterTasks(query) {
  const cards = document.querySelectorAll(".task-card");

  for (const card of cards) {
    const title = (card.querySelector("h4")?.textContent || "").toLowerCase();
    const desc  = (card.querySelector("p")?.textContent  || "").toLowerCase();
    const match = !query || title.includes(query) || desc.includes(query);
    card.style.display = match ? "" : "none";
  }

  for (const column of document.querySelectorAll(".kanban-column")) {
    const visible = column.querySelectorAll(".task-card:not([style*='display: none'])").length;
    const h3      = column.querySelector("h3");
    if (h3 && h3.nextElementSibling) h3.nextElementSibling.textContent = visible;
  }
}

async function initBoard() {
  const user = Session.get();
  renderTopBar(user);
  renderAdminButtons();     // admin.js — solo actúa si es admin
  await renderBoard();
  initSearch();
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
  for (const col of document.querySelectorAll(".kanban-column .flex-1.space-y-md")) {
    col.innerHTML = "";
  }

  for (const status of STATUSES) {
    const count = tasks.filter(t => t.status === status).length;
    for (const h3 of document.querySelectorAll(".kanban-column h3")) {
      if (h3.textContent.trim() === COLUMN_HEADERS[status] && h3.nextElementSibling) {
        h3.nextElementSibling.textContent = count;
      }
    }
  }

  for (const task of tasks) {
    const assignedUser = users.find(u => u.id === task.userId) || null;
    const container    = getColumnContainer(task.status);
    if (!container) continue;
    container.appendChild(buildTaskCard(task, assignedUser));
  }

  initDragAndDrop();

  // Si había una búsqueda activa, reaplicarla sobre las nuevas tarjetas
  if (currentSearchQuery) filterTasks(currentSearchQuery);
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
    "font-label-md text-label-md text-on-surface mb-xs" + (isDone ? " line-through" : "");

  // Botón editar solo visible para admin
  const editBtnHTML = Session.isAdmin()
    ? '<button class="edit-task-btn material-symbols-outlined text-sm text-outline ' +
      'hover:text-primary transition-colors" title="Edit task">edit</button>'
    : "";

  card.innerHTML =
    '<div class="flex items-start justify-between mb-xs">' +
      '<span class="bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded-full font-label-sm text-label-sm">' +
        STATUS_LABELS[task.status] +
      "</span>" +
      '<div class="flex items-center gap-1">' + editBtnHTML + checkIconHTML + "</div>" +
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

  if (Session.isAdmin()) {
    const editBtn = card.querySelector(".edit-task-btn");
    if (editBtn) {
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditTaskModal(task);   // admin.js
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
  for (const card of document.querySelectorAll(".task-card[data-task-id]")) {
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
  for (const zone of document.querySelectorAll(".kanban-column .flex-1.space-y-md")) {
    zone.addEventListener("dragover",  e => e.preventDefault());
    zone.addEventListener("dragenter", e => e.preventDefault());

    zone.addEventListener("drop", function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (!tarjetaArrastrada || !idTareaArrastrada) return;

      const nuevoEstado = getStatusFromColumn(this.closest(".kanban-column"));
      if (!nuevoEstado) return;

      this.appendChild(tarjetaArrastrada);
      updateCardVisual(tarjetaArrastrada, nuevoEstado);
      updateColumnCounts();

      const id = idTareaArrastrada;
      Api.updateTask(id, { status: nuevoEstado })
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

  const title       = card.querySelector("h4");
  const topRow      = card.querySelector(".flex.items-start.justify-between.mb-xs");
  const isDone      = status === "done";
  const iconWrapper = topRow ? topRow.querySelector(".flex.items-center.gap-1") : null;

  card.classList.toggle("opacity-80", isDone);
  if (title) title.classList.toggle("line-through", isDone);

  let checkIcon = iconWrapper ? iconWrapper.querySelector(".dnd-check-icon") : null;

  if (isDone && !checkIcon && iconWrapper) {
    checkIcon = document.createElement("span");
    checkIcon.className = "material-symbols-outlined text-sm dnd-check-icon";
    checkIcon.style.fontVariationSettings = "'FILL' 1";
    checkIcon.style.color = "#8f4200";
    checkIcon.textContent = "check_circle";
    iconWrapper.appendChild(checkIcon);
  }

  if (!isDone && checkIcon) checkIcon.remove();
}

function updateColumnCounts() {
  for (const column of document.querySelectorAll(".kanban-column")) {
    // Si hay búsqueda activa, contar solo las tarjetas visibles
    const selector = currentSearchQuery
      ? ".task-card:not([style*='display: none'])"
      : ".task-card";
    const count = column.querySelectorAll(selector).length;
    const h3    = column.querySelector("h3");
    if (h3 && h3.nextElementSibling) h3.nextElementSibling.textContent = count;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  guardRoutes();

  if (isLoginPage()) {
    initLogin();
    return;
  }

  if (isBoardPage()) {
    await initBoard();
  }
});