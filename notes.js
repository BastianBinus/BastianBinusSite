async function fetchNotes() {
  const res = await fetch("/api/notes");
  if (!res.ok) {
    console.error("Failed to fetch notes", res.status);
    return [];
  }
  return res.json();
}

async function saveNotes(notes) {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(notes),
  });

  if (!res.ok) {
    console.error("Failed to save notes", res.status);
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const data = new FormData(event.target);
  const value = Object.fromEntries(data.entries());

  const notes = await fetchNotes();
  notes.push(value);
  await saveNotes(notes);

  event.target.reset();
  renderNotes();
}

const form = document.querySelector("form");
form.addEventListener("submit", handleSubmit);

async function renderNotes() {
  const board = document.getElementById("sticky-board");
  board.innerHTML = "";

  const notes = await fetchNotes();
  notes.forEach((note) => {
    const container = document.createElement("div");
    container.className = "sticky-container";
    container.innerHTML = `
      <div class="sticky-outer">
        <div class="sticky">
          <div class="sticky-content">
            <strong>${note["Note-Title"]}</strong><br>
            ${note["Note-Content"]}
          </div>
        </div>
      </div>
    `;
    board.appendChild(container);
  });
}

document.addEventListener("DOMContentLoaded", renderNotes);
