const MODAL_INPUT_CLASS =
  "w-full px-md py-2 bg-white border border-outline-variant rounded-lg " +
  "font-body-sm text-body-sm text-on-surface focus:outline-none " +
  "focus:border-primary focus:ring-2 focus:ring-primary-fixed transition-all";

function createOverlay(onClose) {
  const overlay = document.createElement("div");
  overlay.id = "admin-modal-overlay";
  overlay.className =
    "fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4";
  overlay.addEventListener("click", (e) => { if (e.target === overlay) onClose(); });
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

function makeCancelBtn() {
  const btn = document.createElement("button");
  btn.className =
    "flex-1 py-md border border-outline-variant rounded-lg font-label-md " +
    "text-label-md text-on-surface hover:bg-surface-container-low transition-colors";
  btn.textContent = "Cancel";
  btn.addEventListener("click", closeAdminModal);
  return btn;
}

function buildTaskForm(users, prefill = {}) {
  const form = document.createElement("div");
  form.className = "space-y-lg";

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.placeholder = "Task title";
  titleInput.className = MODAL_INPUT_CLASS;
  titleInput.value = prefill.title || "";
  const titleField = createField("Title *", titleInput);

  const descInput = document.createElement("textarea");
  descInput.rows = 3;
  descInput.placeholder = "Describe the task…";
  descInput.className = MODAL_INPUT_CLASS + " resize-none";
  descInput.value = prefill.description || "";
  const descField = createField("Description", descInput);

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

  const generalError = document.createElement("p");
  generalError.className = "hidden font-body-sm text-body-sm text-error";

  form.appendChild(titleField.wrapper);
  form.appendChild(descField.wrapper);
  form.appendChild(statusField.wrapper);
  form.appendChild(assignField.wrapper);
  form.appendChild(generalError);

  return { form, titleInput, descInput, statusSelect, assignSelect, titleField, generalError };
}

async function openNewTaskModal() {
  closeAdminModal();
  let users = [];
  try { users = await Api.getUsers(); } catch (e) { console.error(e); }

  const overlay = createOverlay(closeAdminModal);
  const box     = createModalBox("New Task");
  const { form, titleInput, descInput, statusSelect, assignSelect, titleField, generalError } =
    buildTaskForm(users);

  const btnRow = document.createElement("div");
  btnRow.className = "flex gap-md pt-sm";

  const submitBtn = document.createElement("button");
  submitBtn.className =
    "flex-1 py-md bg-primary text-on-primary rounded-lg font-label-md " +
    "text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm";
  submitBtn.innerHTML =
    '<span class="material-symbols-outlined text-[18px]">add</span> Create Task';

  submitBtn.addEventListener("click", async () => {
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

  btnRow.appendChild(makeCancelBtn());
  btnRow.appendChild(submitBtn);
  form.appendChild(btnRow);
  box.appendChild(form);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  titleInput.focus();
}

async function openEditTaskModal(task) {
  closeAdminModal();
  let users = [];
  try { users = await Api.getUsers(); } catch (e) { console.error(e); }

  const overlay = createOverlay(closeAdminModal);
  const box     = createModalBox("Edit Task");
  const { form, titleInput, descInput, statusSelect, assignSelect, titleField, generalError } =
    buildTaskForm(users, task);

  const btnRow = document.createElement("div");
  btnRow.className = "flex gap-md pt-sm";

  const deleteBtn = document.createElement("button");
  deleteBtn.className =
    "py-md px-lg border border-error text-error rounded-lg font-label-md " +
    "text-label-md hover:bg-error-container transition-colors flex items-center gap-1";
  deleteBtn.innerHTML =
    '<span class="material-symbols-outlined text-[18px]">delete</span>';
  deleteBtn.title = "Delete task";
  deleteBtn.addEventListener("click", () => openDeleteTaskModal(task));

  const saveBtn = document.createElement("button");
  saveBtn.className =
    "flex-1 py-md bg-primary text-on-primary rounded-lg font-label-md " +
    "text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm";
  saveBtn.innerHTML =
    '<span class="material-symbols-outlined text-[18px]">save</span> Save Changes';

  saveBtn.addEventListener("click", async () => {
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

  // Fila: [delete] [cancel] [save]
  btnRow.appendChild(deleteBtn);
  btnRow.appendChild(makeCancelBtn());
  btnRow.appendChild(saveBtn);
  form.appendChild(btnRow);
  box.appendChild(form);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  titleInput.focus();
}


function openDeleteTaskModal(task) {
  closeAdminModal();

  const overlay = createOverlay(closeAdminModal);
  const box     = createModalBox("Delete Task");

  const msg = document.createElement("p");
  msg.className = "font-body-md text-body-md text-on-surface-variant";
  msg.innerHTML =
    'Are you sure you want to delete <strong class="text-on-surface">' +
    escapeHtml(task.title) +
    "</strong>? This action cannot be undone.";

  const errorEl = document.createElement("p");
  errorEl.className = "hidden font-body-sm text-body-sm text-error";

  const btnRow = document.createElement("div");
  btnRow.className = "flex gap-md pt-sm";

  const confirmBtn = document.createElement("button");
  confirmBtn.className =
    "flex-1 py-md bg-error text-on-error rounded-lg font-label-md " +
    "text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm";
  confirmBtn.innerHTML =
    '<span class="material-symbols-outlined text-[18px]">delete_forever</span> Yes, delete';

  confirmBtn.addEventListener("click", async () => {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML =
      '<span class="material-symbols-outlined text-[18px] animate-spin">autorenew</span> Deleting…';

    try {
      await Api.deleteTask(task.id);
      showSuccessAndClose("Task deleted.");
      setTimeout(async () => { await renderBoard(); }, 1600);
    } catch (err) {
      errorEl.textContent = "Could not delete task. Check the server.";
      errorEl.classList.remove("hidden");
      confirmBtn.disabled = false;
      confirmBtn.innerHTML =
        '<span class="material-symbols-outlined text-[18px]">delete_forever</span> Yes, delete';
    }
  });

  btnRow.appendChild(makeCancelBtn());
  btnRow.appendChild(confirmBtn);

  const content = document.createElement("div");
  content.className = "space-y-lg";
  content.appendChild(msg);
  content.appendChild(errorEl);
  content.appendChild(btnRow);

  box.appendChild(content);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}


function openNewUserModal() {
  closeAdminModal();

  const overlay = createOverlay(closeAdminModal);
  const box     = createModalBox("New User");
  const form    = document.createElement("div");
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

  const roleSelect = document.createElement("select");
  roleSelect.className = MODAL_INPUT_CLASS;
  ["admin", "coder"].forEach((r) => {
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

  const submitBtn = document.createElement("button");
  submitBtn.className =
    "flex-1 py-md bg-primary text-on-primary rounded-lg font-label-md " +
    "text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm";
  submitBtn.innerHTML =
    '<span class="material-symbols-outlined text-[18px]">person_add</span> Create User';

  submitBtn.addEventListener("click", async () => {
    const nameVal  = nameInput.value.trim();
    const emailVal = emailInput.value.trim();
    const passVal  = passInput.value;
    let valid = true;

    if (!nameVal) {
      nameField.errorMsg.textContent = "Name is required.";
      nameField.errorMsg.classList.remove("hidden");
      valid = false;
    } else { nameField.errorMsg.classList.add("hidden"); }

    if (!emailVal || !emailVal.includes("@")) {
      emailField.errorMsg.textContent = "Enter a valid email.";
      emailField.errorMsg.classList.remove("hidden");
      valid = false;
    } else { emailField.errorMsg.classList.add("hidden"); }

    if (!passVal || passVal.length < 4) {
      passField.errorMsg.textContent = "Password must be at least 4 characters.";
      passField.errorMsg.classList.remove("hidden");
      valid = false;
    } else { passField.errorMsg.classList.add("hidden"); }

    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<span class="material-symbols-outlined text-[18px] animate-spin">autorenew</span> Saving…';

    const newUser = {
      id: generateId(), name: nameVal, email: emailVal,
      password: passVal, role: roleSelect.value
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

  btnRow.appendChild(makeCancelBtn());
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

  const sidebar = document.querySelector("aside");
  if (!sidebar) return;

  // "New Project" existente → abre modal de nueva tarea
  const newProjectBtn = sidebar.querySelector(".px-4.mt-auto button");
  if (newProjectBtn) {
    newProjectBtn.addEventListener("click", openNewTaskModal);
  }

  // Inyectar botón "New User" debajo de "New Project"
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