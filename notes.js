// Sticky notes frontend — talks to notes-api (see docker-compose.yml).
// See the numbered comments in notes.html for the step-by-step plan.
// Nothing here works yet — it's your turn to fill it in.

(function () {
  const API_BASE = 'http://localhost:4000/api/notes'

  // TODO (step 3): grab your board container, form, textarea, and status
  // elements here with document.getElementById(...), same as tic-tac-toe.js
  // / snake.js do at the top of their IIFEs.

  // TODO (step a+b): a function that fetch()es API_BASE, turns the
  // response into DOM elements, and drops them into the board container.
  // Call it once when the page loads (right at the bottom of this file).

  // TODO (step c+d): a "submit" listener on the form. preventDefault(),
  // read the textarea's value, fetch(API_BASE, { method: 'POST', ... })
  // with a JSON body, then refresh the board and clear the textarea.

  // TODO (step e, optional): per-note delete button that fetches
  // `${API_BASE}/${id}` with { method: 'DELETE' } and removes the note
  // from the board afterwards.
})();
