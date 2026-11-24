"use client";
import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

/** Smoothly counts from the previous value to `value`. */
export function useCountUp(value, duration = 1.1, decimals = 0) {
  const [shown, setShown] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const controls = animate(prev.current, Number(value) || 0, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setShown(v),
    });
    prev.current = Number(value) || 0;
    return () => controls.stop();
  }, [value, duration]);
  return decimals ? shown.toFixed(decimals) : Math.round(shown).toLocaleString();
}
