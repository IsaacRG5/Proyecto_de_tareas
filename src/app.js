// ─────────────────────────────────────────────────────────────
// app.js  —  Lógica general de la aplicación
// ─────────────────────────────────────────────────────────────


// ── Login ────────────────────────────────────────────────────

function initLogin() {
  var form = document.getElementById("loginForm");
  if (!form) return;

  // Creamos el elemento donde mostraremos los errores de login
  var errorEl = document.createElement("div");
  errorEl.className =
    "hidden mt-2 p-3 bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm";
  form.appendChild(errorEl);

  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    errorEl.classList.add("hidden");

    var email    = document.getElementById("email").value.trim();
    var password = document.getElementById("password").value;

    try {
      // Buscamos el usuario en la base de datos
      var users = await Api.getUsers();
      var found = null;

      for (var i = 0; i < users.length; i++) {
        if (users[i].email === email && users[i].password === password) {
          found = users[i];
          break;
        }
      }

      if (found) {
        // Guardamos el usuario en sesión y vamos al board
        Session.save(found);
        window.location.href = "board.html";
      } else {
        errorEl.textContent = "Invalid email or password.";
        errorEl.classList.remove("hidden");
      }
    } catch(err) {
      errorEl.textContent = "Could not connect to server.";
      errorEl.classList.remove("hidden");
    }
  });
}


// ── Board ────────────────────────────────────────────────────

// Guarda el texto de búsqueda actual para poder reaplicarlo después
var currentSearchQuery = "";

// Inicializa todo cuando cargamos el board
async function initBoard() {
  var user = Session.get();
  renderTopBar(user);       // muestra el nombre y el botón de logout
  renderAdminButtons();     // activa los botones de admin (admin.js)
  await renderBoard();      // carga y dibuja las tareas
  initSearch();             // activa el buscador
  connectNavLinks();        // conecta los links del sidebar (Team y Dashboard)
}

// Pone el nombre del usuario y el botón de logout en el header
function renderTopBar(user) {
  var header = document.querySelector("header");
  if (!header) return;

  // Badge con el nombre y rol
  var badge = document.createElement("span");
  badge.className = "font-label-md text-label-md text-on-surface-variant hidden md:block";
  badge.textContent = user.name + " (" + user.role + ")";

  // Botón de logout
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

// Carga las tareas del servidor y las dibuja en el kanban
async function renderBoard() {
  var tasks = await Api.getTasks();
  var users = await Api.getUsers();

  // Vaciamos las columnas antes de volver a pintar
  var columns = document.querySelectorAll(".kanban-column .flex-1.space-y-md");
  for (var i = 0; i < columns.length; i++) {
    columns[i].innerHTML = "";
  }

  // Actualizamos los contadores de cada columna
  for (var s = 0; s < STATUSES.length; s++) {
    var status = STATUSES[s];
    var count = tasks.filter(function(t) { return t.status === status; }).length;
    var h3s = document.querySelectorAll(".kanban-column h3");
    for (var k = 0; k < h3s.length; k++) {
      if (h3s[k].textContent.trim() === COLUMN_HEADERS[status] && h3s[k].nextElementSibling) {
        h3s[k].nextElementSibling.textContent = count;
      }
    }
  }

  // Agregamos cada tarea a su columna
  for (var t = 0; t < tasks.length; t++) {
    var task = tasks[t];
    var assignedUser = null;
    for (var u = 0; u < users.length; u++) {
      if (users[u].id === task.userId) { assignedUser = users[u]; break; }
    }
    var container = getColumnContainer(task.status);
    if (container) container.appendChild(buildTaskCard(task, assignedUser));
  }

  initDragAndDrop();

  // Si había una búsqueda activa, la reaplicamos
  if (currentSearchQuery) filterTasks(currentSearchQuery);
}

// Devuelve el div donde van las tarjetas de una columna según su estado
function getColumnContainer(status) {
  var h3s = document.querySelectorAll(".kanban-column h3");
  for (var i = 0; i < h3s.length; i++) {
    if (h3s[i].textContent.trim() === COLUMN_HEADERS[status]) {
      return h3s[i].closest(".kanban-column").querySelector(".flex-1.space-y-md");
    }
  }
  return null;
}

// Construye la tarjeta visual de una tarea
function buildTaskCard(task, assignedUser) {
  var isDone = task.status === "done";

  var card = document.createElement("div");
  card.className =
    "task-card bg-surface border border-outline-variant rounded-xl p-md shadow-sm " +
    (isDone ? "opacity-80" : "");
  card.dataset.taskId = task.id;
  card.dataset.userId = task.userId;

  // Ícono de check si la tarea está terminada
  var checkHTML = isDone
    ? '<span class="material-symbols-outlined text-sm dnd-check-icon" ' +
      'style="font-variation-settings:\'FILL\' 1;color:#8f4200">check_circle</span>'
    : "";

  // Botón de editar (solo visible para el admin)
  var editBtnHTML = Session.isAdmin()
    ? '<button class="edit-task-btn material-symbols-outlined text-sm text-outline ' +
      'hover:text-primary transition-colors" title="Edit task">edit</button>'
    : "";

  var titleClass = "font-label-md text-label-md text-on-surface mb-xs" + (isDone ? " line-through" : "");

  card.innerHTML =
    '<div class="flex items-start justify-between mb-xs">' +
      '<span class="bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded-full font-label-sm text-label-sm">' +
        STATUS_LABELS[task.status] +
      "</span>" +
      '<div class="flex items-center gap-1">' + editBtnHTML + checkHTML + "</div>" +
    "</div>" +
    '<h4 class="' + titleClass + '">' + escapeHtml(task.title) + "</h4>" +
    '<p class="font-body-sm text-body-sm text-on-surface-variant">' + escapeHtml(task.description) + "</p>" +
    '<div class="mt-md flex items-center justify-between">' +
      '<span class="font-label-sm text-label-sm text-on-surface-variant">' +
        "👤 " + (assignedUser ? escapeHtml(assignedUser.name) : "Unassigned") +
      "</span>" +
    "</div>";

  // Conectamos el botón de editar si somos admin
  if (Session.isAdmin()) {
    var editBtn = card.querySelector(".edit-task-btn");
    if (editBtn) {
      editBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        openEditTaskModal(task);  // admin.js
      });
    }
  }

  return card;
}


// ── Búsqueda ─────────────────────────────────────────────────

function initSearch() {
  var input = document.querySelector("header input[type='text']");
  if (!input) return;

  input.addEventListener("input", function() {
    currentSearchQuery = input.value.trim().toLowerCase();
    filterTasks(currentSearchQuery);
  });
}

// Muestra u oculta las tarjetas según el texto buscado
function filterTasks(query) {
  var cards = document.querySelectorAll(".task-card");

  for (var i = 0; i < cards.length; i++) {
    var title = (cards[i].querySelector("h4") ? cards[i].querySelector("h4").textContent : "").toLowerCase();
    var desc  = (cards[i].querySelector("p")  ? cards[i].querySelector("p").textContent  : "").toLowerCase();
    var match = !query || title.includes(query) || desc.includes(query);
    cards[i].style.display = match ? "" : "none";
  }

  // Actualizamos el contador de cada columna con las tarjetas visibles
  var columnas = document.querySelectorAll(".kanban-column");
  for (var j = 0; j < columnas.length; j++) {
    var visible = columnas[j].querySelectorAll(".task-card:not([style*='display: none'])").length;
    var h3 = columnas[j].querySelector("h3");
    if (h3 && h3.nextElementSibling) h3.nextElementSibling.textContent = visible;
  }
}


// ── Drag & Drop ──────────────────────────────────────────────

var tarjetaArrastrada = null;
var idTareaArrastrada = null;

function initDragAndDrop() {
  attachDragToCards();
  attachDropZones();
}

// Hace que cada tarjeta se pueda arrastrar
function attachDragToCards() {
  var cards = document.querySelectorAll(".task-card[data-task-id]");
  for (var i = 0; i < cards.length; i++) {
    cards[i].setAttribute("draggable", "true");

    cards[i].addEventListener("dragstart", function(e) {
      tarjetaArrastrada = this;
      idTareaArrastrada = this.dataset.taskId;
      this.classList.add("opacity-50");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", idTareaArrastrada);
    });

    cards[i].addEventListener("dragend", function() {
      this.classList.remove("opacity-50");
      tarjetaArrastrada = null;
      idTareaArrastrada = null;
    });
  }
}

// Hace que cada columna acepte tarjetas soltadas
function attachDropZones() {
  var zones = document.querySelectorAll(".kanban-column .flex-1.space-y-md");
  for (var i = 0; i < zones.length; i++) {
    zones[i].addEventListener("dragover",  function(e) { e.preventDefault(); });
    zones[i].addEventListener("dragenter", function(e) { e.preventDefault(); });

    zones[i].addEventListener("drop", function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (!tarjetaArrastrada || !idTareaArrastrada) return;

      var nuevoEstado = getStatusFromColumn(this.closest(".kanban-column"));
      if (!nuevoEstado) return;

      this.appendChild(tarjetaArrastrada);
      updateCardVisual(tarjetaArrastrada, nuevoEstado);
      updateColumnCounts();

      // Guardamos el nuevo estado en el servidor
      var id = idTareaArrastrada;
      Api.updateTask(id, { status: nuevoEstado })
        .catch(function(err) { console.error("Could not save change:", err); });
    });
  }
}

// Devuelve el estado (ej. "in progress") a partir del elemento de columna
function getStatusFromColumn(columnEl) {
  var h3 = columnEl.querySelector("h3");
  if (!h3) return null;
  var label = h3.textContent.trim();
  var keys = Object.keys(COLUMN_HEADERS);
  for (var i = 0; i < keys.length; i++) {
    if (COLUMN_HEADERS[keys[i]] === label) return keys[i];
  }
  return null;
}

// Actualiza el aspecto visual de una tarjeta cuando cambia de columna
function updateCardVisual(card, status) {
  var badge = card.querySelector(".bg-primary-fixed");
  if (badge) badge.textContent = STATUS_LABELS[status];

  var title       = card.querySelector("h4");
  var topRow      = card.querySelector(".flex.items-start.justify-between.mb-xs");
  var isDone      = status === "done";
  var iconWrapper = topRow ? topRow.querySelector(".flex.items-center.gap-1") : null;

  card.classList.toggle("opacity-80", isDone);
  if (title) title.classList.toggle("line-through", isDone);

  var checkIcon = iconWrapper ? iconWrapper.querySelector(".dnd-check-icon") : null;

  // Agregamos el ícono de check si pasó a "done"
  if (isDone && !checkIcon && iconWrapper) {
    checkIcon = document.createElement("span");
    checkIcon.className = "material-symbols-outlined text-sm dnd-check-icon";
    checkIcon.style.fontVariationSettings = "'FILL' 1";
    checkIcon.style.color = "#8f4200";
    checkIcon.textContent = "check_circle";
    iconWrapper.appendChild(checkIcon);
  }

  // Quitamos el ícono si la tarea ya no está en "done"
  if (!isDone && checkIcon) checkIcon.remove();
}

// Actualiza el número de tarjetas mostrado en el encabezado de cada columna
function updateColumnCounts() {
  var columnas = document.querySelectorAll(".kanban-column");
  for (var i = 0; i < columnas.length; i++) {
    var selector = currentSearchQuery
      ? ".task-card:not([style*='display: none'])"
      : ".task-card";
    var count = columnas[i].querySelectorAll(selector).length;
    var h3 = columnas[i].querySelector("h3");
    if (h3 && h3.nextElementSibling) h3.nextElementSibling.textContent = count;
  }
}


// ── Navegación del sidebar ───────────────────────────────────

// Conecta los links "Dashboard" y "Team" para cambiar de vista
function connectNavLinks() {
  var navLinks = document.querySelectorAll("aside nav a");
  var dashboardLink = null;
  var teamLink      = null;

  for (var i = 0; i < navLinks.length; i++) {
    var text = navLinks[i].textContent.trim();
    if (text.includes("Dashboard")) dashboardLink = navLinks[i];
    if (text.includes("Team"))      teamLink      = navLinks[i];
  }

  if (dashboardLink) {
    dashboardLink.addEventListener("click", function(e) {
      e.preventDefault();
      showDashboardView();           // admin.js
      setActiveLink(dashboardLink, teamLink);
    });
  }

  if (teamLink) {
    teamLink.addEventListener("click", function(e) {
      e.preventDefault();
      if (Session.isAdmin()) {
        showTeamView();              // admin.js
        setActiveLink(teamLink, dashboardLink);
      }
    });
  }
}

// Cambia el estilo del link activo e inactivo en el sidebar
function setActiveLink(activeLink, inactiveLink) {
  if (activeLink) {
    activeLink.className =
      "flex items-center bg-primary-fixed text-on-primary-fixed-variant rounded-lg mx-2 px-4 py-3 font-body-sm text-body-sm transition-all scale-[0.98]";
  }
  if (inactiveLink) {
    inactiveLink.className =
      "flex items-center text-secondary hover:text-primary hover:bg-primary-container/10 px-4 py-3 mx-2 font-body-sm text-body-sm rounded-lg transition-all";
  }
}


// ── Arranque ─────────────────────────────────────────────────

// Esto se ejecuta cuando termina de cargar la página
document.addEventListener("DOMContentLoaded", async function() {
  guardRoutes();  // redirige si no hay sesión (core.js)

  if (isLoginPage()) {
    initLogin();
    return;
  }

  if (isBoardPage()) {
    await initBoard();
  }
});