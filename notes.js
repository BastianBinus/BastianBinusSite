function handleSubmit(event) {
  event.preventDefault();

  const data = new FormData(event.target);

  const value = Object.fromEntries(data.entries());

  const notes = JSON.parse(localStorage.getItem("sticky_notes") || "[]");
  notes.push(value);
  localStorage.setItem("sticky_notes", JSON.stringify(notes));

  event.target.reset();
  renderNotes();
}

const form = document.querySelector("form");
form.addEventListener("submit", handleSubmit);

function submit_form() {
  document.getElementById("note-title").submit();
  document.getElementById("note-content").reset();
}

function renderNotes() {
  const board = document.getElementById("sticky-board");
  board.innerHTML = "";

  const notes = JSON.parse(localStorage.getItem("sticky_notes") || "[]");
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
