(() => {
  const STORAGE_KEY = "daymark.tasks.v1";
  const list = document.querySelector("#task-list");
  const empty = document.querySelector("#empty-state");
  const form = document.querySelector("#task-form");
  const titleInput = document.querySelector("#task-title");
  const descriptionInput = document.querySelector("#task-description");
  const priorityInput = document.querySelector("#task-priority");
  const dueInput = document.querySelector("#task-due");
  const error = document.querySelector("#form-error");
  let tasks = loadTasks();
  let filter = "all";
  let editingId = null;

  function loadTasks() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.filter(task =>
        task && typeof task.id === "string" && typeof task.title === "string"
      ) : [];
    } catch { return []; }
  }
  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      return true;
    } catch {
      error.textContent = "Could not save tasks in this browser. Check available storage.";
      return false;
    }
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    })[char]);
  }
  function dateLabel(value) {
    if (!value) return "";
    const date = new Date(value + "T12:00:00");
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, {month:"short", day:"numeric"});
  }
  function isOverdue(task) {
    return !task.completed && task.dueDate && task.dueDate < new Date().toLocaleDateString("en-CA");
  }
  function render() {
    const visible = tasks.filter(task =>
      filter === "all" || (filter === "pending" && !task.completed) ||
      (filter === "completed" && task.completed)
    ).sort((a,b) => Number(a.completed)-Number(b.completed) ||
      (a.dueDate || "9999").localeCompare(b.dueDate || "9999") ||
      ({high:0,medium:1,low:2}[a.priority] - {high:0,medium:1,low:2}[b.priority]));
    document.querySelector("#all-count").textContent = tasks.length;
    document.querySelector("#pending-count").textContent = tasks.filter(t=>!t.completed).length;
    document.querySelector("#completed-count").textContent = tasks.filter(t=>t.completed).length;
    const completed = tasks.filter(t=>t.completed).length;
    const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
    document.querySelector("#progress-label").textContent = percent + "%";
    document.querySelector("#progress-bar").style.width = percent + "%";
    document.querySelector("#progress-caption").textContent = completed + " of " + tasks.length + " tasks complete";
    list.innerHTML = visible.map(task => {
      const due = dateLabel(task.dueDate);
      const late = isOverdue(task);
      return '<article class="task-item '+(task.completed?'is-complete':'')+'" data-id="'+escapeHTML(task.id)+'">' +
        '<input class="task-check" type="checkbox" aria-label="Mark '+escapeHTML(task.title)+' complete" data-action="toggle" '+(task.completed?'checked':'')+'>' +
        '<div class="task-copy"><div class="task-name">'+escapeHTML(task.title)+'</div>' +
        (task.description ? '<div class="task-description">'+escapeHTML(task.description)+'</div>' : '') +
        '<div class="task-meta"><span class="pill '+escapeHTML(task.priority)+'">'+escapeHTML(task.priority[0].toUpperCase()+task.priority.slice(1))+' priority</span>' +
        (late ? '<span class="pill overdue">Overdue</span>' : '') + '</div></div>' +
        (due ? '<div class="task-due '+(late?'late':'')+'">'+(late?'Due ':'')+escapeHTML(due)+'</div>' : '<div class="task-due"></div>') +
        '<div class="task-actions"><button type="button" data-action="edit" aria-label="Edit '+escapeHTML(task.title)+'">Edit</button><button type="button" data-action="delete" aria-label="Delete '+escapeHTML(task.title)+'">Delete</button></div></article>';
    }).join("");
    empty.hidden = visible.length !== 0;
    if (!visible.length) {
      const titles = {all:"A fresh start.",pending:"All caught up.",completed:"Nothing completed yet."};
      const copies = {all:"No tasks yet. Add your first task and make today count.",pending:"No pending tasks. Enjoy the breathing room or add a new task.",completed:"Finish a task and it will show up here."};
      document.querySelector("#empty-title").textContent = titles[filter];
      document.querySelector("#empty-copy").textContent = copies[filter];
      document.querySelector("#empty-add").hidden = filter !== "all";
    }
  }
  function showForm(task = null) {
    editingId = task ? task.id : null;
    form.hidden = false;
    document.querySelector("#form-heading").textContent = task ? "Edit task" : "Create a task";
    document.querySelector("#save-task").textContent = task ? "Save changes" : "Save task";
    titleInput.value = task?.title || "";
    descriptionInput.value = task?.description || "";
    priorityInput.value = task?.priority || "medium";
    dueInput.value = task?.dueDate || "";
    error.textContent = "";
    titleInput.focus();
  }
  function hideForm() { form.hidden = true; editingId = null; error.textContent = ""; form.reset(); priorityInput.value = "medium"; }
  document.querySelector("#open-form").addEventListener("click", () => showForm());
  document.querySelector("#empty-add").addEventListener("click", () => showForm());
  document.querySelector("#cancel-form").addEventListener("click", hideForm);
  document.querySelector("#cancel-form-bottom").addEventListener("click", hideForm);
  document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
    filter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach(item => item.classList.toggle("active", item === button));
    document.querySelector("#list-title").textContent = {all:"All tasks",pending:"Upcoming",completed:"Completed"}[filter];
    document.querySelector("#list-subtitle").textContent = {all:"Your next steps, gathered together.",pending:"What still needs your attention.",completed:"Look how far you have come."}[filter];
    render();
  }));
  form.addEventListener("submit", event => {
    event.preventDefault();
    const title = titleInput.value.trim();
    if (!title) { error.textContent = "Add a title before saving this task."; titleInput.focus(); return; }
    const values = {title, description:descriptionInput.value.trim(), priority:priorityInput.value, dueDate:dueInput.value};
    if (editingId) {
      tasks = tasks.map(task => task.id === editingId ? {...task, ...values} : task);
    } else {
      tasks.push({id:crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+"-"+Math.random().toString(16).slice(2), ...values, completed:false, createdAt:new Date().toISOString()});
    }
    if (saveTasks()) { hideForm(); render(); }
  });
  list.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const article = button.closest("[data-id]");
    const task = tasks.find(item => item.id === article?.dataset.id);
    if (!task) return;
    if (button.dataset.action === "edit") showForm(task);
    if (button.dataset.action === "delete" && window.confirm("Delete this task?")) {
      tasks = tasks.filter(item => item.id !== task.id);
      saveTasks(); render();
    }
  });
  list.addEventListener("change", event => {
    if (event.target.dataset.action !== "toggle") return;
    const article = event.target.closest("[data-id]");
    tasks = tasks.map(task => task.id === article?.dataset.id ? {...task, completed:event.target.checked} : task);
    saveTasks(); render();
  });
  document.querySelector("#today-label").textContent = new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
  render();
})();
