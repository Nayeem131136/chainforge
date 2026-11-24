"use client";
import { useEffect, useRef } from "react";

/** Floating "network nodes" canvas - a tiny P2P-style mesh in the background. */
export default function Backdrop() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    let raf, w, h, nodes = [];
    const resize = () => {
      w = c.width = window.innerWidth;
      h = c.height = window.innerHeight;
      const n = Math.min(70, Math.floor((w * h) / 22000));
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      }));
    };
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const a of nodes) {
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d = Math.hypot(dx, dy);
          if (d < 140) {
            ctx.strokeStyle = `rgba(94,234,212,${(1 - d / 140) * 0.35})`;
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
          }
        }
        ctx.fillStyle = "rgba(167,139,250,.8)";
        ctx.beginPath(); ctx.arc(nodes[i].x, nodes[i].y, 1.8, 0, 7); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    resize();
    tick();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="bg" aria-hidden="true" />;
}
