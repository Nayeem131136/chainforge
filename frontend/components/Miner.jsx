"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api, fmt, short } from "../lib/api";
import { useCountUp } from "./hooks";
import { ScrambleHash } from "./ui";

function CountNonce({ value }) {
  return <>{useCountUp(value, 1.0)}</>;
}

export default function Miner({ status, wallets, onChange, notify }) {
  const [miner, setMiner] = useState("");
  const [phase, setPhase] = useState("idle");      // idle | mining | done
  const [result, setResult] = useState(null);
  const [live, setLive] = useState(0);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const mine = async (address) => {
    if (phase === "mining") return;
    setPhase("mining"); setResult(null); setLive(0);
    timer.current = setInterval(() => setLive((n) => n + Math.floor(Math.random() * 2200 + 400)), 40);
    try {
      const target = address ?? miner;
      const data = await api("/mine", { method: "POST", body: { miner: target || undefined } });
      clearInterval(timer.current);
      await new Promise((r) => setTimeout(r, 450));     // let the "searching" animation breathe
      setResult(data); setPhase("done");
      notify(`Block #${data.block.height} mined! +${data.block.reward} FRG`, "ok");
      onChange();
    } catch (e) {
      clearInterval(timer.current); setPhase("idle"); notify(e.message, "err");
    }
  };

  // /mine?miner=<address> (used by the "Mine to this wallet" button on the Wallets page)
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("miner");
    if (m) setMiner(m);
  }, []);

  const target = status?.target || "0000";
  return (
    <div className="miner">
      <motion.div className="card" initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
        <h3 style={{ marginTop: 0 }}>Mining control</h3>
        <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
          Find a nonce so that <code>SHA-256(header)</code> starts with <b className="zeros">{target}</b>. Whoever finds it earns the {status?.reward ?? 50} FRG reward.
        </p>
        <label className="f">Reward goes to
          <select className="in" value={miner} onChange={(e) => setMiner(e.target.value)}>
            <option value="">Network default miner ({short(status?.defaultMiner || "", 5, 4)})</option>
            {wallets.map((w, i) => <option key={w.address} value={w.address}>Wallet {i + 1} — {short(w.address, 8, 6)}</option>)}
          </select>
        </label>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn primary" disabled={phase === "mining"} onClick={() => mine()}>
            {phase === "mining" ? "⛏ Mining…" : "⛏ Mine next block"}
          </button>
        </div>
        <div className="kv">
          <div><b>Next height</b><span>#{(status?.height || 0) + 1}</span></div>
          <div><b>Difficulty</b><span>{target.length} zeros</span></div>
          <div><b>Avg. tries</b><span>~{fmt(16 ** target.length)}</span></div>
        </div>
      </motion.div>

      <motion.div className="card" initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>Mining console</h3>
          <span className={`badge ${phase === "done" ? "ok" : ""}`}>{phase === "mining" ? "searching…" : phase === "done" ? "block found" : "idle"}</span>
        </div>
        <div className="muted mono" style={{ fontSize: 12, margin: "14px 0 6px" }}>NONCE</div>
        <div className="nonce">{phase === "done" ? <CountNonce value={result.attempts} /> : fmt(live)}</div>
        <div className="muted mono" style={{ fontSize: 12, margin: "14px 0 6px" }}>BLOCK HASH</div>
        <ScrambleHash hash={phase === "done" ? result.block.hash : null} spinning={phase === "mining"} target={target} />
        {phase === "mining" && <div className="bar"><i /></div>}
        <AnimatePresence>
          {phase === "done" && (
            <motion.div className="kv" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div><b>Block</b><span>#{result.block.height}</span></div>
              <div><b>Attempts</b><span>{fmt(result.attempts)}</span></div>
              <div><b>Time</b><span>{result.seconds}s</span></div>
              <div><b>Hash rate</b><span>{fmt(result.hashRate / 1000, 1)} kH/s</span></div>
              <div><b>Reward</b><span>+{result.block.reward} FRG</span></div>
              <div><b>Miner</b><span className="mono" style={{ fontSize: 13 }}>{short(result.block.miner, 5, 4)}</span></div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
