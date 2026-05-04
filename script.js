const API = 'https://focus-buddy-system.onrender.com/api/items';

let currentFilter = 'all';
const visibleTasks = new Map();

window.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadTasks();
});

// =============================================================================
// UI HELPERS
// =============================================================================

function showBanner() {
  document.getElementById('conn-banner').style.display = 'block';
}

function hideBanner() {
  document.getElementById('conn-banner').style.display = 'none';
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `show ${type}`;

  setTimeout(() => {
    toast.className = '';
  }, 3000);
}

function renderEmptyState(title, message) {
  document.getElementById('task-list').innerHTML = `
    <div class="empty-state">
      <h3>${title}</h3>
      <p>${message}</p>
    </div>`;
  document.getElementById('list-count').textContent = '0';
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

async function loadTasks() {
  // ENDPOINT #2 — GET /api/items — Get all tasks
  let url = API;

  // ENDPOINT #5 — GET /api/items/completed — Completed tasks only
  if (currentFilter === 'completed') url = `${API}/completed`;

  // ENDPOINT #6 — GET /api/items/pending — Pending tasks only
  if (currentFilter === 'pending')   url = `${API}/pending`;

  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (!data.success) {
      showToast('Error loading tasks', 'error');
      return;
    }

    hideBanner();

    const tasks = data.data || [];

    if (tasks.length === 0) {
      renderEmptyState('Nothing here yet', 'Add a task above to get started.');
      return;
    }

    renderTasks(tasks);

  } catch (err) {
    showBanner();
    showToast('Cannot reach the API', 'error');
    document.getElementById('task-list').innerHTML = '';
    console.error('loadTasks error:', err);
  }
}

async function loadStats() {
  try {
    // ENDPOINT #3 — GET /api/items/stats — Get task statistics
    const res = await fetch(`${API}/stats`);
    const data = await res.json();

    if (data.success && data.data) {
      hideBanner();
      document.getElementById('stat-total').textContent = data.data.total     || 0;
      document.getElementById('stat-done').textContent  = data.data.completed || 0;
      document.getElementById('stat-pend').textContent  = data.data.pending   || 0;
    } else {
      showToast('Error loading stats', 'error');
    }
  } catch (err) {
    showBanner();
    showToast('Cannot reach the API', 'error');
    console.error('loadStats error:', err);
  }
}

async function searchTasks(query) {
  try {
    // ENDPOINT #4 — GET /api/items/search?title=... — Search tasks by title
    const res  = await fetch(`${API}/search?title=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!data.success) {
      showToast('Error searching tasks', 'error');
      return;
    }

    hideBanner();

    const tasks = data.data || [];

    if (tasks.length === 0) {
      renderEmptyState('No tasks found', 'Try a different keyword.');
      return;
    }

    renderTasks(tasks);

  } catch (err) {
    showBanner();
    showToast('Cannot reach the API', 'error');
    console.error('searchTasks error:', err);
  }
}

async function getTask(id) {
  try {
    // ENDPOINT #7 — GET /api/items/:id — Get single task by ID
    const res  = await fetch(`${API}/${id}`);
    const data = await res.json();

    if (!data.success) return null;

    return data.data || null;
  } catch (err) {
    console.error('getTask error:', err);
    return null;
  }
}

async function addTask() {
  const title = document.getElementById('new-title').value.trim();
  const desc  = document.getElementById('new-desc').value.trim();

  if (!title) {
    showToast('Please enter a task title', 'error');
    return;
  }

  try {
    // ENDPOINT #8 — POST /api/items — Create a new task
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc }),
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('new-title').value = '';
      document.getElementById('new-desc').value  = '';

      showToast('Task added!', 'success');
      hideBanner();
      loadStats();
      loadTasks();
    } else {
      showToast('Error adding task', 'error');
    }
  } catch (err) {
    showBanner();
    showToast('Cannot reach the API', 'error');
    console.error('addTask error:', err);
  }
}

async function toggleTask(id, status) {
  const newStatus = status === 'completed' ? 'pending' : 'completed';

  try {
    // ENDPOINT #9 — PUT /api/items/:id — Update a task (toggle status)
    const res = await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();

    if (data.success) {
      hideBanner();
      showToast(
        newStatus === 'completed' ? 'Task completed' : 'Task marked as pending',
        'success'
      );
      loadStats();
      loadTasks();
    } else {
      showToast('Error updating task', 'error');
    }
  } catch (err) {
    showBanner();
    showToast('Cannot reach the API', 'error');
    console.error('toggleTask error:', err);
  }
}

async function saveEdit(id) {
  const title = document.getElementById(`edit-title-${id}`).value.trim();
  const desc  = document.getElementById(`edit-desc-${id}`).value.trim();

  if (!title) {
    showToast("Title can't be empty", 'error');
    return;
  }

  try {
    // ENDPOINT #9 — PUT /api/items/:id — Update a task (edit title/description)
    const res = await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc }),
    });
    const data = await res.json();

    if (data.success) {
      hideBanner();
      showToast('Task updated!', 'success');
      loadStats();
      loadTasks();
    } else {
      showToast('Error updating task', 'error');
    }
  } catch (err) {
    showBanner();
    showToast('Cannot reach the API', 'error');
    console.error('saveEdit error:', err);
  }
}

async function confirmDelete(id) {
  try {
    // ENDPOINT #10 — DELETE /api/items/:id — Delete a task
    const res = await fetch(`${API}/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();

    if (data.success) {
      hideBanner();
      showToast('Task deleted', 'error');
      loadStats();
      loadTasks();
    } else {
      showToast('Error deleting task', 'error');
    }
  } catch (err) {
    showBanner();
    showToast('Cannot reach the API', 'error');
    console.error('confirmDelete error:', err);
  }
}

// =============================================================================
// RENDERING
// =============================================================================

function renderTasks(tasks) {
  const taskList = document.getElementById('task-list');
  visibleTasks.clear();
  let tasksHTML = '';

  tasks.forEach((task) => {
    const status = task.status === 'completed' ? 'completed' : 'pending';
    const title = escapeHTML(task.title);
    const description = escapeHTML(task.description || '');

    visibleTasks.set(String(task.id), { ...task, status });

    const taskHTML = `
      <div class="task-card ${status}" role="button" tabindex="0" data-task-id="${escapeHTML(task.id)}" onclick="openTaskDetails(event, this.dataset.taskId)" onkeydown="handleTaskCardKey(event, this.dataset.taskId)">

        <div class="task-check" onclick="toggleTask(${task.id}, '${status}')"></div>

        <div class="task-body">

          <div class="task-title">${title}</div>

          ${description ? `<div class="task-desc">${description}</div>` : ''}

          <div class="task-meta">
            <span class="task-status ${status}">
              ${status === 'completed' ? 'Done' : 'Pending'}
            </span>
          </div>

          <div class="edit-form" id="edit-${task.id}">
            <input type="text" id="edit-title-${task.id}" value="${title}" placeholder="Task title">
            <input type="text" id="edit-desc-${task.id}" value="${description}" placeholder="Description (optional)">
            <div class="edit-actions">
              <button class="btn btn-primary" onclick="saveEdit(${task.id})">Save</button>
              <button class="btn btn-ghost"   onclick="cancelEdit(${task.id})">Cancel</button>
            </div>
          </div>

          <div class="delete-confirm" id="delete-confirm-${task.id}">
            <span class="delete-confirm-text">Are you sure?</span>
            <button class="btn btn-danger" onclick="confirmDelete(${task.id})">Yes, delete</button>
            <button class="btn btn-ghost"  onclick="cancelDelete(${task.id})">Cancel</button>
          </div>

        </div>

        <div class="task-actions">

          ${status === 'completed'
            ? `<button class="btn btn-undo" onclick="toggleTask(${task.id}, 'completed')">Undo</button>`
            : `<button class="btn btn-done" onclick="toggleTask(${task.id}, 'pending')">Done</button>`
          }

          <button class="btn btn-danger" onclick="showDeleteConfirm(${task.id})">Delete</button>

        </div>
      </div>`;

    tasksHTML += taskHTML;
  });

  taskList.innerHTML = tasksHTML;
  document.getElementById('list-count').textContent = tasks.length;
}

// =============================================================================
// TASK DETAIL MODAL
// =============================================================================

function shouldIgnoreTaskDetailsOpen(event) {
  return event.target.closest(
    '.task-check, .task-actions, .edit-form, .delete-confirm, button, input, textarea, select, a'
  );
}

function ensureTaskDetailsModal() {
  let modal = document.getElementById('task-details-modal');

  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'task-details-modal';
  modal.className = 'task-modal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="task-modal-panel" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
      <div class="task-modal-topline">
        <span class="task-modal-eyebrow">Task details</span>
        <button class="btn task-modal-edit-btn" type="button" onclick="openModalEdit()" aria-label="Edit task" title="Edit task">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      </div>
      <div class="task-modal-head">
        <h2 id="task-modal-title"></h2>
      </div>
      <div class="task-modal-status-row">
        <span id="task-modal-status" class="task-modal-status"></span>
      </div>
      <div id="task-modal-view" class="task-modal-view">
        <div class="task-modal-section">
          <span class="task-modal-label">Details</span>
          <p id="task-modal-desc" class="task-modal-desc"></p>
        </div>
      </div>
      <div id="task-modal-edit-form" class="task-modal-edit-form">
        <div class="task-modal-section">
          <span class="task-modal-label">Edit Task</span>
          <input type="text" id="task-modal-edit-title" placeholder="Task title" class="task-modal-input">
          <textarea id="task-modal-edit-desc" placeholder="Description (optional)" class="task-modal-textarea"></textarea>
        </div>
      </div>
      <div class="task-modal-footer">
        <button class="btn btn-ghost task-modal-action" type="button" id="task-modal-cancel-btn" onclick="closeModalEdit()">Cancel</button>
        <button class="btn btn-primary task-modal-action" type="button" id="task-modal-save-btn" onclick="saveModalEdit()">Save Changes</button>
        <button class="btn btn-ghost task-modal-action" type="button" id="task-modal-close-btn" onclick="closeTaskDetails()">Close</button>
      </div>
    </div>`;

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeTaskDetails();
  });

  document.body.appendChild(modal);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeTaskDetails();
  });

  return modal;
}

function renderTaskDetails(task) {
  const modal = ensureTaskDetailsModal();
  const status = task.status === 'completed' ? 'completed' : 'pending';

  modal.dataset.taskId = task.id;
  document.getElementById('task-modal-title').textContent = task.title || 'Untitled task';
  document.getElementById('task-modal-desc').textContent = task.description || 'No details added yet.';
  
  // Pre-populate edit form
  document.getElementById('task-modal-edit-title').value = task.title || '';
  document.getElementById('task-modal-edit-desc').value = task.description || '';

  const statusEl = document.getElementById('task-modal-status');
  statusEl.textContent = status === 'completed' ? 'Completed' : 'Pending';
  statusEl.className = `task-modal-status ${status}`;
  
  // Ensure modal starts in view mode, not edit mode
  closeModalEdit();
}

async function openTaskDetails(event, id) {
  if (event && shouldIgnoreTaskDetailsOpen(event)) return;

  const modal = ensureTaskDetailsModal();
  const cachedTask = visibleTasks.get(String(id));

  if (cachedTask) {
    renderTaskDetails(cachedTask);
  } else {
    renderTaskDetails({ id, title: 'Loading task...', description: '', status: 'pending' });
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  const closeButton = modal.querySelector('.task-modal-close');
  if (closeButton) closeButton.focus();

  // ENDPOINT #7 — GET /api/items/:id — Get single task by ID (fresh fetch for modal)
  const latestTask = await getTask(id);
  if (latestTask && modal.dataset.taskId === String(id)) {
    renderTaskDetails(latestTask);
  }
}

function handleTaskCardKey(event, id) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  openTaskDetails(event, id);
}

function closeTaskDetails() {
  const modal = document.getElementById('task-details-modal');
  if (!modal) return;

  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

// =============================================================================
// EDIT FLOW
// =============================================================================

async function openEdit(id) {
  // ENDPOINT #7 — GET /api/items/:id — Get single task by ID (prefill edit form)
  const task = await getTask(id);

  if (!task) {
    showToast('Could not load task', 'error');
    return;
  }

  document.querySelectorAll('.edit-form').forEach((f) => f.classList.remove('open'));
  document.querySelectorAll('.delete-confirm').forEach((d) => d.classList.remove('open'));

  document.getElementById(`edit-${id}`).classList.add('open');
  document.getElementById(`edit-title-${id}`).value = task.title;
  document.getElementById(`edit-desc-${id}`).value  = task.description || '';
}

function cancelEdit(id) {
  document.getElementById(`edit-${id}`).classList.remove('open');
}

function openModalEdit() {
  const viewEl = document.getElementById('task-modal-view');
  const editFormEl = document.getElementById('task-modal-edit-form');
  const cancelBtn = document.getElementById('task-modal-cancel-btn');
  const saveBtn = document.getElementById('task-modal-save-btn');
  const closeBtn = document.getElementById('task-modal-close-btn');
  
  viewEl.style.display = 'none';
  editFormEl.style.display = 'block';
  cancelBtn.style.display = 'inline-flex';
  saveBtn.style.display = 'inline-flex';
  closeBtn.style.display = 'none';
  
  document.getElementById('task-modal-edit-title').focus();
}

function closeModalEdit() {
  const viewEl = document.getElementById('task-modal-view');
  const editFormEl = document.getElementById('task-modal-edit-form');
  const cancelBtn = document.getElementById('task-modal-cancel-btn');
  const saveBtn = document.getElementById('task-modal-save-btn');
  const closeBtn = document.getElementById('task-modal-close-btn');
  
  viewEl.style.display = 'block';
  editFormEl.style.display = 'none';
  cancelBtn.style.display = 'none';
  saveBtn.style.display = 'none';
  closeBtn.style.display = 'inline-flex';
}

async function saveModalEdit() {
  const modal = document.getElementById('task-details-modal');
  const taskId = modal.dataset.taskId;
  const title = document.getElementById('task-modal-edit-title').value.trim();
  const desc = document.getElementById('task-modal-edit-desc').value.trim();

  if (!title) {
    showToast("Title can't be empty", 'error');
    return;
  }

  try {
    // ENDPOINT #9 — PUT /api/items/:id — Update a task (save from modal edit form)
    const res = await fetch(`${API}/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc }),
    });
    const data = await res.json();

    if (data.success) {
      hideBanner();
      showToast('Task updated!', 'success');
      closeModalEdit();
      loadStats();
      loadTasks();
    } else {
      showToast('Error updating task', 'error');
    }
  } catch (err) {
    showBanner();
    showToast('Cannot reach the API', 'error');
    console.error('saveModalEdit error:', err);
  }
}

// =============================================================================
// DELETE FLOW
// =============================================================================

function showDeleteConfirm(id) {
  document.querySelectorAll('.delete-confirm').forEach((d) => d.classList.remove('open'));
  document.querySelectorAll('.edit-form').forEach((f) => f.classList.remove('open'));
  document.getElementById('delete-confirm-' + id).classList.add('open');
}

function cancelDelete(id) {
  document.getElementById('delete-confirm-' + id).classList.remove('open');
}

// =============================================================================
// FILTER TABS
// =============================================================================

function setFilter(filter, btn) {
  currentFilter = filter;

  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');

  document.getElementById('search-input').value = '';

  loadTasks();
}

// =============================================================================
// SEARCH HANDLER
// =============================================================================

async function onSearch(val) {
  if (!val.trim()) {
    loadTasks();
    return;
  }

  await searchTasks(val);
}
