// Base URL of the API
const API = 'https://stackblitz-task-manager-1.onrender.com/api/items';

// Tracks the current filter (all, completed, pending)
let currentFilter = 'all';

// When the page loads, fetch stats and tasks
window.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadTasks();
});

// ── Toast Notification ───────────────────────────────────
// Shows a toast message at the bottom of the screen
// type: 'success' | 'error'
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `show ${type}`;
  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.className = '';
  }, 3000);
}

// ── GET /api/items/stats ─────────────────────────────────
// Fetches total, completed, and pending task counts
// and displays them in the header stat chips
async function loadStats() {
  const res = await fetch(`${API}/stats`);
  const data = await res.json();

  // Check if the request was successful and data exists
  if (data.success && data.data) {
    document.getElementById('stat-total').textContent = data.data.total || 0;
    document.getElementById('stat-done').textContent = data.data.completed || 0;
    document.getElementById('stat-pend').textContent = data.data.pending || 0;
  } else {
    showToast('Error loading stats', 'error');
  }
}

// ── GET /api/items ───────────────────────────────────────
// ── GET /api/items/completed ─────────────────────────────
// ── GET /api/items/pending ───────────────────────────────
// Fetches tasks based on the current filter and renders them
async function loadTasks() {
  // Default to fetching all tasks
  let url = API;

  // Switch to the appropriate endpoint based on the active filter
  if (currentFilter === 'completed') url = `${API}/completed`;
  if (currentFilter === 'pending') url = `${API}/pending`;

  const res = await fetch(url);
  const data = await res.json();

  // Check if the request was successful
  if (!data.success) {
    showToast('Error loading tasks', 'error');
    return;
  }

  const tasks = data.data || [];
  const taskList = document.getElementById('task-list');
  taskList.innerHTML = '';

  // Show empty state if no tasks are returned
  if (tasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧠</div>
        <h3>Nothing here yet</h3>
        <p>Add a task above to get started.</p>
      </div>`;
    document.getElementById('list-count').textContent = '0';
    return;
  }

  renderTasks(tasks);
}

// ── GET /api/items/search?title=... ──────────────────────
// Calls the server-side search endpoint with the given query
// and renders the matching tasks
async function searchTasks(query) {
  // encodeURIComponent makes the query URL-safe (e.g. spaces become %20)
  const res = await fetch(`${API}/search?title=${encodeURIComponent(query)}`);
  const data = await res.json();

  // Check if the request was successful
  if (!data.success) {
    showToast('Error searching tasks', 'error');
    return;
  }

  const tasks = data.data || [];
  const taskList = document.getElementById('task-list');
  taskList.innerHTML = '';

  // Show empty state if no tasks match the search
  if (tasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧠</div>
        <h3>No tasks found</h3>
        <p>Try a different keyword.</p>
      </div>`;
    document.getElementById('list-count').textContent = '0';
    return;
  }

  renderTasks(tasks);
}

// ── GET /api/items/:id ───────────────────────────────────
// Fetches a single task by its ID
// Used by openEdit() to get the latest data before editing
async function getTask(id) {
  const res = await fetch(`${API}/${id}`);
  const data = await res.json();

  // Check if the request was successful
  if (!data.success) return null;

  // Return the task object or null if not found
  return data.data || null;
}

// Builds and injects the HTML for each task card into the list
function renderTasks(tasks) {
  const taskList = document.getElementById('task-list');
  taskList.innerHTML = '';

  tasks.forEach((task) => {
    // Build the task card HTML dynamically using task data
    const taskHTML = `
      <div class="task-card ${task.status}">
        <!-- Clicking the checkbox toggles the task status -->
        <div class="task-check" onclick="toggleTask(${task.id}, '${
      task.status
    }')"></div>
        <div class="task-body">
          <div class="task-title">${task.title}</div>
          <!-- Only show description if it exists -->
          ${
            task.description
              ? `<div class="task-desc">${task.description}</div>`
              : ''
          }
          <div class="task-meta">
            <span class="task-status ${task.status}">${
      task.status === 'completed' ? '✓ Done' : '⏳ Pending'
    }</span>
          </div>
          <!-- Hidden edit form, shown when Edit button is clicked -->
          <div class="edit-form" id="edit-${task.id}">
            <input type="text" id="edit-title-${task.id}" value="${
      task.title
    }" placeholder="Task title">
            <input type="text" id="edit-desc-${task.id}" value="${
      task.description || ''
    }" placeholder="Description (optional)">
            <div class="edit-actions">
              <button class="btn btn-primary" onclick="saveEdit(${
                task.id
              })">Save</button>
              <button class="btn btn-ghost" onclick="cancelEdit(${
                task.id
              })">Cancel</button>
            </div>
          </div>
          <!-- Inline delete confirmation, hidden by default -->
          <div class="delete-confirm" id="delete-confirm-${task.id}">
            <span class="delete-confirm-text">Are you sure?</span>
            <button class="btn btn-danger" onclick="confirmDelete(${
              task.id
            })">Yes, delete</button>
            <button class="btn btn-ghost" onclick="cancelDelete(${
              task.id
            })">Cancel</button>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-edit" onclick="openEdit(${
            task.id
          })">✏️ Edit</button>
          <!-- Show Undo if completed, Done if pending -->
          ${
            task.status === 'completed'
              ? `<button class="btn btn-undo" onclick="toggleTask(${task.id}, 'completed')">↩ Undo</button>`
              : `<button class="btn btn-done" onclick="toggleTask(${task.id}, 'pending')">✓ Done</button>`
          }
          <!-- Delete button now shows inline confirm instead of browser popup -->
          <button class="btn btn-danger" onclick="showDeleteConfirm(${
            task.id
          })">✕ Delete</button>
        </div>
      </div>`;
    taskList.innerHTML += taskHTML;
  });

  // Update the task count label
  document.getElementById('list-count').textContent = tasks.length;
}

// ── POST /api/items ──────────────────────────────────────
// Reads the title and description from the input fields
// and sends a POST request to create a new task
async function addTask() {
  const title = document.getElementById('new-title').value.trim();
  const desc = document.getElementById('new-desc').value.trim();

  // Title is required — show toast if empty
  if (!title) {
    showToast('Please enter a task title', 'error');
    return;
  }

  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description: desc }),
  });
  const data = await res.json();

  if (data.success) {
    // Clear the input fields after successful add
    document.getElementById('new-title').value = '';
    document.getElementById('new-desc').value = '';
    showToast('Task added!', 'success');
    loadStats();
    loadTasks();
  } else {
    showToast('Error adding task', 'error');
  }
}

// ── PUT /api/items/:id ───────────────────────────────────
// Toggles a task between completed and pending
async function toggleTask(id, status) {
  // Flip the status
  const newStatus = status === 'completed' ? 'pending' : 'completed';

  const res = await fetch(`${API}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  });
  const data = await res.json();

  if (data.success) {
    // Show appropriate toast based on new status
    showToast(
      newStatus === 'completed'
        ? 'Task completed! ✓'
        : 'Task marked as pending',
      'success'
    );
    loadStats();
    loadTasks();
  } else {
    showToast('Error updating task', 'error');
  }
}

// Shows the inline delete confirmation row
function showDeleteConfirm(id) {
  // Hide any other open confirmations or edit forms first
  document
    .querySelectorAll('.delete-confirm')
    .forEach((d) => d.classList.remove('open'));
  document
    .querySelectorAll('.edit-form')
    .forEach((f) => f.classList.remove('open'));
  document.getElementById('delete-confirm-' + id).classList.add('open');
}

// Hides the inline delete confirmation without deleting
function cancelDelete(id) {
  document.getElementById('delete-confirm-' + id).classList.remove('open');
}

// ── DELETE /api/items/:id ────────────────────────────────
// Called when user confirms deletion from the inline confirm row
async function confirmDelete(id) {
  const res = await fetch(`${API}/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();

  if (data.success) {
    showToast('Task deleted', 'success');
    loadStats();
    loadTasks();
  } else {
    showToast('Error deleting task', 'error');
  }
}

// ── GET /api/items/:id (used here) ──────────────────────
// Fetches the latest task data from the server before
// opening the edit form so fields are always up to date
async function openEdit(id) {
  const task = await getTask(id);
  if (!task) {
    showToast('Could not load task', 'error');
    return;
  }

  // Close any other open edit forms and delete confirmations first
  document
    .querySelectorAll('.edit-form')
    .forEach((f) => f.classList.remove('open'));
  document
    .querySelectorAll('.delete-confirm')
    .forEach((d) => d.classList.remove('open'));

  // Open this task's edit form and populate with latest data
  document.getElementById(`edit-${id}`).classList.add('open');
  document.getElementById(`edit-title-${id}`).value = task.title;
  document.getElementById(`edit-desc-${id}`).value = task.description || '';
}

// Hides the edit form without saving
function cancelEdit(id) {
  document.getElementById(`edit-${id}`).classList.remove('open');
}

// ── PUT /api/items/:id ───────────────────────────────────
// Saves the edited title and description for a task
async function saveEdit(id) {
  const title = document.getElementById(`edit-title-${id}`).value.trim();
  const desc = document.getElementById(`edit-desc-${id}`).value.trim();

  // Title is required — show toast if empty
  if (!title) {
    showToast("Title can't be empty", 'error');
    return;
  }

  const res = await fetch(`${API}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description: desc }),
  });
  const data = await res.json();

  if (data.success) {
    showToast('Task updated!', 'success');
    loadStats();
    loadTasks();
  } else {
    showToast('Error updating task', 'error');
  }
}

// Updates the active filter and reloads the task list
function setFilter(filter, btn) {
  currentFilter = filter;
  // Remove active class from all filter buttons
  document
    .querySelectorAll('.filter-btn')
    .forEach((b) => b.classList.remove('active'));
  // Set clicked button as active
  btn.classList.add('active');
  // Clear the search input when switching filters
  document.getElementById('search-input').value = '';
  loadTasks();
}

// Called on every keystroke in the search input
// If empty, reload all tasks — otherwise search the API
async function onSearch(val) {
  if (!val.trim()) {
    loadTasks();
    return;
  }
  await searchTasks(val);
}
