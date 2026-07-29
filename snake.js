// Snake — built by following https://towardsdev.com/building-a-snake-game-in-javascript-a-beginners-guide-bf2e9bfb1079

(function () {
  const canvas = document.getElementById('gameCanvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const box = 20 // Size of each grid square
  const canvasSize = canvas.width / box
  let snake = [{ x: 10, y: 10 }] // Snake starts in the middle
  let food = { x: Math.floor(Math.random() * canvasSize), y: Math.floor(Math.random() * canvasSize) }
  let direction = "RIGHT"
  let score = 0
  let started = false // wait for a first keypress so the page doesn't alert+reload itself on load

  function drawGrid() {
    for (let i = 0; i < canvasSize; i++) {
      for (let j = 0; j < canvasSize; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? '#2f2047' : '#3a2a58'
        ctx.fillRect(i * box, j * box, box, box)
      }
    }
  }

  function drawSnake() {
    snake.forEach(segment => {
      ctx.fillStyle = '#fda5b1'
      ctx.fillRect(segment.x * box, segment.y * box, box, box)
    })
  }

  function drawFood() {
    ctx.fillStyle = '#f2c14e'
    ctx.fillRect(food.x * box, food.y * box, box, box)
  }

  function moveSnake() {
    const head = { ...snake[0] }
    if (direction === "UP") head.y -= 1
    if (direction === "DOWN") head.y += 1
    if (direction === "LEFT") head.x -= 1
    if (direction === "RIGHT") head.x += 1
    snake.unshift(head)
    // Check if the snake eats the food
    if (head.x === food.x && head.y === food.y) {
      score++
      food = {
        x: Math.floor(Math.random() * canvasSize),
        y: Math.floor(Math.random() * canvasSize),
      }
    } else {
      snake.pop() // Remove the tail if no food is eaten
    }
  }

  window.addEventListener('keydown', event => {
    if (event.key === 'ArrowUp' && direction !== "DOWN") direction = "UP"
    if (event.key === 'ArrowDown' && direction !== "UP") direction = "DOWN"
    if (event.key === 'ArrowLeft' && direction !== "RIGHT") direction = "LEFT"
    if (event.key === 'ArrowRight' && direction !== "LEFT") direction = "RIGHT"
    if (!started && event.key.startsWith('Arrow')) {
      started = true
      setInterval(gameLoop, 100)
    }
  })

  function checkGameOver() {
    const head = snake[0]
    // Check wall collision
    if (head.x < 0 || head.x >= canvasSize || head.y < 0 || head.y >= canvasSize) {
      return true
    }
    // Check self-collision
    for (let i = 1; i < snake.length; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) {
        return true
      }
    }
    return false
  }

  function gameLoop() {
    if (checkGameOver()) {
      alert(`Game Over! Your score: ${score}`)
      document.location.reload()
      return
    }
    drawGrid()
    drawSnake()
    drawFood()
    moveSnake()
  }

  drawGrid()
  drawSnake()
  drawFood()
})();
