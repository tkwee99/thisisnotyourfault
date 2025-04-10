/*========== 全局变量 ==========*/
let currentShape = null;
let bgGraphics;
let customFont;
const FIXED_PADDING = 25; // 固定40pt的padding
const MAX_SMALL_SIZE = 40; // 小文字最大40pt
let canvas; // [新增] 全局canvas引用

/*========== 预加载 ==========*/
function preload() {
  customFont = loadFont('assets/WhyteInktrap.otf');
}

/*========== p5.js 生命周期函数 ==========*/
function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  textFont(customFont);
  createBackground();
  resetCanvas();
  setupTouchEvents();
}

/*========== 绘图循环 ==========*/
function draw() {
  background('#E4E4E4');
  if (bgGraphics) image(bgGraphics, 0, 0);
  
  if ((mouseIsPressed || touches.length > 0) && currentShape) { // [修改] 增加触摸判断
    currentShape.displayPreview();
  }
  
  if (currentShape?.finalized) {
    currentShape.displayFinal();
  }
}

/*========== 背景系统 ==========*/
function createBackground() {
  if (!customFont) return;
  
  bgGraphics = createGraphics(width, height);
  bgGraphics.background('#E4E4E4');

  // 使用固定padding
  let padding = FIXED_PADDING;
  
  // 计算字体大小（保持比例但限制最大值）
  let titleSize = min(width * 0.12, 120); // 主标题最大60pt
  let smallSize = min(width * 0.04, MAX_SMALL_SIZE); // 限制最大40pt
  
  // 行距计算
  let titleLeading = titleSize * 0.9;
  let smallLeading = smallSize * 0.9;

  // ---------- 左上角 ----------
  bgGraphics.textFont(customFont);
  bgGraphics.textSize(titleSize);
  bgGraphics.textAlign(LEFT, TOP);
  bgGraphics.fill(0);
  
  let topText = ["IT‘S A DRESS", "NOT A “YES”"];
  let topY = padding;

  topText.forEach((line, i) => {
    bgGraphics.text(line, padding, topY + i * titleLeading);
  });

  // ---------- 左下角 ----------
  bgGraphics.textFont('Arial');
  bgGraphics.textSize(smallSize);
  bgGraphics.textAlign(LEFT, BOTTOM);
  let bottomLeftText = ["SAY NO TO", "SEXUAL", "OBJECTIFICATION"];
  let bottomLeftY = height - padding;

  bottomLeftText.reverse().forEach((line, i) => {
    bgGraphics.text(line, padding, bottomLeftY - i * smallLeading);
  });

  // ---------- 右下角 ----------
  bgGraphics.textFont('Arial');
  let bottomRightText = ["THIS IS", "NOT YOUR", "FAULT"];
  let bottomRightX = width - padding;
  let bottomRightY = height - padding;

  bottomRightText.reverse().forEach((line, i) => {
    bgGraphics.textAlign(RIGHT, BOTTOM);
    bgGraphics.text(line, bottomRightX, bottomRightY - i * smallLeading);
  });
}


/*========== 其余代码保持不变 ==========*/
// [新增] 移动端事件设置函数
function setupTouchEvents() {
  // 检测触摸设备
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  if (isTouchDevice) {
    // 获取canvas DOM元素
    const canvasElem = document.querySelector('canvas');
    
    // 触摸开始
    canvasElem.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const pos = {
        x: touch.clientX - canvasElem.offsetLeft,
        y: touch.clientY - canvasElem.offsetTop
      };
      mousePressed();
      currentShape.addPoint(pos.x, pos.y);
    }, { passive: false });
    
    // 触摸移动
    canvasElem.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const pos = {
        x: touch.clientX - canvasElem.offsetLeft,
        y: touch.clientY - canvasElem.offsetTop
      };
      currentShape?.addPoint(pos.x, pos.y);
    }, { passive: false });
    
    // 触摸结束
    canvasElem.addEventListener('touchend', () => {
      mouseReleased();
    });
  }
}

function mousePressed() {
  resetCanvas();
  currentShape = new Shape();
}

function mouseDragged() {
  currentShape?.addPoint(mouseX, mouseY);
}

function mouseReleased() {
  if (currentShape?.points.length > 2) {
    currentShape.finalize();
  }
}

class Shape {
  constructor() {
    this.points = [];
    this.finalized = false;
    this.textGraphics = null;
  }

  addPoint(x, y) {
    if (!this.finalized) {
      // [新增] 触摸设备点平滑
      if (touches.length > 0 && this.points.length > 0) {
        const last = this.points[this.points.length-1];
        const dist = Math.sqrt((x-last.x)**2 + (y-last.y)**2);
        if (dist > 20) {
          const steps = Math.ceil(dist / 10);
          for (let i = 1; i < steps; i++) {
            const t = i / steps;
            this.points.push(createVector(
              lerp(last.x, x, t),
              lerp(last.y, y, t)
            ));
          }
        }
      }
      this.points.push(createVector(x, y));
    }
  }

  displayPreview() {
    noFill();
    stroke(0);
    beginShape();
    this.points.forEach(p => vertex(p.x, p.y));
    endShape();
  }

  finalize() {
    this.finalized = true;
    this.createTextMask();
  }

  createTextMask() {
    this.textGraphics = createGraphics(width, height);
    this.textGraphics.background('#FF9BF4');
    this.textGraphics.fill(0);
    this.textGraphics.textFont('Arial');
    this.textGraphics.textSize(20);

    const textContent = "THIS IS NOT YOUR FAULT ";
    const textWidth = this.textGraphics.textWidth(textContent);
    
    for (let y = 0; y < height; y += 24) {
      const xOffset = y % 48 === 0 ? textWidth/2 : 0;
      for (let x = -textWidth; x < width; x += textWidth + 3) {
        this.textGraphics.text(textContent, x + xOffset, y);
      }
    }
  }

  displayFinal() {
    drawingContext.save();
    this.applyClipping();
    image(this.textGraphics, 0, 0);
    drawingContext.restore();
    this.drawBorder();
  }

  applyClipping() {
    drawingContext.beginPath();
    this.points.forEach((p, i) => 
      i === 0 ? drawingContext.moveTo(p.x, p.y) 
              : drawingContext.lineTo(p.x, p.y));
    drawingContext.closePath();
    drawingContext.clip();
  }

  drawBorder() {
    noFill();
    stroke(0);
    beginShape();
    this.points.forEach(p => vertex(p.x, p.y));
    endShape(CLOSE);
  }
}

function resetCanvas() {
  background('#E4E4E4');
  if (bgGraphics) image(bgGraphics, 0, 0);
  currentShape = null;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createBackground();
  resetCanvas();
}