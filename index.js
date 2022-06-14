// constants and classes
const Direction = {
  UP: 0,
  DOWN: 1,
  LEFT: 2,
  RIGHT: 3,
};

const Speed = {
  ULTRAFAST: { tickRate: 100 },
  FAST: { tickRate: 150 },
  MEDIUM: { tickRate: 200 },
  SLOW: { tickRate: 400 },
};

function Coord(row, col) {
  return {
    row: row,
    col: col,
  };
}

// speed selectors
let speed = Speed.MEDIUM;
document.getElementById("medium").style = "border-style:inset;";

document.getElementById("ultrafast").onclick = () => {
  speed = Speed.ULTRAFAST;
  document.getElementById("ultrafast").style = "border-style:inset;";
  document.getElementById("fast").style = "";
  document.getElementById("medium").style = "";
  document.getElementById("slow").style = "";
  setMainLoop();
};
document.getElementById("fast").onclick = () => {
  speed = Speed.FAST;
  document.getElementById("ultrafast").style = "";
  document.getElementById("fast").style = "border-style:inset;";
  document.getElementById("medium").style = "";
  document.getElementById("slow").style = "";
  setMainLoop();
};
document.getElementById("medium").onclick = () => {
  speed = Speed.MEDIUM;
  document.getElementById("ultrafast").style = "";
  document.getElementById("fast").style = "";
  document.getElementById("medium").style = "border-style:inset;";
  document.getElementById("slow").style = "";
  setMainLoop();
};
document.getElementById("slow").onclick = () => {
  speed = Speed.SLOW;
  document.getElementById("ultrafast").style = "";
  document.getElementById("fast").style = "";
  document.getElementById("medium").style = "";
  document.getElementById("slow").style = "border-style:inset;";
  setMainLoop();
};

// game-specific config
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// to fix 4 x 3 aspect ratio
const numCols = 20;
const numRows = 15;

const startingRow = Math.floor(numRows / 2);
const startingCol = Math.floor(numCols / 2);

// state
let displayStartScreen = true;
let highestScore = 0;

let snake;
let cherries;
let queuedDirections;
let gameOver;
let pause;
let currentScore;

const highestScoreElement = document.getElementById("highest-score");
const currentScoreElement = document.getElementById("current-score");

function resetGame() {
  snake = [
    Coord(startingRow + 0, startingCol),
    Coord(startingRow + 1, startingCol),
    Coord(startingRow + 2, startingCol),
    Coord(startingRow + 3, startingCol),
    Coord(startingRow + 4, startingCol),
  ];

  cherries = [];
  queuedDirections = [Direction.UP, Direction.UP];
  gameOver = false;
  pause = false;
  currentScore = 0;

  generateNewCherry();
  updateScores();
}

// controls
function keydownHandler(key) {
  switch (key.keyCode) {
    case 38: // arrow up
      queueDirection(Direction.UP);
      break;
    case 40: // arrow down
      queueDirection(Direction.DOWN);
      break;
    case 37: // arrow left
      queueDirection(Direction.LEFT);
      break;
    case 39: // arrow right
      queueDirection(Direction.RIGHT);
      break;
    case 32: // spacebar
      if (displayStartScreen) {
        // on first page load, space required to start the game
        // and exit start screen
        displayStartScreen = false;
      } else if (gameOver) {
        // if gameover, space required to restart game
        resetGame();
      } else {
        // else space will pause or unpause game
        pause = !pause;
      }
      break;
    default:
      // other keypresses ignored
      return;
  }
}
document.addEventListener("keydown", keydownHandler);

function queueDirection(direction) {
  // ensure state is properly initialized before modifying
  if (queuedDirections.length != 2) {
    return;
  }

  // only allow snake to turn left or right, it can't move in opposite direction
  // from its most recent direction i.e. eat its own neck
  if (!isOppositeDirection(queuedDirections[0], direction)) {
    queuedDirections[1] = direction;
  }
}

function isOppositeDirection(d1, d2) {
  switch (d1) {
    case Direction.UP:
      return d2 === Direction.DOWN;
    case Direction.DOWN:
      return d2 === Direction.UP;
    case Direction.LEFT:
      return d2 === Direction.RIGHT;
    case Direction.RIGHT:
      return d2 === Direction.LEFT;
    default:
      throw "Invalid direction: " + d1;
  }
}

// mainloop holds intervaled function i.e. main game loop
let mainLoop;
function setMainLoop() {
  // must clear old intervaled function when changing tickrate
  clearInterval(mainLoop);

  mainLoop = setInterval(function tick() {
    // only displays on first draw; don't update game state until
    // game has started
    if (displayStartScreen) {
      draw();
      drawStartScreen();
      return;
    }

    if (gameOver) {
      draw();
      updateScores();
      drawGameOverScreen();
      return;
    }

    if (pause) {
      draw();
      drawPauseScreen();
      return;
    }

    update();
    draw();
  }, speed.tickRate);
}

function update() {
  if (gameOver) {
    return;
  }

  // not the best use of variable name - queuedDirections[1] stores the
  // NEXT direction that will be used
  // queuedDirections[0] caches the PREVIOUS direction that was used
  let nextDirection;
  nextDirection = queuedDirections[1];
  queuedDirections[0] = queuedDirections[1];

  const nextCoord = calculateNextCoord(snake[0], nextDirection);

  const snakeOverlapsItself =
    snake.filter((snakeCoord) => overlap(nextCoord, snakeCoord)).length !== 0;

  const snakeOutOfBounds =
    nextCoord.row < 0 ||
    nextCoord.row >= numRows ||
    nextCoord.col < 0 ||
    nextCoord.col >= numCols;

  if (snakeOverlapsItself || snakeOutOfBounds) {
    gameOver = true;
    return;
  }

  const snakeEatsCherry =
    cherries.length !== 0 &&
    cherries.filter((cherryCoord) => overlap(nextCoord, cherryCoord)).length !==
      0;

  // move snake forward by appending next head location
  snake.unshift(nextCoord);
  if (!snakeEatsCherry) {
    snake.pop();
  } else {
    currentScore += 1;
    updateScores();
    cherries.pop();
    generateNewCherry();
  }
}

function generateNewCherry() {
  // naive cherry generation - if we can't find an empty space then
  // we just try again in the next tick to keep gameplay smooth
  let foundNewCherry = false;
  let tries = 5;
  while (!foundNewCherry && tries > 0) {
    const newCherryCoord = Coord(
      Math.floor(numRows * Math.random()),
      Math.floor(numRows * Math.random())
    );

    const cherryOverlapsSnake =
      snake.filter((snakeCoord) => overlap(snakeCoord, newCherryCoord))
        .length !== 0;
    if (!cherryOverlapsSnake) {
      foundNewCherry = true;
      cherries.push(newCherryCoord);
      return;
    }
    tries -= 1;
  }
}

function draw() {
  if (gameOver) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);

  const cellWidth = width / numCols;
  const cellHeight = height / numRows;
  
  // draw snake
  ctx.fillStyle = "rgb(125, 158, 205)";
  snake.forEach((snakeCoord) => {
    ctx.fillRect(
      snakeCoord.col * cellWidth,
      snakeCoord.row * cellHeight,
      cellWidth,
      cellHeight
    );
  });

  // draw cherry
  ctx.fillStyle = "rgb(198, 136, 164)";
  cherries.forEach((snakeCoord) => {
    ctx.fillRect(
      snakeCoord.col * cellWidth,
      snakeCoord.row * cellHeight,
      cellWidth,
      cellHeight
    );
  });
}

function drawStartScreen() {
  const width = canvas.width;
  const height = canvas.height;
  const x = 0.25 * width;
  const y = 0.25 * height;

  ctx.fillStyle = "white";
  ctx.font = "20px serif";
  ctx.fillText("Press Space to start!", x, y);
}

function drawGameOverScreen() {
  const width = canvas.width;
  const height = canvas.height;
  const x = 0.2 * width;
  const y = 0.45 * height;

  ctx.fillStyle = "white";
  ctx.font = "15px serif";
  ctx.fillText("Game Over! Press Space to Restart", x, y);
}

function drawPauseScreen() {
  const width = canvas.width;
  const height = canvas.height;
  const x = 0.2 * width;
  const y = 0.45 * height;

  ctx.fillStyle = "white";
  ctx.font = "15px serif";
  ctx.fillText("Game paused! Press Space to unpause", x, y);
}

function overlap(c1, c2) {
  return c1.row === c2.row && c1.col == c2.col;
}

function calculateNextCoord(coord, direction) {
  switch (direction) {
    case Direction.UP:
      return Coord(coord.row - 1, coord.col);
    case Direction.DOWN:
      return Coord(coord.row + 1, coord.col);
    case Direction.LEFT:
      return Coord(coord.row, coord.col - 1);
    case Direction.RIGHT:
      return Coord(coord.row, coord.col + 1);
    default:
      throw "Invalid direction: " + direction;
  }
}

function updateScores() {
  highestScore = Math.max(highestScore, currentScore);
  highestScoreElement.textContent = "Highest score: " + highestScore;
  currentScoreElement.textContent = "Current score: " + currentScore;
}

// init state
resetGame();
// run game
setMainLoop();
