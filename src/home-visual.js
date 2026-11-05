const canvas = document.querySelector("#polymetric-canvas");
const stage = document.querySelector("[data-signal-stage]");
const hero = document.querySelector(".hero");

if (canvas && stage && hero) {
  const ctx = canvas.getContext("2d", { alpha: true });
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");

  if (ctx) {
    const TAU = Math.PI * 2;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let width = 0;
    let height = 0;
    let ratio = 1;
    let frameId = 0;
    let previousFrame = 0;
    let inView = true;

    const line = (x1, y1, x2, y2) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    const arc = (x, y, radius, start, end) => {
      ctx.beginPath();
      ctx.arc(x, y, radius, start, end);
      ctx.stroke();
    };

    const dot = (x, y, radius, color) => {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fillStyle = color;
      ctx.fill();
    };

    function resize() {
      const bounds = stage.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(motion.matches ? 1400 : performance.now());
    }

    function drawTicks(cx, cy, radius, count, unit, time) {
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * TAU - Math.PI / 2;
        const major = index % 11 === 0;
        const medium = index % 7 === 0;
        const length = major ? unit * 0.022 : medium ? unit * 0.014 : unit * 0.006;
        const pulse = 0.18 + 0.15 * Math.sin(time * 0.00035 + index * 0.41);
        ctx.strokeStyle = major ? "rgba(174,181,255,0.64)" : `rgba(174,181,255,${pulse})`;
        ctx.lineWidth = major ? 1.25 : 0.7;
        line(
          cx + Math.cos(angle) * (radius - length),
          cy + Math.sin(angle) * (radius - length),
          cx + Math.cos(angle) * radius,
          cy + Math.sin(angle) * radius
        );
      }
    }

    function drawOrbit(cx, cy, radius, count, phase, flatten, unit, direction) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, flatten);
      ctx.strokeStyle = "rgba(79,90,240,0.22)";
      ctx.lineWidth = 0.8;
      arc(0, 0, radius, 0, TAU);

      for (let index = 0; index < count; index += 1) {
        const angle = phase * direction + (index / count) * TAU;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const active = index === 0 || index === Math.floor(count / 2);
        if (active) {
          ctx.strokeStyle = "rgba(174,181,255,0.42)";
          ctx.lineWidth = 0.8;
          line(0, 0, x, y);
        }
        dot(x, y, active ? unit * 0.007 : unit * 0.003, active ? "#AEB5FF" : "rgba(79,90,240,0.72)");
      }
      ctx.restore();
    }

    function drawWave(cx, cy, radius, unit, time) {
      const left = Math.max(18, cx - radius * 1.27);
      const right = Math.min(width - 18, cx + radius * 1.27);
      const baseline = cy + radius * 0.42;
      const amplitude = unit * 0.052;
      const phase = time * 0.00022;

      ctx.beginPath();
      for (let x = left; x <= right; x += 2) {
        const progress = (x - left) / (right - left);
        const envelope = Math.pow(Math.sin(progress * Math.PI), 0.55);
        const signal =
          Math.sin(progress * TAU * 7 + phase) * 0.56 +
          Math.sin(progress * TAU * 11 - phase * 1.4) * 0.28 +
          Math.sin(progress * TAU * 13 + phase * 0.7) * 0.16;
        const y = baseline + signal * amplitude * envelope;
        if (x === left) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(174,181,255,0.94)";
      ctx.lineWidth = Math.max(1.2, unit * 0.0023);
      ctx.shadowColor = "rgba(79,90,240,0.8)";
      ctx.shadowBlur = unit * 0.018;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = "rgba(183,183,183,0.17)";
      ctx.lineWidth = 0.7;
      ctx.setLineDash([3, 7]);
      line(left, baseline, right, baseline);
      ctx.setLineDash([]);

      [0.13, 0.38, 0.63, 0.87].forEach((position, index) => {
        const x = left + (right - left) * position;
        const tick = index % 2 ? unit * 0.013 : unit * 0.022;
        ctx.strokeStyle = "rgba(174,181,255,0.32)";
        line(x, baseline - tick, x, baseline + tick);
      });
    }

    function draw(time) {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      const unit = Math.min(width, height);
      const cx = width * 0.535 + pointer.x * unit * 0.018;
      const cy = height * 0.475 + pointer.y * unit * 0.014;
      const radius = unit * 0.355;
      const slow = time * 0.000055;

      ctx.save();
      ctx.strokeStyle = "rgba(174,181,255,0.11)";
      ctx.lineWidth = 0.7;
      ctx.setLineDash([2, 8]);
      line(cx - radius * 1.28, cy, cx + radius * 1.28, cy);
      line(cx, cy - radius * 1.19, cx, cy + radius * 1.19);
      ctx.setLineDash([]);

      ctx.strokeStyle = "rgba(79,90,240,0.13)";
      ctx.lineWidth = 1;
      arc(cx, cy, radius * 1.12, 0, TAU);
      arc(cx, cy, radius * 0.93, 0, TAU);
      arc(cx, cy, radius * 0.48, 0, TAU);
      drawTicks(cx, cy, radius * 1.12, 89, unit, time);

      const arcs = [
        [radius * 1.04, slow * 7 + 0.2, 1.22, "rgba(79,90,240,0.9)", 1.6],
        [radius * 1.04, slow * 7 + 2.75, 0.54, "rgba(174,181,255,0.55)", 1],
        [radius * 0.82, -slow * 11 + 1.5, 1.65, "rgba(79,90,240,0.7)", 1.2],
        [radius * 0.61, slow * 13 + 3.4, 0.82, "rgba(174,181,255,0.74)", 1.2],
        [radius * 0.38, -slow * 7 + 0.5, 2.05, "rgba(79,90,240,0.76)", 1.5]
      ];
      arcs.forEach(([r, start, length, color, lineWidth]) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        arc(cx, cy, r, start, start + length);
      });
      ctx.lineCap = "butt";

      drawOrbit(cx, cy, radius * 0.93, 7, slow * 7, 0.72, unit, 1);
      drawOrbit(cx, cy, radius * 0.67, 11, slow * 11 + 0.8, 0.86, unit, -1);
      drawOrbit(cx, cy, radius * 0.38, 13, slow * 13 + 1.7, 1, unit, 1);

      ctx.strokeStyle = "rgba(174,181,255,0.25)";
      ctx.lineWidth = 0.8;
      const markerAngle = -slow * 11 + 0.35;
      const mx = cx + Math.cos(markerAngle) * radius * 1.04;
      const my = cy + Math.sin(markerAngle) * radius * 1.04;
      line(mx - 8, my, mx + 8, my);
      line(mx, my - 8, mx, my + 8);
      dot(mx, my, 2.2, "#AEB5FF");

      drawWave(cx, cy, radius, unit, time);

      const core = unit * 0.024;
      ctx.fillStyle = "#000312";
      ctx.strokeStyle = "rgba(174,181,255,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, core, 0, TAU);
      ctx.fill();
      ctx.stroke();
      dot(cx, cy, core * 0.22, "#4F5AF0");
      line(cx - core * 1.7, cy, cx - core * 0.75, cy);
      line(cx + core * 0.75, cy, cx + core * 1.7, cy);
      line(cx, cy - core * 1.7, cx, cy - core * 0.75);
      line(cx, cy + core * 0.75, cx, cy + core * 1.7);

      ctx.font = `${Math.max(8, unit * 0.014)}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = "rgba(183,183,183,0.52)";
      ctx.textBaseline = "middle";
      ctx.fillText("07", cx + radius * 1.16, cy - 4);
      ctx.fillText("11", cx - 6, cy - radius * 1.18);
      ctx.fillText("13", cx - radius * 1.2, cy + 3);

      if (finePointer.matches && !motion.matches) {
        const scanX = cx + pointer.x * radius * 0.52;
        const scanY = cy + pointer.y * radius * 0.52;
        ctx.strokeStyle = "rgba(174,181,255,0.2)";
        ctx.lineWidth = 0.7;
        line(scanX - 5, scanY, scanX + 5, scanY);
        line(scanX, scanY - 5, scanX, scanY + 5);
      }
      ctx.restore();
    }

    function animate(now) {
      frameId = 0;
      if (motion.matches || !inView || document.hidden) return;
      if (now - previousFrame >= 1000 / 30) {
        previousFrame = now;
        pointer.x += (pointer.tx - pointer.x) * 0.055;
        pointer.y += (pointer.ty - pointer.y) * 0.055;
        draw(now);
      }
      frameId = requestAnimationFrame(animate);
    }

    function start() {
      if (!motion.matches && inView && !document.hidden && !frameId) {
        frameId = requestAnimationFrame(animate);
      }
    }

    function stop() {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
    }

    hero.addEventListener("pointermove", (event) => {
      if (!finePointer.matches || motion.matches) return;
      pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (event.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    hero.addEventListener("pointerleave", () => {
      pointer.tx = 0;
      pointer.ty = 0;
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });

    motion.addEventListener("change", () => {
      stop();
      pointer.x = pointer.y = pointer.tx = pointer.ty = 0;
      draw(1400);
      start();
    });

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
        else stop();
      }, { rootMargin: "100px" });
      observer.observe(stage);
    }

    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(resize);
      observer.observe(stage);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }

    resize();
    stage.classList.add("visual-ready");
    start();
  }
}
