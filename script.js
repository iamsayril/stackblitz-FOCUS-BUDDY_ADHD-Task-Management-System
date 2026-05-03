// =============================================================================
// FOCUS BUDDY — ADHD Task Management System
// SIA101 Prefinal Project | April 18, 2026
// =============================================================================
// Base API URL — all requests go through this endpoint
// Deployed on Render: https://focus-buddy-api.onrender.com
// (Note: the variable below uses the StackBlitz dev/test version)
// =============================================================================

const API = 'https://stackblitz-task-manager-1.onrender.com/api/items';

let currentFilter = 'all';
const visibleTasks = new Map(); // Caches currently displayed tasks for quick access

// -----------------------------------------------------------------------------
// On page load: fetch stats and task list right away
// -----------------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadTasks();
});

// =============================================================================
// UI HELPERS — Banner, Toast, Empty State
// =============================================================================

function showBanner() {
  document.getElementById('conn-banner').style.display = 'block';
}

function hideBanner() {
  document.getElementById('conn-banner').style.display = 'none';
}

// Shows a temporary pop-up notification at the bottom of the screen
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `show ${type}`;

  setTimeout(() => {
    toast.className = '';
  }, 3000);
}

// Displays a placeholder message when no tasks exist in the current view
function renderEmptyState(title, message) {
  document.getElementById('task-list').innerHTML = `
    <div class="empty-state">
      <h3>${title}</h3>
      <p>${message}</p>
    </div>`;
  document.getElementById('list-count').textContent = '0';
}

// =============================================================================
// ENDPOINT #3 — GET /api/items/stats
// Purpose   : Fetches overall task statistics (total, completed, pending)
// Response  : { success, data: { total, completed, pending }, message }
// Used for  : Updating the stats panel at the top of the UI
// =============================================================================
async function loadStats() {
  try {
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

// =============================================================================
// ENDPOINT #2 — GET /api/items            → loads ALL tasks
// ENDPOINT #5 — GET /api/items/completed  → loads COMPLETED tasks only
// ENDPOINT #6 — GET /api/items/pending    → loads PENDING tasks only
// Purpose   : Fetches the task list based on the currently active filter tab
// Response  : { success, data: [ ...tasks ], message }
// Used for  : Populating the main task list on load and after filter changes
// =============================================================================
async function loadTasks() {
  let url = API; // Default → Endpoint #2: GET /api/items (all tasks)

  if (currentFilter === 'completed') url = `${API}/completed`; // Endpoint #5
  if (currentFilter === 'pending')   url = `${API}/pending`;   // Endpoint #6

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

// =============================================================================
// ENDPOINT #4 — GET /api/items/search?title=...
// Purpose   : Searches tasks by keyword in the title (fuzzy, case-insensitive)
// Params    : query — the search string typed by the user
// Response  : { success, data: [ ...matchingTasks ], message }
// Used for  : Real-time search as the user types in the search input
// =============================================================================
async function searchTasks(query) {
  try {
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

// =============================================================================
// ENDPOINT #7 — GET /api/items/:id
// Purpose   : Fetches a single task by its unique ID
// Params    : id — the task's numeric ID
// Response  : { success, data: { id, title, description, status, createdAt }, message }
// Used for  : Loading the task details modal + pre-filling the edit form
// =============================================================================
async function getTask(id) {
  try {
    const res  = await fetch(`${API}/${id}`);
    const data = await res.json();

    if (!data.success) return null;

    return data.data || null;
  } catch (err) {
    console.error('getTask error:', err);
    return null;
  }
}

// =============================================================================
// TASK DETAIL MODAL — UI logic for showing/closing the task details panel
// (Uses Endpoint #7 internally via getTask())
// =============================================================================

// Checks if a click on a task card should be ignored (e.g., clicked a button)
function shouldIgnoreTaskDetailsOpen(event) {
  return event.target.closest(
    '.task-check, .task-actions, .edit-form, .delete-confirm, button, input, textarea, select, a'
  );
}

// Creates the modal element if it doesn't exist yet, then returns it
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
        <button class="task-modal-close" type="button" onclick="closeTaskDetails()" aria-label="Close task details">&times;</button>
      </div>
      <div class="task-modal-head">
        <h2 id="task-modal-title"></h2>
      </div>
      <div class="task-modal-status-row">
        <span id="task-modal-status" class="task-modal-status"></span>
      </div>
      <div class="task-modal-section">
        <span class="task-modal-label">Details</span>
        <p id="task-modal-desc" class="task-modal-desc"></p>
      </div>
      <div class="task-modal-footer">
        <button class="btn btn-ghost task-modal-action" type="button" onclick="closeTaskDetails()">Close</button>
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

// Populates the modal with the given task's data
function renderTaskDetails(task) {
  const modal = ensureTaskDetailsModal();
  const status = task.status === 'completed' ? 'completed' : 'pending';

  modal.dataset.taskId = task.id;
  document.getElementById('task-modal-title').textContent = task.title || 'Untitled task';
  document.getElementById('task-modal-desc').textContent = task.description || 'No details added yet.';

  const statusEl = document.getElementById('task-modal-status');
  statusEl.textContent = status === 'completed' ? 'Completed' : 'Pending';
  statusEl.className = `task-modal-status ${status}`;
}

// Opens the modal — shows cached task first, then fetches fresh data from Endpoint #7
async function openTaskDetails(event, id) {
  if (event && shouldIgnoreTaskDetailsOpen(event)) return;

  const modal = ensureTaskDetailsModal();
  const cachedTask = visibleTasks.get(String(id));

  if (cachedTask) {
    renderTaskDetails(cachedTask); // Show immediately from cache
  } else {
    renderTaskDetails({ id, title: 'Loading task...', description: '', status: 'pending' });
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  const closeButton = modal.querySelector('.task-modal-close');
  if (closeButton) closeButton.focus();

  // Then fetch the latest version from the API (Endpoint #7)
  const latestTask = await getTask(id);
  if (latestTask && modal.dataset.taskId === String(id)) {
    renderTaskDetails(latestTask);
  }
}

// Handles keyboard interaction (Enter / Space) on a task card
function handleTaskCardKey(event, id) {
  if (event.key !== 'Enter' && event.key !== ' ') return;

  event.preventDefault();
  openTaskDetails(event, id);
}

// Closes and hides the task details modal
function closeTaskDetails() {
  const modal = document.getElementById('task-details-modal');
  if (!modal) return;

  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

// =============================================================================
// RENDERING HELPERS — Escape HTML and build task card HTML
// =============================================================================

// Prevents XSS by escaping special characters before inserting into the DOM
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

// Builds and injects all task cards into the task list container
function renderTasks(tasks) {
  const taskList = document.getElementById('task-list');
  visibleTasks.clear();
  let tasksHTML = '';

  tasks.forEach((task) => {
    const status = task.status === 'completed' ? 'completed' : 'pending';
    const title = escapeHTML(task.title);
    const description = escapeHTML(task.description || '');

    // Store task in memory map for fast access without another API call
    visibleTasks.set(String(task.id), {
      ...task,
      status,
    });

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

          <button class="btn btn-edit" onclick="openEdit(${task.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit
          </button>

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
// ENDPOINT #8 — POST /api/items
// Purpose   : Creates a brand-new task
// Body      : { title (required), description (optional) }
// Response  : { success, data: { id, title, description, status, createdAt }, message }
// Used for  : The "Add Task" form at the top of the page
// =============================================================================
async function addTask() {
  const title = document.getElementById('new-title').value.trim();
  const desc  = document.getElementById('new-desc').value.trim();

  if (!title) {
    showToast('Please enter a task title', 'error');
    return;
  }

  try {
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
      loadStats(); // Refresh stats (Endpoint #3)
      loadTasks(); // Refresh task list (Endpoint #2)
    } else {
      showToast('Error adding task', 'error');
    }
  } catch (err) {
    showBanner();
    showToast('Cannot reach the API', 'error');
    console.error('addTask error:', err);
  }
}

// =============================================================================
// ENDPOINT #9 — PUT /api/items/:id  (status toggle)
// Purpose   : Toggles a task's status between "pending" and "completed"
// Body      : { status: "pending" | "completed" }
// Response  : { success, data: { ...updatedTask }, message }
// Used for  : The checkbox circle on each task card + the Done / Undo buttons
// =============================================================================
async function toggleTask(id, status) {
  const newStatus = status === 'completed' ? 'pending' : 'completed';

  try {
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
      loadStats(); // Refresh stats (Endpoint #3)
      loadTasks(); // Refresh task list (Endpoint #2)
    } else {
      showToast('Error updating task', 'error');
    }
  } catch (err) {
    showBanner();
    showToast('Cannot reach the API', 'error');
    console.error('toggleTask error:', err);
  }
}

// =============================================================================
// DELETE FLOW — UI helpers before calling Endpoint #10
// =============================================================================

// Shows the inline "Are you sure?" confirmation inside the task card
function showDeleteConfirm(id) {
  document.querySelectorAll('.delete-confirm').forEach((d) => d.classList.remove('open'));
  document.querySelectorAll('.edit-form').forEach((f) => f.classList.remove('open'));
  document.getElementById('delete-confirm-' + id).classList.add('open');
}

// Hides the delete confirmation without doing anything
function cancelDelete(id) {
  document.getElementById('delete-confirm-' + id).classList.remove('open');
}

// =============================================================================
// ENDPOINT #10 — DELETE /api/items/:id
// Purpose   : Permanently deletes a task by its ID
// Params    : id — the task's numeric ID (in the URL)
// Response  : { success, data: null, message: "Item deleted" }
// Used for  : The "Yes, delete" button inside the delete confirmation
// =============================================================================
async function confirmDelete(id) {
  try {
    const res = await fetch(`${API}/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();

    if (data.success) {
      hideBanner();
      showToast('Task deleted', 'success');
      loadStats(); // Refresh stats (Endpoint #3)
      loadTasks(); // Refresh task list (Endpoint #2)
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
// EDIT FLOW — UI helpers + Endpoint #9 for saving changes
// =============================================================================

// Opens the inline edit form for a specific task
// Internally calls Endpoint #7 (getTask) to pre-fill the form with current data
async function openEdit(id) {
  const task = await getTask(id); // Endpoint #7 — GET /api/items/:id

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

// Closes the edit form without saving
function cancelEdit(id) {
  document.getElementById(`edit-${id}`).classList.remove('open');
}

// =============================================================================
// ENDPOINT #9 — PUT /api/items/:id  (edit title & description)
// Purpose   : Updates a task's title and/or description
// Body      : { title (required), description (optional) }
// Response  : { success, data: { ...updatedTask }, message }
// Used for  : The "Save" button inside the inline edit form
// =============================================================================
async function saveEdit(id) {
  const title = document.getElementById(`edit-title-${id}`).value.trim();
  const desc  = document.getElementById(`edit-desc-${id}`).value.trim();

  if (!title) {
    showToast("Title can't be empty", 'error');
    return;
  }

  try {
    const res = await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc }),
    });
    const data = await res.json();

    if (data.success) {
      hideBanner();
      showToast('Task updated!', 'success');
      loadStats(); // Refresh stats (Endpoint #3)
      loadTasks(); // Refresh task list (Endpoint #2)
    } else {
      showToast('Error updating task', 'error');
    }
  } catch (err) {
    showBanner();
    showToast('Cannot reach the API', 'error');
    console.error('saveEdit error:', err);
  }
}

// =============================================================================
// FILTER TABS — Switch between All / Completed / Pending views
// Triggers: Endpoint #2, #5, or #6 depending on the selected tab
// =============================================================================
function setFilter(filter, btn) {
  currentFilter = filter;

  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');

  document.getElementById('search-input').value = '';

  loadTasks(); // Will call Endpoint #2, #5, or #6 based on currentFilter
}

// =============================================================================
// SEARCH INPUT HANDLER
// Triggers: Endpoint #4 (GET /api/items/search?title=...) when user types
//           Falls back to Endpoint #2 (GET /api/items) when input is cleared
// =============================================================================
async function onSearch(val) {
  if (!val.trim()) {
    loadTasks(); // Empty search → restore full list (Endpoint #2)
    return;
  }

  await searchTasks(val); // Has input → search (Endpoint #4)
}