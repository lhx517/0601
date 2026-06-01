let bullets = [];
let monsters = [];
let particles = [];
let lastShotTime = 0;
let lastSpawnTime = 0;
let bulletSpeed = 7;
let shootInterval = 500; // 0.5秒
let gameDuration = 60000; // 1分鐘 (60,000 毫秒)
let spawnInterval = 2000; // 每2秒生成一隻怪物
let monsterSize = 40;
let monsterSpeed = 1.2; // 怪物移動速度
let penaltyTime = 0; // 累計被撞扣除的時間 (毫秒)
let xp = 0; // 累計經驗值
let stars = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  // 初始化背景星點
  for (let i = 0; i < 100; i++) {
    stars.push({ x: random(width), y: random(height), size: random(1, 3), speed: random(0.2, 1) });
  }
}

function draw() {
  // 檢查時間是否超過 60 秒
  let currentTime = millis();
  if (currentTime + penaltyTime > gameDuration) {
    background(10, 10, 25);
    drawBackground();
    fill(255, 50, 50);
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = 'red';
    textAlign(CENTER, CENTER);
    textSize(80);
    text("時間到！", width / 2, height / 2 - 40);
    textSize(40);
    text("總得分: " + xp, width / 2, height / 2 + 60);
    drawingContext.shadowBlur = 0;
    noLoop(); // 停止 draw 迴圈
    return;
  }

  background(10, 10, 25);
  drawBackground();

  let centerX = width / 2;
  let centerY = height / 2;

  // 決定目前等級
  let level = 1;
  if (xp >= 1200) level = 3;
  else if (xp >= 500) level = 2;

  // 1. 計算炮台角度（瞄準滑鼠）
  let angle = atan2(mouseY - centerY, mouseX - centerX);

  // 2. 繪製炮台
  push();
  translate(centerX, centerY);
  rotate(angle);
  
  drawingContext.shadowBlur = 15;
  drawingContext.shadowColor = level === 3 ? 'orange' : 'cyan';
  fill(level === 3 ? [255, 150, 0] : [50, 200, 255]);
  stroke(255);
  strokeWeight(2);

  if (level === 1) {
    rect(20, 0, 50, 16, 5); // 等級 1：單砲管
  } else {
    rect(20, -12, 50, 14, 5); // 前方雙砲管
    rect(20, 12, 50, 14, 5);
    if (level === 3) {
      rect(-20, -12, 45, 14, 5); // 後方雙砲管
      rect(-20, 12, 45, 14, 5);
    }
  }
  
  // 繪製砲座
  fill(20, 50, 80);
  circle(0, 0, 55);
  fill(255); // 核心
  circle(0, 0, 15);
  pop();
  drawingContext.shadowBlur = 0;

  // 3. 怪物生成邏輯
  if (currentTime - lastSpawnTime > spawnInterval) {
    spawnMonster();
    lastSpawnTime = currentTime;
  }

  // 4. 自動射擊邏輯 (每0.5秒)
  if (currentTime - lastShotTime > shootInterval) {
    if (level === 1) {
      shoot(centerX, centerY, angle);
    } else {
      // 等級 2 & 3：前方並排兩發
      let offX = cos(angle + HALF_PI) * 10;
      let offY = sin(angle + HALF_PI) * 10;
      shoot(centerX + offX, centerY + offY, angle);
      shoot(centerX - offX, centerY - offY, angle);

      if (level === 3) {
        // 等級 3：背後也射兩發
        shoot(centerX + offX, centerY + offY, angle + PI);
        shoot(centerX - offX, centerY - offY, angle + PI);
      }
    }
    lastShotTime = currentTime;
  }

  // 5. 更新並顯示所有子彈
  bulletLoop:
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    b.x += cos(b.angle) * bulletSpeed;
    b.y += sin(b.angle) * bulletSpeed;

    // 繪製子彈
    drawingContext.shadowBlur = 12;
    drawingContext.shadowColor = 'red';
    fill(255, 100, 100);
    noStroke();
    circle(b.x, b.y, 15);
    drawingContext.shadowBlur = 0;

    // 檢查是否打到怪物
    for (let j = monsters.length - 1; j >= 0; j--) {
      let m = monsters[j];
      let d = dist(b.x, b.y, m.x, m.y);
      if (d < (15 / 2 + monsterSize / 2)) {
        m.hp -= 1; // 扣血
        bullets.splice(i, 1); // 子彈消失
        if (m.hp <= 0) {
          createExplosion(m.x, m.y); // 產生爆炸特效
          monsters.splice(j, 1); // 怪物死亡
          xp += 100; // 擊殺獎勵 100 XP
        }
        continue bulletLoop; // 跳過此子彈後續處理
      }
    }

    // 效能優化：如果子彈飛出螢幕就從陣列中移除
    if (b.x < 0 || b.x > width || b.y < 0 || b.y > height) {
      bullets.splice(i, 1);
    }
  }

  // 6. 更新並顯示所有怪物
  for (let i = monsters.length - 1; i >= 0; i--) {
    let m = monsters[i];

    // 讓怪物往中心移動
    let angleToCenter = atan2(height / 2 - m.y, width / 2 - m.x);
    m.x += cos(angleToCenter) * monsterSpeed;
    m.y += sin(angleToCenter) * monsterSpeed;

    // 檢查是否撞到炮台 (40是砲座直徑)
    if (dist(m.x, m.y, width / 2, height / 2) < 40) {
      penaltyTime += 5000; // 撞到炮台扣除 5 秒
      monsters.splice(i, 1);
      continue;
    }

    // 繪製怪物
    push();
    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = m.hp === 1 ? 'red' : 'green';
    fill(m.hp === 1 ? [255, 80, 80] : [100, 255, 150]);
    stroke(255);
    strokeWeight(2);
    rect(m.x, m.y, monsterSize, monsterSize, 10);
    fill(0); // 眼睛效果
    circle(m.x - 8, m.y - 5, 6);
    circle(m.x + 8, m.y - 5, 6);
    pop();

    // 繪製血量格 (3格)
    for (let k = 0; k < 3; k++) {
      fill(k < m.hp ? [255, 50, 50] : [60, 60, 60]);
      noStroke();
      rect(m.x - 12 + k * 12, m.y - 30, 10, 5);
    }
  }

  // 7. 更新並顯示粒子特效
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 5; // 逐漸淡出

    fill(100, 255, 100, p.alpha); // 使用怪物顏色（綠色調）
    noStroke();
    circle(p.x, p.y, p.size);

    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }

  // 7. 顯示倒數計時器
  let timeLeft = (gameDuration - currentTime - penaltyTime) / 1000;
  if (timeLeft < 0) timeLeft = 0;
  
  // UI 儀表板
  fill(255, 20);
  noStroke();
  rect(130, 60, 230, 90, 15);
  fill(0, 255, 255);
  textAlign(LEFT, CENTER);
  textSize(22);
  text("⏳ 時間: " + nf(timeLeft, 1, 1) + "s", 35, 40);
  fill(255, 200, 0);
  text("✨ 經驗: " + xp + " (Lv." + level + ")", 35, 75);
}

function drawBackground() {
  stroke(30, 40, 80, 100);
  strokeWeight(1);
  for (let i = 0; i < width; i += 60) line(i, 0, i, height);
  for (let i = 0; i < height; i += 60) line(0, i, width, i);
  noStroke();
  fill(255);
  for (let s of stars) {
    circle(s.x, s.y, s.size);
    s.y = (s.y + s.speed) % height;
  }
}
function resetGame() {
  bullets = [];
  monsters = [];
  particles = [];
  lastShotTime = 0;
  lastSpawnTime = 0;
  penaltyTime = 0;
  xp = 0;
  gameStartTime = millis();
  isGameOver = false;
}

function mousePressed() {
  if (isGameOver) {
    resetGame();
  }
}

function keyPressed() {
  if (isGameOver) {
    resetGame();
  }
}

function shoot(x, y, a) {
  // 建立子彈物件並加入陣列
  bullets.push({ x: x, y: y, angle: a });
}

function spawnMonster() {
  // 在畫面隨機位置生成怪物，並確保不會生在炮台正中心
  let mx = random(50, width - 50);
  let my = random(50, height - 50);
  if (dist(mx, my, width / 2, height / 2) > 100) {
    monsters.push({ x: mx, y: my, hp: 3 });
  }
}

function createExplosion(x, y) {
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: x,
      y: y,
      vx: random(-3, 3),
      vy: random(-3, 3),
      size: random(2, 6),
      alpha: 255
    });
  }
}