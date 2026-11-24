"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const HEX = "0123456789abcdef";
const rnd = (n) => Array.from({ length: n }, () => HEX[(Math.random() * 16) | 0]).join("");

/** Hash text with the leading proof-of-work zeros highlighted. */
export function HashText({ hash, target = "0000" }) {
  if (!hash) return null;
  const z = hash.startsWith(target) ? target.length : 0;
  return (
    <>
      <span className="zeros">{hash.slice(0, z)}</span>
      {hash.slice(z)}
    </>
  );
}

/**
 * Hash display with two modes:
 *  - spinning=true  -> random hex flickers (the miner "searching")
 *  - hash given     -> characters lock in from left to right (reveal animation)
 */
export function ScrambleHash({ hash, spinning, target = "0000" }) {
  const [text, setText] = useState("0".repeat(64));   // random text is created in effects only (avoids SSR hydration mismatch)
  const [locked, setLocked] = useState(0);

  useEffect(() => {
    if (!spinning) return;
    const id = setInterval(() => setText(rnd(64)), 45);
    return () => clearInterval(id);
  }, [spinning]);

  useEffect(() => {
    if (!hash || spinning) return;
    let n = 0;
    setLocked(0);
    const id = setInterval(() => {
      n += 2;
      setLocked(n);
      setText(hash.slice(0, n) + rnd(Math.max(0, 64 - n)));
      if (n >= 64) { clearInterval(id); setText(hash); }
    }, 22);
    return () => clearInterval(id);
  }, [hash, spinning]);

  const done = !spinning && hash && locked >= 64;
  return (
    <div className="hashview">
      {done ? <HashText hash={hash} target={target} /> : <span style={{ opacity: spinning ? 0.75 : 1 }}>{text}</span>}
    </div>
  );
}

export function Toasts({ items }) {
  return (
    <div className="toasts">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div key={t.id} className={`toast ${t.kind}`}
            initial={{ opacity: 0, x: 60, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60 }}>
            {t.kind === "ok" ? "✅ " : "⚠️ "}{t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function CopyBtn({ text, label = "Copy" }) {
  const [done, setDone] = useState(false);
  return (
    <button className="btn ghost small" onClick={async () => {
      try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1400); } catch (e) {}
    }}>{done ? "✓ Copied" : label}</button>
  );
}

/** Unique gradient avatar generated from an address. */
export function Avatar({ address }) {
  let h = 0;
  for (const ch of address || "") h = (h * 31 + ch.charCodeAt(0)) % 360;
  return <div className="avatar" style={{ background: `conic-gradient(from ${h}deg,hsl(${h} 85% 60%),hsl(${(h + 70) % 360} 85% 58%),hsl(${(h + 150) % 360} 85% 62%),hsl(${h} 85% 60%))` }} />;
}

export function PageHeader({ eyebrow, title, lead }) {
  return (
    <div className="pagehead wrap">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="title">{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </motion.div>
    </div>
  );
}
