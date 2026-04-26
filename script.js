// =============================================================
//  FOCUS BUDDY — script.js
//  This file handles ALL communication between the frontend
//  (what you see in the browser) and the backend API
//  (the server that stores your tasks).
//
//  How it works in simple terms:
//    1. Page loads  → fetch tasks & stats from the API
//    2. User clicks → send a request to the API (add/edit/delete)
//    3. API responds → update what's shown on the screen
// =============================================================


// -------------------------------------------------------------
//  API BASE URL
//  This is the address of the backend server.
//  Every fetch() call below starts with this URL.
//  We store it in a variable so if the URL ever changes,
//  we only need to update it in ONE place.
// -------------------------------------------------------------
const API = 'https://stackblitz-task-manager-1.onrender.com/api/items';


// -------------------------------------------------------------
//  CURRENT FILTER
//  Keeps track of which tab the user has selected:
//    'all'       → show every task
//    'pending'   → show only unfinished tasks
//    'completed' → show only finished tasks
//
//  We start on 'all' when the page first loads.
// -------------------------------------------------------------
let currentFilter = 'all';


// -------------------------------------------------------------
//  PAGE LOAD
//  DOMContentLoaded fires once the browser has finished
//  reading the HTML. We wait for this before touching the DOM
//  so we're sure every element (like #task-list) already exists.
// -------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  loadStats(); // fill in the Total / Done / Pending numbers in the header
  loadTasks(); // fill in the task cards below
});


// =============================================================
//  HELPER FUNCTIONS
//  Small reusable utilities used throughout the file.
// =============================================================

// -------------------------------------------------------------
//  showBanner() / hideBanner()
//  Controls the red "Cannot reach the API" strip at the top.
//
//  showBanner → called inside every catch block so the user
//               knows the server is down or they lost internet.
//  hideBanner → called after every SUCCESSFUL response so the
//               banner disappears once the connection is back.
// -------------------------------------------------------------
function showBanner() {
  document.getElementById('conn-banner').style.display = 'block';
}

function hideBanner() {
  document.getElementById('conn-banner').style.display = 'none';
}


// -------------------------------------------------------------
//  showToast(message, type)
//  Shows a small pop-up notification at the bottom of the screen.
//
//  Parameters:
//    message → the text to display (e.g. "Task added!")
//    type    → 'success' (green) or 'error' (red)
//              defaults to 'success' if you don't pass it
//
//  How it works:
//    1. Set the text and CSS class on the #toast element
//    2. The .show class triggers a CSS animation that slides it up
//    3. After 3 seconds, remove the class so it slides back down
// -------------------------------------------------------------
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `show ${type}`; // e.g. "show success" or "show error"

  // Auto-hide after 3 000 ms (3 seconds)
  setTimeout(() => {
    toast.className = ''; // removing the class triggers the hide animation
  }, 3000);
}


// =============================================================
//  DATA FETCHING — READ (GET requests)
//  These functions ask the server for information.
//  They never change any data — they only read it.
// =============================================================

// -------------------------------------------------------------
//  loadStats()
//  Endpoint: GET /api/items/stats
//
//  Asks the server how many tasks exist in total,
//  how many are completed, and how many are still pending.
//  Then updates the three number chips in the header.
//
//  try/catch: if the server is unreachable (e.g. Render is
//  still waking up) we show the banner + error toast instead
//  of crashing the whole page.
// -------------------------------------------------------------
async function loadStats() {
  try {
    // Send the GET request — await pauses here until the server replies
    const res = await fetch(`${API}/stats`);

    // Convert the raw HTTP response into a JavaScript object
    const data = await res.json();

    // data.success is a field the backend puts in every response.
    // true  → request worked, data.data holds the result
    // false → something went wrong on the server side
    if (data.success && data.data) {
      hideBanner(); // connection is working, hide any old error banner

      // Update each stat chip with the numbers from the server
      // The || 0 means "use 0 if the value is undefined or null"
      document.getElementById('stat-total').textContent = data.data.total     || 0;
      document.getElementById('stat-done').textContent  = data.data.completed || 0;
      document.getElementById('stat-pend').textContent  = data.data.pending   || 0;
    } else {
      // Server replied but said something went wrong (e.g. database error)
      showToast('Error loading stats', 'error');
    }
  } catch (err) {
    // fetch() itself threw an error — most likely the server is down
    // or the user has no internet connection
    showBanner();
    showToast('Cannot reach the API', 'error');
    console.error('loadStats error:', err); // log the real error for debugging
  }
}


// -------------------------------------------------------------
//  loadTasks()
//  Endpoints:
//    GET /api/items           → when filter is 'all'
//    GET /api/items/completed → when filter is 'completed'
//    GET /api/items/pending   → when filter is 'pending'
//
//  Fetches the task list that matches the currently active
//  filter tab, then renders each task as a card on the page.
// -------------------------------------------------------------
async function loadTasks() {
  // Start with the default "all tasks" URL
  let url = API;

  // Override the URL based on which filter tab is active
  if (currentFilter === 'completed') url = `${API}/completed`;
  if (currentFilter === 'pending')   url = `${API}/pending`;

  try {
    const res  = await fetch(url);
    const data = await res.json();

    // If the server returned an error flag, stop here
    if (!data.success) {
      showToast('Error loading tasks', 'error');
      return; // exit the function early — nothing more to do
    }

    hideBanner(); // connection worked, dismiss any error banner

    // data.data is the array of task objects from the server
    // The || [] means "use an empty array if data.data is missing"
    const tasks    = data.data || [];
    const taskList = document.getElementById('task-list');

    taskList.innerHTML = ''; // clear whatever was shown before (e.g. skeleton loaders)

    // If the server returned zero tasks, show the "nothing here yet" message
    if (tasks.length === 0) {
      taskList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🧠</div>
          <h3>Nothing here yet</h3>
          <p>Add a task above to get started.</p>
        </div>`;
      document.getElementById('list-count').textContent = '0';
      return; // no tasks to render, stop here
    }

    // We have tasks — hand them off to renderTasks() to build the cards
    renderTasks(tasks);

  } catch (err) {
    // Network / server failure
    showBanner();
    showToast('Cannot reach the API', 'error');
    document.getElementById('task-list').innerHTML = ''; // clear skeleton loaders
    console.error('loadTasks error:', err);
  }
}


// -------------------------------------------------------------
//  searchTasks(query)
//  Endpoint: GET /api/items/search?title=<query>
//
//  Called on every keystroke in the search box (via onSearch).
//  Sends the typed text to the server, which returns only the
//  tasks whose title contains that text.
//
//  encodeURIComponent() makes the text safe to put in a URL
//  (e.g. turns spaces into %20 so the URL doesn't break).
// -------------------------------------------------------------
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

    // No results found for this search term
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


// -------------------------------------------------------------
//  getTask(id)
//  Endpoint: GET /api/items/:id
//
//  Fetches ONE specific task by its ID number.
//  Used by openEdit() to make sure the edit form always shows
//  the LATEST data from the server (not stale data in the DOM).
//
//  Returns the task object if found, or null if not.
// -------------------------------------------------------------
async function getTask(id) {
  try {
    const res  = await fetch(`${API}/${id}`);
    const data = await res.json();

    if (!data.success) return null; // task not found or server error

    return data.data || null; // return the task object
  } catch (err) {
    // Network failure — return null so the caller can handle it gracefully
    console.error('getTask error:', err);
    return null;
  }
}


// =============================================================
//  RENDERING
//  Takes an array of task objects from the server and
//  builds the HTML cards that the user sees on screen.
// =============================================================

// -------------------------------------------------------------
//  renderTasks(tasks)
//  Loops through the tasks array and builds one card per task.
//  Each card contains:
//    • A checkbox (to toggle status)
//    • Title and optional description
//    • A status badge (Done / Pending)
//    • A hidden edit form (shown when Edit is clicked)
//    • A hidden delete confirmation row (shown when Delete is clicked)
//    • Action buttons: Edit, Done/Undo, Delete
// -------------------------------------------------------------
function renderTasks(tasks) {
  const taskList = document.getElementById('task-list');
  taskList.innerHTML = ''; // clear existing content before re-rendering

  tasks.forEach((task) => {
    // Build the HTML string for this task card.
    // Template literals (backticks) let us embed variables with ${}.
    const taskHTML = `
      <div class="task-card ${task.status}">

        <!-- ── Checkbox ──────────────────────────────────────
             Clicking it calls toggleTask() with this task's ID
             and current status. toggleTask() will flip the status
             and send a PUT request to the API.
        ──────────────────────────────────────────────────── -->
        <div class="task-check" onclick="toggleTask(${task.id}, '${task.status}')"></div>

        <div class="task-body">

          <!-- Task title — shows strikethrough when completed via CSS -->
          <div class="task-title">${task.title}</div>

          <!-- Description is optional — only render the element if it exists -->
          ${task.description ? `<div class="task-desc">${task.description}</div>` : ''}

          <!-- Status badge — shows "✓ Done" or "⏳ Pending" -->
          <div class="task-meta">
            <span class="task-status ${task.status}">
              ${task.status === 'completed' ? '✓ Done' : '⏳ Pending'}
            </span>
          </div>

          <!-- ── Edit Form ──────────────────────────────────
               Hidden by default (CSS: display:none).
               openEdit() adds the class "open" to show it.
               cancelEdit() removes "open" to hide it again.
               saveEdit() sends the updated values to the API.
          ──────────────────────────────────────────────────── -->
          <div class="edit-form" id="edit-${task.id}">
            <input type="text" id="edit-title-${task.id}" value="${task.title}"            placeholder="Task title">
            <input type="text" id="edit-desc-${task.id}"  value="${task.description || ''}" placeholder="Description (optional)">
            <div class="edit-actions">
              <button class="btn btn-primary" onclick="saveEdit(${task.id})">Save</button>
              <button class="btn btn-ghost"   onclick="cancelEdit(${task.id})">Cancel</button>
            </div>
          </div>

          <!-- ── Delete Confirmation ───────────────────────
               Hidden by default.
               showDeleteConfirm() adds "open" to show it.
               cancelDelete() removes "open" without deleting.
               confirmDelete() sends the DELETE request to the API.
          ──────────────────────────────────────────────────── -->
          <div class="delete-confirm" id="delete-confirm-${task.id}">
            <span class="delete-confirm-text">Are you sure?</span>
            <button class="btn btn-danger" onclick="confirmDelete(${task.id})">Yes, delete</button>
            <button class="btn btn-ghost"  onclick="cancelDelete(${task.id})">Cancel</button>
          </div>

        </div>

        <!-- ── Action Buttons ────────────────────────────── -->
        <div class="task-actions">

          <!-- Edit button — opens the inline edit form -->
          <button class="btn btn-edit" onclick="openEdit(${task.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit
          </button>

          <!-- Toggle button — label and action depend on current status:
               completed → show "↩ Undo"  (will set back to pending)
               pending   → show "✓ Done"  (will set to completed)      -->
          ${task.status === 'completed'
            ? `<button class="btn btn-undo" onclick="toggleTask(${task.id}, 'completed')">↩ Undo</button>`
            : `<button class="btn btn-done" onclick="toggleTask(${task.id}, 'pending')">✓ Done</button>`
          }

          <!-- Delete button — shows the inline confirm row, does NOT delete immediately -->
          <button class="btn btn-danger" onclick="showDeleteConfirm(${task.id})">✕ Delete</button>

        </div>
      </div>`;

    // Append this card's HTML to the list
    // (innerHTML += appends without clearing what's already there)
    taskList.innerHTML += taskHTML;
  });

  // Update the task count badge next to the section label
  document.getElementById('list-count').textContent = tasks.length;
}


// =============================================================
//  DATA MUTATION — CREATE / UPDATE / DELETE
//  These functions send changes to the server (POST / PUT / DELETE).
//  After each successful change we reload the stats and task list
//  so the screen always reflects what's actually in the database.
// =============================================================

// -------------------------------------------------------------
//  addTask()
//  Endpoint: POST /api/items
//  Triggered by: "Add Task" button
//
//  Reads the title and description inputs, validates that the
//  title isn't empty, then POSTs the new task to the server.
// -------------------------------------------------------------
async function addTask() {
  const title = document.getElementById('new-title').value.trim();
  const desc  = document.getElementById('new-desc').value.trim();

  // Client-side validation — don't even bother calling the API if title is empty
  if (!title) {
    showToast('Please enter a task title', 'error');
    return; // stop here
  }

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // tell server we're sending JSON
      body: JSON.stringify({ title, description: desc }), // convert JS object → JSON string
    });
    const data = await res.json();

    if (data.success) {
      // Clear the form inputs so the user can type a new task straight away
      document.getElementById('new-title').value = '';
      document.getElementById('new-desc').value  = '';

      showToast('Task added!', 'success');
      hideBanner();

      // Refresh both the stats chips and the task list to show the new task
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


// -------------------------------------------------------------
//  toggleTask(id, status)
//  Endpoint: PUT /api/items/:id
//  Triggered by: checkbox click or Done/Undo button
//
//  Flips the task's status:
//    'completed' → 'pending'
//    'pending'   → 'completed'
//
//  Parameters:
//    id     → the task's unique ID number
//    status → the task's CURRENT status (we flip it here)
// -------------------------------------------------------------
async function toggleTask(id, status) {
  // Determine what the NEW status should be (opposite of current)
  const newStatus = status === 'completed' ? 'pending' : 'completed';

  try {
    const res = await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }), // only send the status field
    });
    const data = await res.json();

    if (data.success) {
      hideBanner();

      // Show a different message depending on which direction we toggled
      showToast(
        newStatus === 'completed' ? 'Task completed! ✓' : 'Task marked as pending',
        'success'
      );

      loadStats(); // update the Done / Pending counts in the header
      loadTasks(); // re-render the list (card style changes based on status)
    } else {
      showToast('Error updating task', 'error');
    }
  } catch (err) {
    showBanner();
    showToast('Cannot reach the API', 'error');
    console.error('toggleTask error:', err);
  }
}


// -------------------------------------------------------------
//  showDeleteConfirm(id)
//  No API call — just a UI toggle.
//
//  Instead of a browser confirm() popup, we show an inline
//  "Are you sure?" row inside the task card itself.
//  This is friendlier and keeps the user on the page.
//
//  Before opening a new one, close any others that might
//  already be open (so we never have two open at once).
// -------------------------------------------------------------
function showDeleteConfirm(id) {
  // Close all currently open delete confirmations
  document.querySelectorAll('.delete-confirm').forEach((d) => d.classList.remove('open'));
  // Close all currently open edit forms
  document.querySelectorAll('.edit-form').forEach((f) => f.classList.remove('open'));

  // Open THIS task's delete confirmation row
  document.getElementById('delete-confirm-' + id).classList.add('open');
}


// -------------------------------------------------------------
//  cancelDelete(id)
//  No API call — just hides the confirmation row without deleting.
// -------------------------------------------------------------
function cancelDelete(id) {
  document.getElementById('delete-confirm-' + id).classList.remove('open');
}


// -------------------------------------------------------------
//  confirmDelete(id)
//  Endpoint: DELETE /api/items/:id
//  Triggered by: "Yes, delete" button inside the confirm row
//
//  Only called AFTER the user has already confirmed.
//  Sends the DELETE request to permanently remove the task.
// -------------------------------------------------------------
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

      // Refresh both views — the deleted task should no longer appear
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


// -------------------------------------------------------------
//  openEdit(id)
//  Endpoint: GET /api/items/:id  (via getTask)
//  Triggered by: "Edit" button
//
//  Before showing the edit form, we fetch the task's LATEST
//  data from the server. This prevents the form from showing
//  stale values if someone else edited the task in another tab.
// -------------------------------------------------------------
async function openEdit(id) {
  // Fetch the latest version of this task from the server
  const task = await getTask(id);

  if (!task) {
    // getTask returned null — either network error or task not found
    showToast('Could not load task', 'error');
    return;
  }

  // Close any other edit forms or delete confirmations that are currently open
  document.querySelectorAll('.edit-form').forEach((f) => f.classList.remove('open'));
  document.querySelectorAll('.delete-confirm').forEach((d) => d.classList.remove('open'));

  // Show this task's edit form and fill it with the freshly fetched data
  document.getElementById(`edit-${id}`).classList.add('open');
  document.getElementById(`edit-title-${id}`).value = task.title;
  document.getElementById(`edit-desc-${id}`).value  = task.description || '';
}


// -------------------------------------------------------------
//  cancelEdit(id)
//  No API call — just hides the edit form without saving anything.
// -------------------------------------------------------------
function cancelEdit(id) {
  document.getElementById(`edit-${id}`).classList.remove('open');
}


// -------------------------------------------------------------
//  saveEdit(id)
//  Endpoint: PUT /api/items/:id
//  Triggered by: "Save" button inside the edit form
//
//  Reads the updated title and description from the edit form
//  inputs and sends them to the server as a PUT request.
// -------------------------------------------------------------
async function saveEdit(id) {
  const title = document.getElementById(`edit-title-${id}`).value.trim();
  const desc  = document.getElementById(`edit-desc-${id}`).value.trim();

  // Client-side validation — title must not be blank
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

      // Reload both so the updated title/description appears immediately
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


// =============================================================
//  UI CONTROLS
//  Functions that handle filter tabs and the search bar.
//  These don't directly call the API — they update state
//  and then call loadTasks() / searchTasks() to re-fetch.
// =============================================================

// -------------------------------------------------------------
//  setFilter(filter, btn)
//  Triggered by: clicking All / Pending / Done tabs
//
//  Parameters:
//    filter → the string 'all', 'pending', or 'completed'
//    btn    → the button element that was clicked (to style it)
//
//  Steps:
//    1. Update the currentFilter variable
//    2. Move the "active" highlight to the clicked button
//    3. Clear the search box (filter and search don't mix)
//    4. Re-fetch tasks with the new filter applied
// -------------------------------------------------------------
function setFilter(filter, btn) {
  currentFilter = filter; // update the global filter state

  // Remove the "active" class from ALL filter buttons
  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));

  // Add it only to the button that was just clicked
  btn.classList.add('active');

  // Reset the search input — switching filters clears any active search
  document.getElementById('search-input').value = '';

  // Re-fetch tasks using the new filter
  loadTasks();
}


// -------------------------------------------------------------
//  onSearch(val)
//  Triggered by: oninput on the search box (every keystroke)
//
//  Parameter:
//    val → the current text in the search input
//
//  If the box is empty (or only spaces), go back to showing
//  all tasks for the current filter instead of searching.
//  Otherwise, call searchTasks() with the typed text.
// -------------------------------------------------------------
async function onSearch(val) {
  if (!val.trim()) {
    // Search box was cleared — restore the normal task list
    loadTasks();
    return;
  }

  // Box has text — search the API for matching tasks
  await searchTasks(val);
}