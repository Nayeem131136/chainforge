"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCountUp } from "./hooks";

function Stat({ k, value, decimals = 0, suffix, color, text }) {
  const v = useCountUp(value, 1.2, decimals);
  return (
    <motion.div className="card stat" style={{ "--c": color }}
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 160, damping: 16 }}>
      <div className="k">{k}</div>
      <div className="v">{text ?? v}{suffix && <small>{suffix}</small>}</div>
    </motion.div>
  );
}

export default function Hero({ status }) {
  const s = status || {};
  return (
    <header className="hero wrap">
      <motion.span className="pill" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}>
        Proof of Work · ECC Wallets · UTXO
      </motion.span>
      <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7 }}>
        <span className="grad">ChainForge</span><br />Blockchain Platform
      </motion.h1>
      <motion.p className="lead" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        A from-scratch blockchain implementation — mine blocks with proof of work, explore the chain, create secp256k1 wallets
        and send signed transactions, all live in your browser.
      </motion.p>
      <motion.div className="row" style={{ justifyContent: "center" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
        <Link href="/mine" className="btn primary" style={{ textDecoration: "none" }}>⛏ Start mining</Link>
        <Link href="/how-it-works" className="btn ghost" style={{ textDecoration: "none" }}>How it works</Link>
      </motion.div>

      <div className="floatchain" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n, i) => (
          <div key={n} style={{ display: "flex", alignItems: "center" }}>
            <motion.div className="fb" animate={{ y: [0, -12, 0] }} transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.25 }}>#{n}</motion.div>
            {i < 4 && <div className="fl" />}
          </div>
        ))}
      </div>

      <div className="stats">
        <Stat k="Chain height" value={s.height} suffix="blocks" color="var(--teal)" />
        <Stat k="Block reward" value={s.reward} suffix="FRG" color="var(--amber)" />
        <Stat k="Total supply" value={s.supply} suffix="FRG" color="var(--violet)" />
        <Stat k="PoW target" text={s.target || "—"} suffix="prefix" color="var(--blue)" />
        <Stat k="Pending tx" value={s.pending} color="var(--rose)" />
        <motion.div className="card stat" style={{ "--c": s.valid ? "var(--green)" : "var(--rose)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="k">Chain integrity</div>
          <div className="v" style={{ fontSize: 24, paddingTop: 6 }}>
            <span className={`badge ${s.valid ? "ok" : "bad"}`}>{s.valid ? "✓ VALID" : "✗ BROKEN"}</span>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
