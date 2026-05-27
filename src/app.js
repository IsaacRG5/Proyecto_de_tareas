const API_URL = "http://localhost:3000";

const Session = {
  save(user) {
    sessionStorage.setItem(
      "riwiflow_user",
      JSON.stringify(user)
    );
  },

  get() {
    const raw = sessionStorage.getItem(
      "riwiflow_user"
    );

    return raw ? JSON.parse(raw) : null;
  },

  clear() {
    sessionStorage.removeItem(
      "riwiflow_user"
    );
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
    const res = await fetch(
      `${API_URL}/users`
    );

    return res.json();
  },

  async getTasks() {
    const res = await fetch(
      `${API_URL}/tasks`
    );

    return res.json();
  },

  async createTask(task) {
    const res = await fetch(
      `${API_URL}/tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(task),
      }
    );

    return res.json();
  },

  async updateTask(id, data) {
    const res = await fetch(
      `${API_URL}/tasks/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    return res.json();
  },

  async deleteTask(id) {
    await fetch(
      `${API_URL}/tasks/${id}`,
      {
        method: "DELETE",
      }
    );
  },
};

const STATUSES = [
  "todo",
  "in progress",
  "in review",
  "done",
];

const STATUS_LABELS = {
  todo: "To Do",
  "in progress": "In Progress",
  "in review": "In Review",
  done: "Done",
};

const COLUMN_HEADERS = {
  todo: "To Do",
  "in progress": "In Progress",
  "in review": "In Review",
  done: "Done",
};

function escapeHtml(str) {
  if (!str) return "";

  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const isLoginPage = () =>
  document.getElementById(
    "loginForm"
  ) !== null;

const isBoardPage = () =>
  document.querySelector(
    ".kanban-column"
  ) !== null;

function guardRoutes() {
  if (
    isLoginPage() &&
    Session.isLoggedIn()
  ) {
    window.location.href =
      "board.html";
  }

  if (
    isBoardPage() &&
    !Session.isLoggedIn()
  ) {
    window.location.href =
      "login.html";
  }
}

function createErrorEl() {
  const div =
    document.createElement("div");

  div.className =
    "hidden mt-2 p-3 bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm";

  return div;
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

function initLogin() {
  const form =
    document.getElementById(
      "loginForm"
    );

  if (!form) return;

  const errorEl = createErrorEl();

  form.appendChild(errorEl);

  form.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();

      const email =
        document
          .getElementById("email")
          .value.trim();

      const password =
        document.getElementById(
          "password"
        ).value;

      try {
        const users =
          await Api.getUsers();

        const user = users.find(
          (u) =>
            u.email === email &&
            u.password === password
        );

        if (user) {
          Session.save(user);

          window.location.href =
            "board.html";
        } else {
          showError(
            errorEl,
            "Invalid email or password."
          );
        }
      } catch {
        showError(
          errorEl,
          "Could not connect to server."
        );
      }
    }
  );
}

async function initBoard() {
  const user = Session.get();

  renderTopBar(user);

  if (Session.isAdmin()) {
    renderNewTaskButton();
  }

  await renderBoard();
}

function renderTopBar(user) {
  const header =
    document.querySelector("header");

  if (!header) return;

  const badge =
    document.createElement("span");

  badge.className =
    "font-label-md text-label-md text-on-surface-variant hidden md:block";

  badge.textContent = `${user.name} (${user.role})`;

  const logoutBtn =
    document.createElement("button");

  logoutBtn.className =
    "flex items-center gap-1 text-error font-label-md text-label-md hover:underline ml-2";

  logoutBtn.innerHTML = `
    <span class="material-symbols-outlined text-sm">
      logout
    </span>
    Logout
  `;

  logoutBtn.addEventListener(
    "click",
    () => {
      Session.clear();

      window.location.href =
        "login.html";
    }
  );

  const actions =
    header.querySelector(
      ".flex.items-center.gap-4.ml-4"
    );

  if (actions) {
    actions.insertBefore(
      badge,
      actions.firstChild
    );

    actions.appendChild(logoutBtn);
  }
}

function renderNewTaskButton() {
  const sideBtn =
    document.querySelector(
      "aside button"
    );

  if (!sideBtn) return;

  sideBtn.innerHTML = `
    <span class="material-symbols-outlined" style="margin-right:6px">
      add
    </span>
    New Task
  `;
}

function getColumnContainer(status) {
  const h3s =
    document.querySelectorAll(
      ".kanban-column h3"
    );

  for (const h3 of h3s) {
    if (
      h3.textContent.trim() ===
      COLUMN_HEADERS[status]
    ) {
      return h3
        .closest(".kanban-column")
        .querySelector(
          ".flex-1.space-y-md"
        );
    }
  }

  return null;
}

async function renderBoard() {
  const [tasks, users] =
    await Promise.all([
      Api.getTasks(),
      Api.getUsers(),
    ]);

  document
    .querySelectorAll(
      ".kanban-column .flex-1.space-y-md"
    )
    .forEach((col) => {
      col.innerHTML = "";
    });

  STATUSES.forEach((status) => {
    const count = tasks.filter(
      (t) => t.status === status
    ).length;

    const h3 = [
      ...document.querySelectorAll(
        ".kanban-column h3"
      ),
    ].find(
      (h) =>
        h.textContent.trim() ===
        COLUMN_HEADERS[status]
    );

    if (h3) {
      const badge =
        h3.nextElementSibling;

      if (badge)
        badge.textContent = count;
    }
  });

  tasks.forEach((task) => {
    const assignedUser =
      users.find(
        (u) => u.id === task.userId
      );

    const container =
      getColumnContainer(
        task.status
      );

    if (!container) return;

    const card = buildTaskCard(
      task,
      assignedUser
    );

    container.appendChild(card);
  });

  initDragAndDrop();
}

function buildTaskCard(
  task,
  assignedUser
) {
  const isDone =
    task.status === "done";

  const card =
    document.createElement("div");

  card.className = `
    task-card
    bg-surface
    border
    border-outline-variant
    rounded-xl
    p-md
    shadow-sm
    ${isDone ? "opacity-80" : ""}
  `;

  card.dataset.taskId = task.id;
  card.dataset.userId =
    task.userId;

  card.innerHTML = `
    <div class="flex items-start justify-between mb-xs">

      <span class="bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded-full font-label-sm text-label-sm">
        ${
          STATUS_LABELS[
            task.status
          ]
        }
      </span>

      ${
        isDone
          ? `
        <span
          class="material-symbols-outlined text-sm dnd-check-icon"
          style="font-variation-settings:'FILL' 1;color:#8f4200"
        >
          check_circle
        </span>
      `
          : ""
      }

    </div>

    <h4 class="font-label-md text-label-md text-on-surface mb-xs ${
      isDone
        ? "line-through"
        : ""
    }">
      ${escapeHtml(task.title)}
    </h4>

    <p class="font-body-sm text-body-sm text-on-surface-variant">
      ${escapeHtml(
        task.description
      )}
    </p>

    <div class="mt-md flex items-center justify-between">

      <span class="font-label-sm text-label-sm text-on-surface-variant">
        👤 ${
          assignedUser
            ? escapeHtml(
                assignedUser.name
              )
            : "Coder"
        }
      </span>

    </div>
  `;

  return card;
}

let _draggedCard = null;
let _draggedTaskId = null;

function initDragAndDrop() {
  attachDragToCards();
  attachDropZones();
}

function attachDragToCards() {
  document
    .querySelectorAll(
      ".task-card[data-task-id]"
    )
    .forEach((card) => {
      const taskId =
        card.dataset.taskId;

      card.setAttribute(
        "draggable",
        "true"
      );

      card.addEventListener(
        "dragstart",
        (e) => {
          _draggedCard = card;
          _draggedTaskId = taskId;

          card.classList.add(
            "opacity-50"
          );

          e.dataTransfer.effectAllowed =
            "move";

          e.dataTransfer.dropEffect =
            "move";

          e.dataTransfer.setData(
            "text/plain",
            taskId
          );

          return true;
        }
      );

      card.addEventListener(
        "dragend",
        () => {
          card.classList.remove(
            "opacity-50"
          );

          _draggedCard = null;
          _draggedTaskId = null;
        }
      );
    });
}

function attachDropZones() {
  document
    .querySelectorAll(
      ".kanban-column .flex-1.space-y-md"
    )
    .forEach((zone) => {

      zone.addEventListener(
        "dragover",
        (e) => {
          e.preventDefault();
          return false;
        }
      );

      zone.addEventListener(
        "dragenter",
        (e) => {
          e.preventDefault();
        }
      );

      zone.addEventListener(
        "drop",
        async (e) => {

          e.preventDefault();
          e.stopPropagation();

          if (
            !_draggedCard ||
            !_draggedTaskId
          ) {
            return false;
          }

          const column =
            zone.closest(
              ".kanban-column"
            );

          const newStatus =
            getStatusFromColumn(
              column
            );

          if (!newStatus)
            return false;

          // MOVER SOLO EN DOM
          zone.appendChild(
            _draggedCard
          );

          // CAMBIAR ESTADO VISUAL
          updateCardVisual(
            _draggedCard,
            newStatus
          );

          // ACTUALIZAR CONTADORES
          updateColumnCounts();

          // GUARDAR SIN RECARGAR
          try {
            fetch(
              `${API_URL}/tasks/${_draggedTaskId}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  status:
                    newStatus,
                }),
              }
            );
          } catch (err) {
            console.error(err);
          }

          return false;
        }
      );
    });
}

function getStatusFromColumn(
  columnEl
) {
  const h3 =
    columnEl.querySelector("h3");

  if (!h3) return null;

  const label =
    h3.textContent.trim();

  return (
    Object.keys(
      COLUMN_HEADERS
    ).find(
      (k) =>
        COLUMN_HEADERS[k] ===
        label
    ) || null
  );
}

function updateCardVisual(
  card,
  status
) {
  const badge =
    card.querySelector(
      ".bg-primary-fixed"
    );

  if (badge) {
    badge.textContent =
      STATUS_LABELS[status];
  }

  const title =
    card.querySelector("h4");

  const topRow =
    card.querySelector(
      ".flex.items-start.justify-between.mb-xs"
    );

  const isDone =
    status === "done";

  card.classList.toggle(
    "opacity-80",
    isDone
  );

  if (title) {
    title.classList.toggle(
      "line-through",
      isDone
    );
  }

  let checkIcon =
    topRow.querySelector(
      ".dnd-check-icon"
    );

  if (
    isDone &&
    !checkIcon
  ) {
    checkIcon =
      document.createElement(
        "span"
      );

    checkIcon.className =
      "material-symbols-outlined text-sm dnd-check-icon";

    checkIcon.style.fontVariationSettings =
      "'FILL' 1";

    checkIcon.style.color =
      "#5b07cd";

    checkIcon.textContent =
      "check_circle";

    topRow.appendChild(
      checkIcon
    );
  }

  if (
    !isDone &&
    checkIcon
  ) {
    checkIcon.remove();
  }
}

function updateColumnCounts() {
  document
    .querySelectorAll(
      ".kanban-column"
    )
    .forEach((column) => {
      const count =
        column.querySelectorAll(
          ".task-card"
        ).length;

      const h3 =
        column.querySelector("h3");

      if (
        h3 &&
        h3.nextElementSibling
      ) {
        h3.nextElementSibling.textContent =
          count;
      }
    });
}

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    guardRoutes();

    if (isLoginPage()) {
      initLogin();
    }

    if (isBoardPage()) {
      await initBoard();
    }
  }
);