const API = 'https://stackblitz-task-manager-1.onrender.com/api/items';

let currentFilter = 'all';

window.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadTasks();
});

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

async function loadTasks() {
  let url = API;

  if (currentFilter === 'completed') url = `${API}/completed`;
  if (currentFilter === 'pending')   url = `${API}/pending`;

  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (!data.success) {
      showToast('Error loading tasks', 'error');
      return;
    }

    hideBanner();

    const tasks    = data.data || [];
    const taskList = document.getElementById('task-list');

    taskList.innerHTML = '';

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

  } catch (err) {
    showBanner();
    showToast('Cannot reach the API', 'error');
    document.getElementById('task-list').innerHTML = '';
    console.error('loadTasks error:', err);
  }
}

async function searchTasks(query) {
  try {
    const res  = await fetch(`${API}/search?title=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!data.success) {
      showToast('Error searching tasks', 'error');
      return;
    }

    hideBanner();

    const tasks    = data.data || [];
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';

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

  } catch (err) {
    showBanner();
    showToast('Cannot reach the API', 'error');
    console.error('searchTasks error:', err);
  }
}

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

function renderTasks(tasks) {
  const taskList = document.getElementById('task-list');
  taskList.innerHTML = '';

  tasks.forEach((task) => {
    const taskHTML = `
      <div class="task-card ${task.status}">

        <div class="task-check" onclick="toggleTask(${task.id}, '${task.status}')"></div>

        <div class="task-body">

          <div class="task-title">${task.title}</div>

          ${task.description ? `<div class="task-desc">${task.description}</div>` : ''}

          <div class="task-meta">
            <span class="task-status ${task.status}">
              ${task.status === 'completed' ? '✓ Done' : '⏳ Pending'}
            </span>
          </div>

          <div class="edit-form" id="edit-${task.id}">
            <input type="text" id="edit-title-${task.id}" value="${task.title}"             placeholder="Task title">
            <input type="text" id="edit-desc-${task.id}"  value="${task.description || ''}" placeholder="Description (optional)">
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

          ${task.status === 'completed'
            ? `<button class="btn btn-undo" onclick="toggleTask(${task.id}, 'completed')">↩ Undo</button>`
            : `<button class="btn btn-done" onclick="toggleTask(${task.id}, 'pending')">✓ Done</button>`
          }

          <button class="btn btn-danger" onclick="showDeleteConfirm(${task.id})">✕ Delete</button>

        </div>
      </div>`;

    taskList.innerHTML += taskHTML;
  });

  document.getElementById('list-count').textContent = tasks.length;
}

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
    const res = await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();

    if (data.success) {
      hideBanner();
      showToast(
        newStatus === 'completed' ? 'Task completed! ✓' : 'Task marked as pending',
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

function showDeleteConfirm(id) {
  document.querySelectorAll('.delete-confirm').forEach((d) => d.classList.remove('open'));
  document.querySelectorAll('.edit-form').forEach((f) => f.classList.remove('open'));
  document.getElementById('delete-confirm-' + id).classList.add('open');
}

function cancelDelete(id) {
  document.getElementById('delete-confirm-' + id).classList.remove('open');
}

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

async function openEdit(id) {
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

function setFilter(filter, btn) {
  currentFilter = filter;

  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');

  document.getElementById('search-input').value = '';

  loadTasks();
}

async function onSearch(val) {
  if (!val.trim()) {
    loadTasks();
    return;
  }

  await searchTasks(val);
}