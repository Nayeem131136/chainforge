"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ago, api, sha256Hex, short } from "../lib/api";
import { CopyBtn, HashText } from "./ui";

function Field({ k, children }) {
  return <div className="field"><b>{k}</b><span>{children}</span></div>;
}

function BlockModal({ height, onClose, target }) {
  const [data, setData] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [ts, setTs] = useState(0);
  const [recalc, setRecalc] = useState("");

  useEffect(() => { api(`/blocks/${height}`).then((d) => { setData(d); setTs(d.summary.timestamp); }).catch(() => {}); }, [height]);
  useEffect(() => {
    if (!data) return;
    const s = data.summary;
    sha256Hex(`${s.version}${s.prevHash}${s.merkleRoot}${ts}${s.bits}${s.nonce - 1}`).then(setRecalc);
  }, [data, ts]);

  if (!data) return null;
  const s = data.summary;
  const tampered = Number(ts) !== s.timestamp;
  const ok = recalc === s.hash && recalc.startsWith(target);
  return (
    <motion.div className="modalbg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontSize: 24 }}>Block #{s.height}</h3>
          <button className="btn ghost small" onClick={onClose}>✕ Close</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field k="Hash"><HashText hash={s.hash} target={target} /> <CopyBtn text={s.hash} /></Field>
          <Field k="Prev hash">{s.prevHash}</Field>
          <Field k="Nonce">{s.nonce.toLocaleString()}</Field>
          <Field k="Timestamp">{s.timestamp} · {new Date(s.timestamp * 1000).toLocaleString()}</Field>
          <Field k="Bits / ver">{s.bits} / v{s.version}</Field>
          <Field k="Coinbase TxId">{s.txId}</Field>
          <Field k="Miner">{s.miner}</Field>
          <Field k="Reward">{s.reward} FRG</Field>
        </div>

        <div className="card" style={{ marginTop: 16, background: "rgba(0,0,0,.3)" }}>
          <b>🧪 Tamper test</b>
          <p className="muted" style={{ fontSize: 13, margin: "4px 0 10px" }}>
            Change the timestamp (this only happens in your browser — nothing is saved) and watch the SHA-256 hash stop matching.
          </p>
          <div className="row">
            <input className="in" style={{ maxWidth: 220 }} type="number" value={ts} onChange={(e) => setTs(Number(e.target.value))} />
            <button className="btn ghost small" onClick={() => setTs(s.timestamp + 1)}>+1 second</button>
            <button className="btn ghost small" onClick={() => setTs(s.timestamp)}>Reset</button>
            <span className={`badge ${ok ? "ok" : "bad"}`}>{ok ? "✓ hash matches" : "✗ hash broken"}</span>
          </div>
          <div className="mono" style={{ fontSize: 12, marginTop: 10, wordBreak: "break-all", color: tampered && !ok ? "var(--rose)" : "var(--muted)" }}>
            recomputed: {recalc}
          </div>
        </div>

        <button className="btn ghost small" style={{ marginTop: 14 }} onClick={() => setShowRaw(!showRaw)}>{showRaw ? "Hide" : "Show"} raw JSON</button>
        {showRaw && <pre className="json" style={{ marginTop: 10 }}>{JSON.stringify(data.raw, null, 2)}</pre>}
      </motion.div>
    </motion.div>
  );
}

export default function Explorer({ blocks, status, onChange, notify }) {
  const [open, setOpen] = useState(null);
  const [checking, setChecking] = useState(false);
  const [marks, setMarks] = useState({});        // height -> true/false
  const [verdict, setVerdict] = useState(null);
  const scroller = useRef(null);
  const target = status?.target || "0000";

  useEffect(() => { if (scroller.current) scroller.current.scrollTo({ left: scroller.current.scrollWidth, behavior: "smooth" }); }, [blocks.length]);

  const validate = async () => {
    setChecking(true); setMarks({}); setVerdict(null);
    try {
      const data = await api("/validate");
      for (const b of data.blocks) {
        await new Promise((r) => setTimeout(r, 380));
        setMarks((m) => ({ ...m, [b.height]: b.ok }));
        if (!b.ok) notify(`Block #${b.height}: ${b.reason}`, "err");
      }
      setVerdict(data.valid);
    } catch (e) { notify(e.message, "err"); }
    setChecking(false);
  };

  const reset = async () => {
    if (!confirm("Delete the whole chain and start again from a new genesis block?")) return;
    try { await api("/reset", { method: "POST" }); setMarks({}); setVerdict(null); notify("Chain reset — new genesis block created", "ok"); onChange(); }
    catch (e) { notify(e.message, "err"); }
  };

  return (
    <>
      <div className="row" style={{ marginBottom: 6 }}>
        <button className="btn primary small" disabled={checking || !blocks.length} onClick={validate}>🛡 {checking ? "Validating…" : "Validate chain"}</button>
        <button className="btn danger small" onClick={reset}>Reset chain</button>
        {verdict !== null && <span className={`badge ${verdict ? "ok" : "bad"}`}>{verdict ? "✓ Every block is valid" : "✗ Chain is broken"}</span>}
        <span className="muted" style={{ fontSize: 13 }}>Click a block for details and the tamper test.</span>
      </div>
      <div className="chainscroll" ref={scroller}>
        <AnimatePresence initial={false}>
          {blocks.map((b, i) => (
            <div key={b.height} style={{ display: "flex" }}>
              {i > 0 && <div className="link" />}
              <motion.div layout className={`blk ${marks[b.height] === true ? "ok" : marks[b.height] === false ? "bad" : ""}`}
                initial={{ opacity: 0, scale: 0.6, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }} onClick={() => setOpen(b.height)}>
                <div className="h"><span className="n">#{b.height}</span><span className="badge">{ago(b.timestamp)}</span></div>
                <div className="hs"><HashText hash={b.hash} target={target} /></div>
                <div className="m"><span>nonce</span><b>{b.nonce.toLocaleString()}</b></div>
                <div className="m"><span>miner</span><b>{short(b.miner, 5, 4)}</b></div>
                <div className="m"><span>reward</span><b>{b.reward} FRG</b></div>
                <div className="m"><span>prev</span><b>{b.height === 1 ? "genesis" : short(b.prevHash, 6, 0)}</b></div>
              </motion.div>
            </div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>{open && <BlockModal height={open} target={target} onClose={() => setOpen(null)} />}</AnimatePresence>
    </>
  );
}
