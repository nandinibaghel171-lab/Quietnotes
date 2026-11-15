const API = "/api/notes";

const elements = {
  pinnedSection: document.getElementById("pinnedSection"),
  pinnedGrid: document.getElementById("pinnedGrid"),
  notesGrid: document.getElementById("notesGrid"),
  noteCount: document.getElementById("noteCount"),
  emptyState: document.getElementById("emptyState"),
  emptyTitle: document.getElementById("emptyTitle"),
  emptyText: document.getElementById("emptyText"),
  searchInput: document.getElementById("searchInput"),
  backdrop: document.getElementById("editorBackdrop"),
  title: document.getElementById("noteTitle"),
  content: document.getElementById("noteContent"),
  pinned: document.getElementById("notePinned"),
  message: document.getElementById("editorMessage"),
  saveStatus: document.getElementById("saveStatus"),
  toast: document.getElementById("toast")
};

let notes = [];
let editingId = null;
let selectedColor = "lavender";

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function formatDate(value) {
  const date = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return "Just now";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

async function loadNotes() {
  try {
    notes = await apiRequest(API);
    elements.saveStatus.textContent = "All changes saved";
    renderNotes();
  } catch (error) {
    elements.saveStatus.textContent = "Could not connect to server";
    showToast("Start the Python server to load your notes.");
    console.error(error);
  }
}

function createCard(note) {
  const card = document.createElement("article");
  card.className = `note-card ${note.color}`;
  const preview = note.content || "No extra details yet.";
  card.innerHTML = `
    <div class="card-top">
      <span class="card-date">${formatDate(note.updated_at)}</span>
      <div class="card-actions">
        <button class="mini-btn" data-action="pin" title="${note.pinned ? "Unpin" : "Pin"}">${note.pinned ? "★" : "☆"}</button>
        <button class="mini-btn" data-action="edit" title="Edit note">✎</button>
        <button class="mini-btn" data-action="delete" title="Delete note">⌫</button>
      </div>
    </div>
    <h3>${escapeHTML(note.title)}</h3>
    <p class="note-preview">${escapeHTML(preview)}</p>
    <div class="card-footer">
      <span>${(note.content || "").trim().split(/\s+/).filter(Boolean).length} words</span>
      <span class="pin-label">${note.pinned ? "★ Pinned" : ""}</span>
    </div>`;
  card.querySelector('[data-action="edit"]').addEventListener("click", () => openEditor(note));
  card.querySelector('[data-action="delete"]').addEventListener("click", () => deleteNote(note.id));
  card.querySelector('[data-action="pin"]').addEventListener("click", () => togglePin(note));
  return card;
}

function renderNotes() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const filtered = notes.filter(note =>
    `${note.title} ${note.content}`.toLowerCase().includes(query)
  );
  const pinned = filtered.filter(note => note.pinned);
  const regular = filtered.filter(note => !note.pinned);

  elements.pinnedGrid.replaceChildren(...pinned.map(createCard));
  elements.notesGrid.replaceChildren(...regular.map(createCard));
  elements.pinnedSection.classList.toggle("hidden", pinned.length === 0);
  elements.noteCount.textContent = notes.length;

  const noResults = filtered.length === 0;
  elements.emptyState.classList.toggle("hidden", !noResults);
  elements.notesGrid.classList.toggle("hidden", noResults);
  if (noResults && query) {
    elements.emptyTitle.textContent = "No notes found.";
    elements.emptyText.textContent = "Try another search word.";
    document.getElementById("emptyNewBtn").classList.add("hidden");
  } else if (noResults) {
    elements.emptyTitle.textContent = "Your page is waiting.";
    elements.emptyText.textContent = "Start with a thought, a plan, or something you don't want to forget.";
    document.getElementById("emptyNewBtn").classList.remove("hidden");
  }
}

function openEditor(note = null) {
  editingId = note ? note.id : null;
  selectedColor = note ? note.color : "lavender";
  elements.title.value = note ? note.title : "";
  elements.content.value = note ? note.content : "";
  elements.pinned.checked = note ? Boolean(note.pinned) : false;
  elements.message.textContent = "";
  document.getElementById("editorKicker").textContent = note ? "EDIT NOTE" : "NEW NOTE";
  document.getElementById("editorHeading").innerHTML = note
    ? 'Make it just right<span>.</span>'
    : 'Capture a thought<span>.</span>';
  document.getElementById("saveNoteBtn").innerHTML = note ? 'Update note <span>↗</span>' : 'Save note <span>↗</span>';
  document.querySelectorAll(".color-dot").forEach(dot => {
    dot.classList.toggle("selected", dot.dataset.color === selectedColor);
  });
  elements.backdrop.classList.remove("hidden");
  setTimeout(() => elements.title.focus(), 50);
}

function closeEditor() {
  elements.backdrop.classList.add("hidden");
  editingId = null;
}

async function saveNote() {
  const title = elements.title.value.trim();
  const content = elements.content.value.trim();
  if (!title && !content) {
    elements.message.textContent = "Write a title or some note content first.";
    return;
  }

  const payload = {
    title,
    content,
    color: selectedColor,
    pinned: elements.pinned.checked
  };

  const saveButton = document.getElementById("saveNoteBtn");
  saveButton.disabled = true;
  saveButton.textContent = "Saving...";
  try {
    if (editingId) {
      await apiRequest(`${API}/${editingId}`, {
        method: "PUT", body: JSON.stringify(payload)
      });
      showToast("Your note has been updated.");
    } else {
      await apiRequest(API, { method: "POST", body: JSON.stringify(payload) });
      showToast("Your note is saved.");
    }
    closeEditor();
    await loadNotes();
  } catch (error) {
    elements.message.textContent = error.message;
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML = editingId ? 'Update note <span>↗</span>' : 'Save note <span>↗</span>';
  }
}

async function deleteNote(id) {
  if (!confirm("Delete this note? This cannot be undone.")) return;
  try {
    await apiRequest(`${API}/${id}`, { method: "DELETE" });
    showToast("Note deleted.");
    await loadNotes();
  } catch (error) {
    showToast(error.message);
  }
}

async function togglePin(note) {
  try {
    await apiRequest(`${API}/${note.id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: note.title,
        content: note.content,
        color: note.color,
        pinned: !note.pinned
      })
    });
    await loadNotes();
    showToast(note.pinned ? "Note unpinned." : "Note pinned.");
  } catch (error) {
    showToast(error.message);
  }
}

let toastTimer;
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2300);
}

document.getElementById("newNoteBtn").addEventListener("click", () => openEditor());
document.getElementById("emptyNewBtn").addEventListener("click", () => openEditor());
document.getElementById("closeEditorBtn").addEventListener("click", closeEditor);
document.getElementById("cancelBtn").addEventListener("click", closeEditor);
document.getElementById("saveNoteBtn").addEventListener("click", saveNote);
elements.searchInput.addEventListener("input", renderNotes);
document.getElementById("allNotesBtn").addEventListener("click", () => {
  elements.searchInput.value = "";
  renderNotes();
});
document.querySelectorAll(".color-dot").forEach(dot => {
  dot.addEventListener("click", () => {
    selectedColor = dot.dataset.color;
    document.querySelectorAll(".color-dot").forEach(item =>
      item.classList.toggle("selected", item === dot)
    );
  });
});
elements.backdrop.addEventListener("click", event => {
  if (event.target === elements.backdrop) closeEditor();
});
document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    elements.searchInput.focus();
  }
  if (event.key === "Escape") closeEditor();
});

document.getElementById("todayLabel").textContent =
  new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" })
    .format(new Date()).toUpperCase();

loadNotes();
