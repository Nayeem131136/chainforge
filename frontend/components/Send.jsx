"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ago, api, short } from "../lib/api";

function Flow({ tx }) {
  const container = { hidden: {}, show: { transition: { staggerChildren: 0.25 } } };
  const item = { hidden: { opacity: 0, x: -20, scale: 0.9 }, show: { opacity: 1, x: 0, scale: 1 } };
  return (
    <motion.div className="flow" variants={container} initial="hidden" animate="show" key={tx.txId}>
      <motion.div variants={item}>
        <div className="fbox"><div className="t">Inputs (UTXOs spent)</div>
          {tx.inputs.map((i, k) => <div key={k} className="mono">{i.amount} FRG <span className="muted">← {short(i.prevTx, 6, 4)}:{i.index}</span></div>)}
          <div style={{ marginTop: 6 }}><b>Total {tx.inputTotal} FRG</b></div>
        </div>
      </motion.div>
      <motion.div className="arrow" variants={item}>➜</motion.div>
      <motion.div variants={item}>
        <div className="fbox" style={{ borderColor: "var(--violet)" }}><div className="t">Transaction</div>
          <div className="mono" style={{ wordBreak: "break-all" }}>{short(tx.txId, 10, 8)}</div>
          <div style={{ marginTop: 6 }}>{tx.size} bytes</div>
          <span className={`badge ${tx.signatureValid ? "ok" : "bad"}`} style={{ marginTop: 8 }}>{tx.signatureValid ? "✓ ECDSA signature valid" : "✗ bad signature"}</span>
        </div>
      </motion.div>
      <motion.div className="arrow" variants={item}>➜</motion.div>
      <motion.div variants={item}>
        <div className="fbox"><div className="t">Outputs</div>
          {tx.outputs.map((o, k) => (
            <div key={k}><b style={{ color: o.kind === "payment" ? "var(--green)" : "var(--amber)" }}>{o.amount} FRG</b>
              <span className="muted"> {o.kind === "payment" ? "→ receiver" : "↩ change"} {short(o.address, 5, 4)}</span></div>
          ))}
          <div><b style={{ color: "var(--rose)" }}>{tx.fee} FRG</b> <span className="muted">fee → miner</span></div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Send({ wallets, mempool, onChange, notify }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("5");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);

  useEffect(() => {
    if (!from && wallets[0]) setFrom(wallets[0].address);
    if (!to && wallets[1]) setTo(wallets[1].address);
  }, [wallets, from, to]);

  const sender = wallets.find((w) => w.address === from);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const tx = await api("/send", { method: "POST", body: { from, to, amount } });
      setLast(tx);
      notify(`Transaction signed & broadcast: ${tx.txId.slice(0, 12)}…`, "ok");
      onChange();
    } catch (err) { notify(err.message, "err"); }
    setBusy(false);
  };

  return (
    <>
      <div className="grid g2">
        <motion.form className="card" onSubmit={submit} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h3 style={{ marginTop: 0 }}>Send ForgeCoin</h3>
          <div className="grid" style={{ gap: 14 }}>
            <label className="f">From
              <select className="in" value={from} onChange={(e) => setFrom(e.target.value)}>
                {wallets.map((w, i) => <option key={w.address} value={w.address}>Wallet {i + 1} · {short(w.address, 8, 6)} · {w.available} FRG</option>)}
              </select>
            </label>
            <label className="f">To (pick a wallet or paste any address)
              <input className="in" list="wl" value={to} onChange={(e) => setTo(e.target.value)} placeholder="1Abc…" />
              <datalist id="wl">{wallets.map((w) => <option key={w.address} value={w.address} />)}</datalist>
            </label>
            <label className="f">Amount (FRG) — a flat fee of 1 FRG is added
              <input className="in" type="number" min="0" step="0.00000001" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            {sender && <div className="muted" style={{ fontSize: 13 }}>Available: <b style={{ color: "var(--text)" }}>{sender.available} FRG</b> · you will spend {Number(amount || 0) + 1} FRG</div>}
            <button className="btn primary" disabled={busy || !from || !to}>{busy ? "Signing…" : "✍ Sign & send"}</button>
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>
            Tip: wallets start empty — use <b>“Mine a block to this wallet”</b> first to earn coins.
          </p>
        </motion.form>

        <motion.div className="card" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h3 style={{ marginTop: 0 }}>Transaction anatomy</h3>
          {last ? <Flow tx={last} /> : <p className="muted">Send a transaction to see how inputs, outputs, change and the fee are built — with a live signature check.</p>}
        </motion.div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Pending transactions <span className="badge">{mempool.length}</span></h3>
        {mempool.length === 0 && <p className="muted" style={{ margin: 0 }}>Mempool is empty.</p>}
        <AnimatePresence initial={false}>
          {mempool.map((t) => (
            <motion.div key={t.txId} className="txrow" layout initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div>
                <div className="mono" style={{ fontSize: 13 }}>{short(t.txId, 12, 8)}</div>
                <div className="muted" style={{ fontSize: 13 }}>{short(t.from, 6, 4)} → {short(t.to, 6, 4)} · {ago(t.timestamp)}</div>
              </div>
              <div className="row">
                <b>{t.amount} FRG</b>
                <span className="badge">fee {t.fee}</span>
                <span className={`badge ${t.signatureValid ? "ok" : "bad"}`}>{t.signatureValid ? "signed ✓" : "invalid"}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
