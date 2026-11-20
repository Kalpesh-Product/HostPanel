import { useEffect, useRef } from "react";

type Wisp = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  turn: number;
  size: number;
  age: number;
  lifetime: number;
};

const MAX_WISPS = 80;

function createSmokeTexture() {
  const texture = document.createElement("canvas");
  texture.width = texture.height = 96;
  const paint = texture.getContext("2d");
  if (!paint) return texture;

  // Overlapping, soft-edged lobes make each wisp uneven as it drifts and turns.
  for (const [x, y, radius] of [[29, 57, 23], [45, 43, 29], [62, 47, 25], [66, 29, 17]]) {
    const gradient = paint.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(239, 232, 221, .42)");
    gradient.addColorStop(0.45, "rgba(239, 232, 221, .18)");
    gradient.addColorStop(1, "rgba(239, 232, 221, 0)");
    paint.fillStyle = gradient;
    paint.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  return texture;
}

export function RestobarCursor() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const paint = canvas?.getContext("2d");
    if (!canvas || !paint) return;

    const preference = window.matchMedia("(any-pointer: fine) and (prefers-reduced-motion: no-preference)");
    const texture = createSmokeTexture();
    const wisps: Wisp[] = [];
    let lastPoint: { x: number; y: number } | null = null;
    let frame = 0;
    let lastTime = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.ceil(width * scale);
      canvas.height = Math.ceil(height * scale);
      paint.setTransform(scale, 0, 0, scale, 0, 0);
    };

    const animate = (time: number) => {
      const elapsed = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
      lastTime = time;
      paint.clearRect(0, 0, width, height);

      for (let index = wisps.length - 1; index >= 0; index--) {
        const wisp = wisps[index];
        wisp.age += elapsed;
        const progress = wisp.age / wisp.lifetime;
        if (progress >= 1) {
          wisps.splice(index, 1);
          continue;
        }

        wisp.x += (wisp.vx + Math.sin(wisp.angle) * 15) * elapsed;
        wisp.y += wisp.vy * elapsed;
        wisp.angle += wisp.turn * elapsed;
        const spread = wisp.size * (0.65 + progress * 1.65);
        paint.save();
        paint.translate(wisp.x, wisp.y);
        paint.rotate(wisp.angle);
        paint.globalAlpha = Math.min(1, progress * 12) * (1 - progress) ** 1.7 * 0.28;
        paint.drawImage(texture, -spread / 2, -spread * 0.37, spread, spread * 0.74);
        paint.restore();
      }

      frame = wisps.length ? window.requestAnimationFrame(animate) : 0;
      if (!frame) lastTime = 0;
    };

    const move = (event: PointerEvent) => {
      if (!preference.matches || event.pointerType !== "mouse") return;
      const x = event.clientX;
      const y = event.clientY;
      const from = lastPoint || { x, y };
      const dx = x - from.x;
      const dy = y - from.y;
      const distance = Math.hypot(dx, dy);
      if (lastPoint && distance < 5) return;
      lastPoint = { x, y };

      const count = Math.min(5, Math.max(1, Math.ceil(distance / 18)));
      for (let index = 1; index <= count; index++) {
        const ratio = index / count;
        wisps.push({
          x: from.x + dx * ratio,
          y: from.y + dy * ratio,
          vx: Math.max(-30, Math.min(30, dx * 1.2)) + (Math.random() - 0.5) * 14,
          vy: Math.max(-28, Math.min(12, dy * 0.7)) - 12,
          angle: Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.7,
          turn: (Math.random() - 0.5) * 2.3,
          size: 36 + Math.random() * 31,
          age: 0,
          lifetime: 0.75 + Math.random() * 0.65,
        });
      }
      if (wisps.length > MAX_WISPS) wisps.splice(0, wisps.length - MAX_WISPS);
      if (!frame) frame = window.requestAnimationFrame(animate);
    };

    const resetPoint = () => { lastPoint = null; };
    const clear = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      resetPoint();
      wisps.length = 0;
      paint.clearRect(0, 0, width, height);
    };
    const syncPreference = () => {
      clear();
      canvas.hidden = !preference.matches;
      if (preference.matches) resize();
    };
    const handleResize = () => {
      if (preference.matches) resize();
    };

    syncPreference();
    preference.addEventListener("change", syncPreference);
    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("blur", clear);
    document.documentElement.addEventListener("pointerleave", resetPoint);
    return () => {
      clear();
      preference.removeEventListener("change", syncPreference);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("blur", clear);
      document.documentElement.removeEventListener("pointerleave", resetPoint);
    };
  }, []);

  return <canvas ref={ref} className="resto-cursor-smoke" aria-hidden="true" hidden />;
}
