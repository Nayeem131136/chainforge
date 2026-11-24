"use client";
import { motion } from "framer-motion";

/** Fade/slide transition every time you open another page. */
export default function Template({ children }) {
  return (
    <motion.main initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
      {children}
    </motion.main>
  );
}
