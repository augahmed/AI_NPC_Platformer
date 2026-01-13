const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const dialog = document.getElementById("dialog");

const world = {
  gravity: 0.55,
  friction: 0.8,
  floor: 500,
};

const keys = {
  left: false,
  right: false,
  jump: false,
  talk: false,
};

const player = {
  x: 80,
  y: 420,
  w: 36,
  h: 48,
  vx: 0,
  vy: 0,
  speed: 4,
  jump: 11,
  grounded: false,
};

const levels = [
  {
    spawnX: 80,
    spawnY: 420,
    goal: { x: 880, y: 260, w: 40, h: 50 },
    platforms: [
      { x: 0, y: world.floor, w: canvas.width, h: 40 },
      { x: 140, y: 420, w: 200, h: 18 },
      { x: 420, y: 350, w: 180, h: 18 },
      { x: 690, y: 300, w: 160, h: 18 },
      { x: 560, y: 450, w: 160, h: 18 },
    ],
    npcs: [
      {
        name: "Mira",
        x: 520,
        y: 310,
        w: 34,
        h: 44,
        vx: 1.1,
        minX: 460,
        maxX: 620,
        message: "Collect two jumps, then head right for the tall ledge.",
      },
      {
        name: "Rook",
        x: 240,
        y: 380,
        w: 36,
        h: 46,
        vx: 0.9,
        minX: 170,
        maxX: 320,
        message: "I patrol here. Press E when you are close to chat.",
      },
    ],
  },
  {
    spawnX: 60,
    spawnY: 400,
    goal: { x: 880, y: 180, w: 40, h: 50 },
    platforms: [
      { x: 0, y: world.floor, w: canvas.width, h: 40 },
      { x: 120, y: 430, w: 180, h: 18 },
      { x: 360, y: 380, w: 150, h: 18 },
      { x: 560, y: 320, w: 160, h: 18 },
      { x: 740, y: 260, w: 120, h: 18 },
    ],
    npcs: [
      {
        name: "Sol",
        x: 390,
        y: 330,
        w: 34,
        h: 44,
        vx: 1.2,
        minX: 350,
        maxX: 480,
        message: "The goal is up high. Keep moving right!",
      },
    ],
  },
];

let levelIndex = 0;
let platforms = [];
let npcs = [];
let goal = null;
let spawnX = 80;
let spawnY = 420;
let gameWon = false;

function cloneRects(rects) {
  return rects.map((rect) => ({ ...rect }));
}

function cloneNPCs(list) {
  return list.map((npc) => ({ ...npc }));
}

function setLevel(nextIndex, entrySide = "start") {
  levelIndex = nextIndex;
  const level = levels[levelIndex];
  platforms = cloneRects(level.platforms);
  npcs = cloneNPCs(level.npcs);
  goal = { ...level.goal };
  spawnX = level.spawnX;
  spawnY = level.spawnY;
  player.x = entrySide === "right" ? canvas.width - player.w - 10 : 10;
  if (entrySide === "start") player.x = spawnX;
  player.y = spawnY;
  player.vx = 0;
  player.vy = 0;
  gameWon = false;
  dialog.textContent = "";
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function resolveVertical(entity, platform) {
  if (!rectsOverlap(entity, platform)) return false;

  const overlapTop = entity.y + entity.h - platform.y;
  const overlapBottom = platform.y + platform.h - entity.y;

  if (overlapTop < overlapBottom) {
    entity.y = platform.y - entity.h;
    entity.vy = 0;
    entity.grounded = true;
    return true;
  }

  entity.y = platform.y + platform.h;
  entity.vy = 0;
  return true;
}

function resolveHorizontal(entity, platform) {
  if (!rectsOverlap(entity, platform)) return false;

  const overlapLeft = entity.x + entity.w - platform.x;
  const overlapRight = platform.x + platform.w - entity.x;

  if (overlapLeft < overlapRight) {
    entity.x = platform.x - entity.w;
  } else {
    entity.x = platform.x + platform.w;
  }

  entity.vx = 0;
  return true;
}

function updatePlayer() {
  if (gameWon) return;
  if (keys.left) player.vx = -player.speed;
  if (keys.right) player.vx = player.speed;
  if (!keys.left && !keys.right) player.vx *= world.friction;

  if (keys.jump && player.grounded) {
    player.vy = -player.jump;
    player.grounded = false;
  }

  player.vy += world.gravity;

  player.x += player.vx;
  platforms.forEach((platform) => resolveHorizontal(player, platform));

  player.y += player.vy;
  player.grounded = false;
  platforms.forEach((platform) => resolveVertical(player, platform));

  if (player.x > canvas.width) {
    if (levelIndex < levels.length - 1) {
      setLevel(levelIndex + 1, "left");
      return;
    }
    player.x = canvas.width - player.w;
  }

  if (player.x + player.w < 0) {
    if (levelIndex > 0) {
      setLevel(levelIndex - 1, "right");
      return;
    }
    player.x = 0;
  }

  if (player.y > canvas.height + 200) {
    player.x = spawnX;
    player.y = spawnY;
    player.vx = 0;
    player.vy = 0;
  }
}

function updateNPCs() {
  if (gameWon) return;
  npcs.forEach((npc) => {
    npc.x += npc.vx;
    if (npc.x < npc.minX || npc.x > npc.maxX) {
      npc.vx *= -1;
    }
  });
}

function updateDialog() {
  if (gameWon) {
    dialog.textContent = "Goal reached! Refresh to play again.";
    return;
  }
  const nearby = npcs.find((npc) => {
    const distX = Math.abs(player.x + player.w / 2 - (npc.x + npc.w / 2));
    const distY = Math.abs(player.y + player.h / 2 - (npc.y + npc.h / 2));
    return distX < 70 && distY < 60;
  });

  if (nearby && keys.talk) {
    dialog.textContent = `${nearby.name}: ${nearby.message}`;
  } else if (nearby) {
    dialog.textContent = `${nearby.name} looks ready to talk. Press E.`;
  } else {
    dialog.textContent = "";
  }
}

function drawBackground() {
  ctx.fillStyle = "#d7f0ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffe8c8";
  ctx.beginPath();
  ctx.arc(110, 90, 45, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlatforms() {
  platforms.forEach((platform) => {
    ctx.fillStyle = platform.y >= world.floor ? "#3f3326" : "#6d5743";
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
  });
}

function drawGoal() {
  if (!goal) return;
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
  ctx.fillStyle = "#c05621";
  ctx.fillRect(goal.x + 12, goal.y + 10, 16, 24);
}

function drawPlayer() {
  ctx.fillStyle = "#1d3557";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  ctx.fillStyle = "#f1faee";
  ctx.fillRect(player.x + 8, player.y + 10, 6, 6);
}

function drawNPCs() {
  npcs.forEach((npc) => {
    ctx.fillStyle = "#e26d5a";
    ctx.fillRect(npc.x, npc.y, npc.w, npc.h);

    ctx.fillStyle = "#fff";
    ctx.fillRect(npc.x + 10, npc.y + 12, 6, 6);
  });
}

function checkGoal() {
  if (!goal || gameWon) return;
  if (rectsOverlap(player, goal)) {
    if (levelIndex < levels.length - 1) {
      setLevel(levelIndex + 1, "left");
    } else {
      gameWon = true;
      player.vx = 0;
      player.vy = 0;
    }
  }
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawPlatforms();
  drawGoal();
  drawNPCs();
  drawPlayer();
  updatePlayer();
  updateNPCs();
  updateDialog();
  checkGoal();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "ArrowLeft":
    case "a":
    case "A":
      keys.left = true;
      break;
    case "ArrowRight":
    case "d":
    case "D":
      keys.right = true;
      break;
    case " ":
      keys.jump = true;
      break;
    case "e":
    case "E":
      keys.talk = true;
      break;
    default:
      break;
  }
});

window.addEventListener("keyup", (event) => {
  switch (event.key) {
    case "ArrowLeft":
    case "a":
    case "A":
      keys.left = false;
      break;
    case "ArrowRight":
    case "d":
    case "D":
      keys.right = false;
      break;
    case " ":
      keys.jump = false;
      break;
    case "e":
    case "E":
      keys.talk = false;
      break;
    default:
      break;
  }
});

setLevel(0, "start");
loop();
