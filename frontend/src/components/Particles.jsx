import { useEffect, useRef } from "react";

export default function Particles() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let raf;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const dots = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -(Math.random() * 0.35 + 0.1),
      alpha: Math.random() * 0.45 + 0.1,
      hue: Math.random() > 0.5 ? "79,70,229" : "124,58,237",
    }));

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach((d) => {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${d.hue},${d.alpha})`;
        ctx.fill();
        d.x += d.vx;
        d.y += d.vy;
        if (d.y < -8) { d.y = canvas.height + 8; d.x = Math.random() * canvas.width; }
        if (d.x < -8 || d.x > canvas.width + 8) d.x = Math.random() * canvas.width;
      });
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 z-0" />;
}
