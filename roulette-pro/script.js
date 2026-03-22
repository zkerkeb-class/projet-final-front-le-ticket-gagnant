const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

const wheelGroup = document.getElementById("wheelGroup");
const wheelWrap = document.querySelector(".wheel-wrap");
const ball = document.getElementById("ball");
const targetSelect = document.getElementById("targetNumber");
const spinTargetBtn = document.getElementById("spinTarget");
const spinRandomBtn = document.getElementById("spinRandom");
const resultValue = document.getElementById("resultValue");

const SEGMENT = 360 / WHEEL_ORDER.length;

let wheelAngle = 0;
let ballAngle = -90;
let ballRadius = 342;
let running = false;

buildWheel();
buildSelect();
render();

spinTargetBtn.addEventListener("click", () => {
  spinTo(Number(targetSelect.value));
});

spinRandomBtn.addEventListener("click", () => {
  const random = WHEEL_ORDER[Math.floor(Math.random() * WHEEL_ORDER.length)];
  targetSelect.value = String(random);
  spinTo(random);
});

window.spinTo = spinTo;

function buildSelect() {
  for (let i = 0; i <= 36; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = String(i);
    targetSelect.appendChild(option);
  }
  targetSelect.value = "0";
}

function buildWheel() {
  const center = 400;
  const outerR = 298;
  const innerR = 198;

  const frag = document.createDocumentFragment();

  WHEEL_ORDER.forEach((num, i) => {
    const start = -90 + i * SEGMENT;
    const end = start + SEGMENT;

    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", sectorPath(center, center, outerR, innerR, start, end));
    p.setAttribute("stroke", "url(#goldGrad)");
    p.setAttribute("stroke-width", "2");

    if (num === 0) {
      p.setAttribute("fill", "#0f6b4f");
    } else if (RED_NUMBERS.has(num)) {
      p.setAttribute("fill", "#8f122c");
    } else {
      p.setAttribute("fill", "#111318");
    }

    frag.appendChild(p);

    const textA = start + SEGMENT / 2;
    const textRadius = (outerR + innerR) / 2;
    const tx = center + Math.cos((textA * Math.PI) / 180) * textRadius;
    const ty = center + Math.sin((textA * Math.PI) / 180) * textRadius;

    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", tx.toFixed(2));
    t.setAttribute("y", ty.toFixed(2));
    t.setAttribute("fill", "#ffffff");
    t.setAttribute("font-size", "22");
    t.setAttribute("font-weight", "700");
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("dominant-baseline", "middle");
    t.setAttribute("font-family", "'Times New Roman', Georgia, serif");
    t.setAttribute("transform", `rotate(${textA + 90} ${tx.toFixed(2)} ${ty.toFixed(2)})`);
    t.textContent = String(num);

    frag.appendChild(t);
  });

  wheelGroup.appendChild(frag);
}

function spinTo(number) {
  if (running) return;
  if (!Number.isInteger(number) || number < 0 || number > 36) return;

  running = true;

  const index = WHEEL_ORDER.indexOf(number);
  const targetCenter = -90 + (index + 0.5) * SEGMENT;
  const wheelTarget = normalize(-90 - targetCenter);

  const wheelStart = wheelAngle;
  const wheelDelta = positiveDelta(mod(wheelStart, 360), wheelTarget) + 360 * randomInt(7, 10);
  const wheelEnd = wheelStart + wheelDelta;

  const ballStart = ballAngle;
  const ballFastEnd = ballStart - 360 * randomInt(11, 14);
  const ballFinal = -90;

  const radiusStart = 342;
  const radiusEnd = 280;

  const duration = randomInt(8600, 10200);
  const t0 = performance.now();

  resultValue.textContent = "--";

  const frame = (t) => {
    const p = Math.min((t - t0) / duration, 1);

    const wheelP = easeOutCubic(p);
    wheelAngle = wheelStart + wheelDelta * wheelP;

    if (p < 0.76) {
      const q = p / 0.76;
      const qp = easeOutQuart(q);
      ballAngle = lerp(ballStart, ballFastEnd, qp);
      ballRadius = radiusStart;
    } else {
      const q = (p - 0.76) / 0.24;
      const qp = easeOutCubic(q);
      const bounce = Math.sin(q * Math.PI * 5) * (1 - q) * 6;
      ballAngle = lerp(ballFastEnd, ballFinal, qp) + bounce;
      ballRadius = lerp(radiusStart, radiusEnd, qp) + Math.abs(bounce) * 0.4;
    }

    render();

    if (p < 1) {
      requestAnimationFrame(frame);
      return;
    }

    wheelAngle = wheelEnd;
    ballAngle = ballFinal;
    ballRadius = radiusEnd;
    render();

    resultValue.textContent = String(number);
    running = false;
  };

  requestAnimationFrame(frame);
}

function render() {
  wheelGroup.setAttribute("transform", `rotate(${wheelAngle.toFixed(4)} 400 400)`);

  const rad = (ballAngle * Math.PI) / 180;
  const x = 400 + Math.cos(rad) * ballRadius;
  const y = 400 + Math.sin(rad) * ballRadius;

  const rect = wheelWrap.getBoundingClientRect();
  const ratio = rect.width / 800;

  ball.style.left = `${x * ratio}px`;
  ball.style.top = `${y * ratio}px`;
}

window.addEventListener("resize", render);

function sectorPath(cx, cy, outerR, innerR, startDeg, endDeg) {
  const a0 = (startDeg * Math.PI) / 180;
  const a1 = (endDeg * Math.PI) / 180;

  const x0 = cx + Math.cos(a0) * outerR;
  const y0 = cy + Math.sin(a0) * outerR;
  const x1 = cx + Math.cos(a1) * outerR;
  const y1 = cy + Math.sin(a1) * outerR;

  const x2 = cx + Math.cos(a1) * innerR;
  const y2 = cy + Math.sin(a1) * innerR;
  const x3 = cx + Math.cos(a0) * innerR;
  const y3 = cy + Math.sin(a0) * innerR;

  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M ${x0.toFixed(3)} ${y0.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x1.toFixed(3)} ${y1.toFixed(3)}`,
    `L ${x2.toFixed(3)} ${y2.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x3.toFixed(3)} ${y3.toFixed(3)}`,
    "Z",
  ].join(" ");
}

function normalize(a) {
  return ((a % 360) + 360) % 360;
}

function mod(a, b) {
  return ((a % b) + b) % b;
}

function positiveDelta(current, target) {
  return mod(target - current, 360);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
