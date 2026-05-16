/* ============================
   COMMAND CENTER — app.js
   ============================ */

// ── State ──────────────────────────────────────────
let tasks = JSON.parse(localStorage.getItem('cc_tasks') || '[]');
let selectedPriority = 'low';
let currentFilter   = 'all';
let sortByPriority  = false;

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

// ── DOM Refs ───────────────────────────────────────
const taskInput      = document.getElementById('taskInput');
const addBtn         = document.getElementById('addBtn');
const taskList       = document.getElementById('taskList');
const emptyState     = document.getElementById('emptyState');
const taskCount      = document.getElementById('taskCount');
const activeCount    = document.getElementById('activeCount');
const completedCount = document.getElementById('completedCount');
const charCount      = document.getElementById('charCount');
const clearBtn       = document.getElementById('clearCompleted');
const clockEl        = document.getElementById('clock');

// ── Clock ──────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
updateClock();
setInterval(updateClock, 1000);

// ── Persistence ────────────────────────────────────
function save() {
  localStorage.setItem('cc_tasks', JSON.stringify(tasks));
}

// ── Render ─────────────────────────────────────────
function getFilteredTasks() {
  let list = [...tasks];
  if (currentFilter === 'active')    list = list.filter(t => !t.done);
  if (currentFilter === 'completed') list = list.filter(t => t.done);
  if (sortByPriority) list.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  return list;
}

function render() {
  const filtered = getFilteredTasks();
  taskList.innerHTML = '';

  filtered.forEach(task => {
    const li = createTaskEl(task);
    taskList.appendChild(li);
  });

  // Empty state
  emptyState.classList.toggle('visible', filtered.length === 0);

  // Counters
  const done    = tasks.filter(t => t.done).length;
  const active  = tasks.length - done;
  taskCount.textContent      = tasks.length;
  activeCount.textContent    = active;
  completedCount.textContent = done;

  save();
}

// ── Build Task Element ─────────────────────────────
function createTaskEl(task) {
  const li = document.createElement('li');
  li.className = `task-item${task.done ? ' completed' : ''}`;
  li.dataset.id       = task.id;
  li.dataset.priority = task.priority;

  li.innerHTML = `
    <input type="checkbox" class="task-checkbox" ${task.done ? 'checked' : ''} aria-label="Mark complete"/>
    <span class="task-text">${escapeHTML(task.text)}</span>
    <span class="priority-badge">${task.priority.toUpperCase()}</span>
    <div class="task-actions">
      <button class="action-btn promote-btn" title="Cycle Priority">⬆</button>
      <button class="action-btn delete-btn"  title="Delete">✕</button>
    </div>
  `;

  // Checkbox
  li.querySelector('.task-checkbox').addEventListener('change', () => toggleDone(task.id));

  // Text click toggles too
  li.querySelector('.task-text').addEventListener('click', () => toggleDone(task.id));

  // Promote priority
  li.querySelector('.promote-btn').addEventListener('click', () => promotePriority(task.id));

  // Delete
  li.querySelector('.delete-btn').addEventListener('click', () => deleteTask(li, task.id));

  return li;
}

// ── Actions ────────────────────────────────────────
function addTask() {
  const text = taskInput.value.trim();
  if (!text) {
    taskInput.classList.add('shake');
    taskInput.addEventListener('animationend', () => taskInput.classList.remove('shake'), { once: true });
    return;
  }

  const task = {
    id:       Date.now(),
    text,
    done:     false,
    priority: selectedPriority,
    created:  Date.now()
  };

  tasks.unshift(task);
  taskInput.value = '';
  charCount.textContent = '0';
  render();
  taskInput.focus();
}

function toggleDone(id) {
  const task = tasks.find(t => t.id === id);
  if (task) task.done = !task.done;
  render();
}

function promotePriority(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const cycle = { low: 'medium', medium: 'high', high: 'low' };
  task.priority = cycle[task.priority];
  render();
}

function deleteTask(li, id) {
  li.classList.add('removing');
  li.addEventListener('animationend', () => {
    tasks = tasks.filter(t => t.id !== id);
    render();
  }, { once: true });
}

function clearCompleted() {
  const completedEls = taskList.querySelectorAll('.task-item.completed');
  if (!completedEls.length) return;

  let removed = 0;
  completedEls.forEach(el => {
    el.classList.add('removing');
    el.addEventListener('animationend', () => {
      removed++;
      if (removed === completedEls.length) {
        tasks = tasks.filter(t => !t.done);
        render();
      }
    }, { once: true });
  });
}

// ── Priority Selector ──────────────────────────────
document.querySelectorAll('.priority-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedPriority = btn.dataset.priority;
  });
});

// ── Filter Buttons ─────────────────────────────────
document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

// Sort toggle
document.querySelector('.sort-btn').addEventListener('click', function() {
  sortByPriority = !sortByPriority;
  this.classList.toggle('active', sortByPriority);
  render();
});

// Clear completed
clearBtn.addEventListener('click', clearCompleted);

// ── Input Events ───────────────────────────────────
addBtn.addEventListener('click', addTask);

taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

taskInput.addEventListener('input', () => {
  charCount.textContent = taskInput.value.length;
});

// ── Shake keyframe (injected) ──────────────────────
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  .shake { animation: shake 0.35s ease; border-color: var(--accent2) !important; }
`;
document.head.appendChild(shakeStyle);

// ── Helpers ────────────────────────────────────────
function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Seed data if empty ─────────────────────────────
if (tasks.length === 0) {
  tasks = [
    { id: 1, text: 'Review project specifications', done: false, priority: 'high',   created: Date.now() },
    { id: 2, text: 'Set up development environment', done: true,  priority: 'medium', created: Date.now() },
    { id: 3, text: 'Write unit tests for auth module', done: false, priority: 'medium', created: Date.now() },
    { id: 4, text: 'Update documentation', done: false, priority: 'low', created: Date.now() },
  ];
}

// ── Initial render ─────────────────────────────────
render();
