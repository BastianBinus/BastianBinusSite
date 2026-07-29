// Tic-Tac-Toe — inspired by https://github.com/utkarszz/Tic-Tac-Toc, rewritten from scratch.

(function () {
  const board = document.getElementById("tttBoard");
  if (!board) return;

  const status = document.getElementById("tttStatus");
  const resetBtn = document.getElementById("tttReset");

  const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  let cells = Array(9).fill(null);
  let current = "X";
  let over = false;

  const cellEls = [];
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "ttt-cell";
    cell.setAttribute("aria-label", "Cell " + (i + 1));
    cell.addEventListener("click", () => handleClick(i));
    board.appendChild(cell);
    cellEls.push(cell);
  }

  function checkResult() {
    for (const [a, b, c] of WIN_LINES) {
      if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
        return cells[a];
      }
    }
    return cells.every(Boolean) ? "draw" : null;
  }

  function render() {
    cellEls.forEach((cell, i) => {
      cell.textContent = cells[i] || "";
      cell.disabled = Boolean(cells[i]) || over;
    });
  }

  function handleClick(i) {
    if (over || cells[i]) return;
    cells[i] = current;
    const result = checkResult();
    if (result === "draw") {
      status.textContent = "Draw!";
      over = true;
    } else if (result) {
      status.textContent = result + " wins!";
      over = true;
    } else {
      current = current === "X" ? "O" : "X";
      status.textContent = "Your turn: " + current;
    }
    render();
  }

  function reset() {
    cells = Array(9).fill(null);
    current = "X";
    over = false;
    status.textContent = "Your turn: " + current;
    render();
  }

  resetBtn.addEventListener("click", reset);
  reset();
})();
