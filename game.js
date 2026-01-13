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
  choice1: false,
  choice2: false,
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
      { x: 170, y: 420, w: 160, h: 18 },
      { x: 440, y: 320, w: 140, h: 18 },
      { x: 720, y: 300, w: 140, h: 18 },
    ],
    npcs: [],
  },
  {
    spawnX: 60,
    spawnY: 400,
    goal: null,
    platforms: [
      { x: 0, y: world.floor, w: canvas.width, h: 40 },
      { x: 140, y: 430, w: 150, h: 18 },
      { x: 380, y: 370, w: 120, h: 18 },
      { x: 600, y: 300, w: 120, h: 18 },
      { x: 90, y: 320, w: 140, h: 18 },
    ],
    npcs: [
      {
        id: "bartender",
        name: "Bartender",
        x: 120,
        y: 274,
        w: 36,
        h: 46,
        vx: 0.6,
        minX: 110,
        maxX: 180,
        message: "Portal upstairs needs a key. Want one?",
      },
    ],
  },
  {
    spawnX: 70,
    spawnY: 420,
    goal: { x: 880, y: 220, w: 40, h: 50 },
    platforms: [
      { x: 0, y: world.floor, w: canvas.width, h: 40 },
      { x: 190, y: 420, w: 140, h: 18 },
      { x: 430, y: 350, w: 120, h: 18 },
      { x: 650, y: 280, w: 110, h: 18 },
    ],
    npcs: [],
  },
  {
    spawnX: 70,
    spawnY: 420,
    goal: { x: 880, y: 200, w: 40, h: 50 },
    platforms: [
      { x: 0, y: world.floor, w: canvas.width, h: 40 },
      { x: 170, y: 430, w: 120, h: 18 },
      { x: 390, y: 360, w: 110, h: 18 },
      { x: 590, y: 300, w: 100, h: 18 },
      { x: 770, y: 240, w: 90, h: 18 },
      { x: 120, y: 280, w: 140, h: 18 },
    ],
    npcs: [
      {
        id: "miner",
        name: "Miner",
        x: 150,
        y: 234,
        w: 36,
        h: 46,
        vx: 0.7,
        minX: 130,
        maxX: 210,
        message: "Rockslide ahead. Want a pickaxe?",
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
let talkTarget = null;
let dialogOpen = false;
let portal = null;
let rock = null;
const inventory = {
  key: false,
  pickaxe: false,
};

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
  goal = level.goal ? { ...level.goal } : null;
  spawnX = level.spawnX;
  spawnY = level.spawnY;
  player.x = entrySide === "right" ? canvas.width - player.w - 10 : 10;
  if (entrySide === "start") player.x = spawnX;
  player.y = spawnY;
  player.vx = 0;
  player.vy = 0;
  gameWon = false;
  talkTarget = null;
  dialogOpen = false;
  portal = null;
  rock = null;
  if (levelIndex === 1) {
    portal = { x: 760, y: 200, w: 70, h: 180, locked: !inventory.key };
  }
  if (levelIndex === 3) {
    rock = { x: 610, y: 220, w: 120, h: 120, blocking: !inventory.pickaxe };
  }
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
  if (gameWon || dialogOpen) return;
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

  if (portal && portal.locked && rectsOverlap(player, portal)) {
    player.vy = Math.max(player.vy, 8);
    player.grounded = false;
  }
  if (rock && rock.blocking && rectsOverlap(player, rock)) {
    player.x = Math.min(player.x, rock.x - player.w);
    player.vx = 0;
  }

  if (player.x > canvas.width) {
    if (levelIndex === 1) {
      player.x = canvas.width - player.w;
      return;
    }
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
  if (gameWon || dialogOpen) return;
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

  if (!dialogOpen) {
    if (nearby && keys.talk) {
      dialogOpen = true;
      talkTarget = nearby;
    } else if (nearby) {
      dialog.textContent = `${nearby.name} looks ready to talk. Press E.`;
      return;
    } else {
      dialog.textContent = "";
      talkTarget = null;
      return;
    }
  }

  if (!talkTarget) {
    dialogOpen = false;
    dialog.textContent = "";
    return;
  }

  if (talkTarget.id === "bartender") {
    if (inventory.key) {
      dialog.textContent = `${talkTarget.name}: You already have the key. [2] Leave`;
    } else {
      dialog.textContent = `${talkTarget.name}: ${talkTarget.message} [1] Yes, give me a key. [2] No thanks.`;
    }
  } else if (talkTarget.id === "miner") {
    if (inventory.pickaxe) {
      dialog.textContent = `${talkTarget.name}: Keep that pickaxe safe. [2] Leave`;
    } else {
      dialog.textContent = `${talkTarget.name}: ${talkTarget.message} [1] Yes, give me a pickaxe. [2] Not now.`;
    }
  } else {
    dialog.textContent = `${talkTarget.name}: ${talkTarget.message} [2] Leave`;
  }

  if (keys.choice1) {
    if (talkTarget.id === "bartender" && !inventory.key) {
      inventory.key = true;
      if (portal) portal.locked = false;
      dialog.textContent = "You received a key. The portal unlocks.";
    }
    if (talkTarget.id === "miner" && !inventory.pickaxe) {
      inventory.pickaxe = true;
      if (rock) rock.blocking = false;
      dialog.textContent = "You received a pickaxe. The rock crumbles.";
    }
    keys.choice1 = false;
    dialogOpen = false;
    talkTarget = null;
  }
  if (keys.choice2) {
    dialog.textContent = "Maybe later.";
    keys.choice2 = false;
    dialogOpen = false;
    talkTarget = null;
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

function drawPortal() {
  if (!portal) return;
  ctx.fillStyle = portal.locked ? "#303654" : "#4ccf7b";
  ctx.fillRect(portal.x, portal.y, portal.w, portal.h);
  ctx.fillStyle = portal.locked ? "#1a1d2e" : "#f5ffe8";
  ctx.fillRect(portal.x + 10, portal.y + 18, portal.w - 20, portal.h - 36);
  if (portal.locked) {
    ctx.fillStyle = "#c9b38b";
    ctx.fillRect(portal.x + 18, portal.y + 70, 34, 24);
    ctx.strokeStyle = "#c9b38b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(portal.x + 35, portal.y + 68, 10, Math.PI, 0);
    ctx.stroke();
  }
}

function drawRock() {
  if (!rock || !rock.blocking) return;
  ctx.fillStyle = "#6b5b4d";
  ctx.fillRect(rock.x, rock.y, rock.w, rock.h);
  ctx.fillStyle = "#4b3f35";
  ctx.fillRect(rock.x + 8, rock.y + 10, rock.w - 16, rock.h - 20);
}

function drawGoal() {
  if (!goal) return;
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
  ctx.fillStyle = "#c05621";
  ctx.fillRect(goal.x + 12, goal.y + 10, 16, 24);
}

function drawPlayer() {
  ctx.fillStyle = "#4a4e69";
  ctx.fillRect(player.x, player.y + 10, player.w, player.h - 10);
  ctx.fillStyle = "#2f2f3a";
  ctx.fillRect(player.x + 6, player.y, player.w - 12, 12);
  ctx.fillStyle = "#c9b38b";
  ctx.fillRect(player.x + 10, player.y + 16, 6, 6);
  ctx.fillRect(player.x + 20, player.y + 16, 6, 6);
  ctx.fillStyle = "#b56576";
  ctx.fillRect(player.x + player.w - 12, player.y + 18, 10, 18);
  ctx.fillStyle = "#f1faee";
  ctx.fillRect(player.x + 4, player.y + 20, 6, 20);
}

function drawNPCs() {
  npcs.forEach((npc) => {
    if (npc.id === "bartender") {
      ctx.fillStyle = "#5c3b2e";
      ctx.fillRect(npc.x, npc.y + 12, npc.w, npc.h - 12);
      ctx.fillStyle = "#8d5a3b";
      ctx.fillRect(npc.x + 6, npc.y, npc.w - 12, 12);
      ctx.fillStyle = "#f4e2c9";
      ctx.fillRect(npc.x + 10, npc.y + 18, 6, 6);
      ctx.fillStyle = "#f7f3e9";
      ctx.fillRect(npc.x + 6, npc.y + 28, npc.w - 12, 10);
    } else if (npc.id === "miner") {
      ctx.fillStyle = "#6b4f3b";
      ctx.fillRect(npc.x, npc.y + 12, npc.w, npc.h - 12);
      ctx.fillStyle = "#d4a017";
      ctx.fillRect(npc.x + 6, npc.y, npc.w - 12, 12);
      ctx.fillStyle = "#f4e2c9";
      ctx.fillRect(npc.x + 12, npc.y + 18, 6, 6);
      ctx.fillStyle = "#3d3d3d";
      ctx.fillRect(npc.x + npc.w - 10, npc.y + 22, 6, 16);
    } else {
      ctx.fillStyle = "#e26d5a";
      ctx.fillRect(npc.x, npc.y, npc.w, npc.h);
      ctx.fillStyle = "#fff";
      ctx.fillRect(npc.x + 10, npc.y + 12, 6, 6);
    }
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

function checkPortal() {
  if (!portal || gameWon) return;
  if (!portal.locked && rectsOverlap(player, portal)) {
    setLevel(2, "left");
  }
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawPlatforms();
  drawPortal();
  drawRock();
  drawGoal();
  drawNPCs();
  drawPlayer();
  updatePlayer();
  updateNPCs();
  updateDialog();
  checkPortal();
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
    case "1":
      keys.choice1 = true;
      break;
    case "2":
      keys.choice2 = true;
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
    case "1":
      keys.choice1 = false;
      break;
    case "2":
      keys.choice2 = false;
      break;
    default:
      break;
  }
});

setLevel(0, "start");
loop();
