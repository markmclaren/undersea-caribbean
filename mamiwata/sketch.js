let boids = [];
let mermaid;
let wave;
let fishImg;
let titleFont;

const NUM_BOIDS = 80;
const NUM_CYAN_BOIDS = 60;
let RAINBOW_COLORS = [];

function preload() {
  mermaid = loadImage("assets/mermaid.png");
  wave = loadImage("assets/waves.png");
  fishImg = loadImage("assets/fish.svg");
  titleFont = loadFont("https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtXK-F2qO0g.woff");
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // p5 color() is available after setup starts.
  RAINBOW_COLORS = [
    color(255, 105, 180),  // Hot pink
    color(255, 255, 0),    // Yellow
    color(255, 165, 0),    // Orange
    color(0, 255, 255),    // Cyan
    color(147, 112, 219)   // Purple
  ];
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  if (boids.length === 0 && RAINBOW_COLORS.length > 0) {
    initializeBoids();
  }

  imageMode(CORNER);
  image(wave, 0, 0, width, height);

  for (let b of boids) {
    b.flock(boids);
    b.update();
    b.edges();
    b.show();
  }

  imageMode(CENTER);
  // Maintain mermaid image aspect ratio, fit within screen
  let imgAspect = mermaid.width / mermaid.height;
  let canvasAspect = width / height;
  let displayWidth, displayHeight;
  if (imgAspect > canvasAspect) {
    displayWidth = width;
    displayHeight = width / imgAspect;
  } else {
    displayHeight = height;
    displayWidth = height * imgAspect;
  }
  image(mermaid, width / 2, height / 2, displayWidth, displayHeight);

  // Attribution title
  if (titleFont) {
    textFont(titleFont);
  }
  let titleStr = "after Mami Wata in Her Kingdom by the artist Moyo Ogundipe";
  let sz = constrain(width * 0.018, 12, 22);
  textSize(sz);
  textAlign(RIGHT, BOTTOM);
  noStroke();
  fill(255, 255, 255, 180);
  text(titleStr, width - 18, height - 14);
}

function initializeBoids() {
  // Black bottom fish (left to right)
  for (let i = 0; i < NUM_BOIDS; i++) {
    boids.push(new Boid(
      random(width),
      random(height * 0.67, height),
      color(0, 0, 0),
      1.0,
      random(3, 7),
      random(1.6, 2.4),
      { softBoundary: height * (2 / 3), hardBoundary: height * 0.5 }
    ));
  }

  // Rainbow middle fish (right to left, slower)
  for (let i = 0; i < NUM_CYAN_BOIDS; i++) {
    boids.push(new Boid(
      random(width),
      random(height * 0.40, height * 0.67),
      random(RAINBOW_COLORS),
      -1.0,
      random(2, 5),
      random(0.8, 1.2),
      { softBoundary: height * (2 / 3), hardBoundary: height * 0.4 }
    ));
  }
}

class Boid {
  constructor(x, y, fishColor = color(255, 140, 0), direction = 1, scale = random(4, 7), maxSpeed = random(1.6, 2.4), boundaries = { softBoundary: height * (2/3), hardBoundary: height * 0.5 }) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(0.3, 1.0) * direction, random(-0.2, 0.2));
    this.acc = createVector();

    this.fishColor = fishColor;
    this.direction = direction;  // 1 for right, -1 for left
    this.scale = scale;
    this.maxForce = 0.07;
    this.maxSpeed = maxSpeed;
    this.boundaries = boundaries;
    this.smoothedAngle = this.vel.heading();
  }

  applyForce(force) {
    this.acc.add(force);
  }

  flock(boids) {
    let sep = this.separate(boids);
    let ali = this.align(boids);
    let coh = this.cohesion(boids);

    sep.mult(2.5);
    ali.mult(0.8);
    coh.mult(0.5);

    this.applyForce(sep);
    this.applyForce(ali);
    this.applyForce(coh);

    // Current based on direction
    this.applyForce(createVector(0.15 * this.direction, 0));

    this.constrainToZone();
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);

    // Smooth the heading angle to reduce jitter
    let targetAngle = this.vel.heading();
    let diff = targetAngle - this.smoothedAngle;
    // Wrap angle difference to [-PI, PI]
    while (diff > PI) diff -= TWO_PI;
    while (diff < -PI) diff += TWO_PI;
    this.smoothedAngle += diff * 0.1;
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.smoothedAngle);
    scale(this.scale);

    imageMode(CENTER);
    tint(this.fishColor);
    image(fishImg, 0, 0, 26, 10);
    noTint();
    pop();
  }

  edges() {
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.y > height) this.pos.y = height;
    if (this.pos.y < 0) this.pos.y = 0;
  }

  constrainToZone() {
    let { softBoundary, hardBoundary } = this.boundaries;
    
    // If above soft boundary, pull down
    if (this.pos.y < softBoundary) {
      let distAbove = softBoundary - this.pos.y;
      let maxDist = softBoundary - hardBoundary;
      let force = 0.05 + (distAbove / maxDist) * 0.1;
      this.applyForce(createVector(0, force));
    }
    // If below soft boundary + some margin, pull up
    else if (this.pos.y > softBoundary + 50) {
      let distBelow = this.pos.y - softBoundary;
      let force = 0.05 + (distBelow / 150) * 0.08;
      this.applyForce(createVector(0, -force));
    }
  }

  separate(boids) {
    let steer = createVector();
    let count = 0;

    for (let other of boids) {
      let d = p5.Vector.dist(this.pos, other.pos);
      let desired = other.direction === this.direction ? 120 : 220;
      if (d > 0 && d < desired) {
        let diff = p5.Vector.sub(this.pos, other.pos);
        diff.normalize();
        diff.div(d);
        if (other.direction !== this.direction) {
          diff.mult(1.8);
        }
        steer.add(diff);
        count++;
      }
    }

    if (count > 0) steer.div(count);
    if (steer.mag() > 0) {
      steer.setMag(this.maxSpeed);
      steer.sub(this.vel);
      steer.limit(this.maxForce);
    }
    return steer;
  }

  align(boids) {
    let dist = 70;
    let sum = createVector();
    let count = 0;

    for (let other of boids) {
      let d = p5.Vector.dist(this.pos, other.pos);
      if (d > 0 && d < dist && other.direction === this.direction) {
        sum.add(other.vel);
        count++;
      }
    }

    if (count > 0) {
      sum.div(count);
      sum.setMag(this.maxSpeed);
      let steer = p5.Vector.sub(sum, this.vel);
      steer.limit(this.maxForce);
      return steer;
    }
    return createVector();
  }

  cohesion(boids) {
    let dist = 70;
    let sum = createVector();
    let count = 0;

    for (let other of boids) {
      let d = p5.Vector.dist(this.pos, other.pos);
      if (d > 0 && d < dist && other.direction === this.direction) {
        sum.add(other.pos);
        count++;
      }
    }

    if (count > 0) {
      sum.div(count);
      return this.seek(sum);
    }
    return createVector();
  }

  seek(target) {
    let desired = p5.Vector.sub(target, this.pos);
    desired.setMag(this.maxSpeed);
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    return steer;
  }
}
