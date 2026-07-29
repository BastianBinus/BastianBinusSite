// Snake — built by following https://towardsdev.com/building-a-snake-game-in-javascript-a-beginners-guide-bf2e9bfb1079

(function () {
  const canvas = document.getElementById("snakeCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const statusEl = document.getElementById("snakeStatus");
  const resetBtn = document.getElementById("snakeReset");

  const GRID = 15;
  const CELL = canvas.width / GRID;
  const snakeColor = getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() || "#fda5b1";
  const foodColor = "#f2c14e";

  let snake, direction, nextDirection, food, score, alive, started, loopId;

  function randomFood() {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * GRID),
        y: Math.floor(Math.random() * GRID),
      };
    } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = foodColor;
    ctx.fillRect(food.x * CELL + 1, food.y * CELL + 1, CELL - 2, CELL - 2);

    ctx.fillStyle = snakeColor;
    snake.forEach((s, i) => {
      ctx.globalAlpha = i === 0 ? 1 : 0.75;
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
    ctx.globalAlpha = 1;
  }

  function tick() {
    if (!alive) return;
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    const hitsWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
    const hitsSelf = snake.some((s) => s.x === head.x && s.y === head.y);

    if (hitsWall || hitsSelf) {
      alive = false;
      clearInterval(loopId);
      statusEl.textContent = "Game over — Score: " + score + " (restart to try again)";
      return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score++;
      statusEl.textContent = "Score: " + score;
      food = randomFood();
    } else {
      snake.pop();
    }
    draw();
  }

  function reset() {
    snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
    direction = { x: 1, y: 0 };
    nextDirection = direction;
    score = 0;
    alive = true;
    started = false;
    food = randomFood();
    statusEl.textContent = "Score: 0 — press an arrow key to start";
    clearInterval(loopId);
    draw();
  }

  const KEY_DIRECTIONS = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 },
  };

  document.addEventListener("keydown", (e) => {
    const dir = KEY_DIRECTIONS[e.key];
    if (!dir) return;
    e.preventDefault();
    if (dir.x === -direction.x && dir.y === -direction.y) return;
    nextDirection = dir;
    if (!started && alive) {
      started = true;
      statusEl.textContent = "Score: 0";
      loopId = setInterval(tick, 120);
    }
  });

  resetBtn.addEventListener("click", reset);
  reset();
})();
