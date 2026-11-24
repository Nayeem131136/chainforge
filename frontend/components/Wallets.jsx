"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../lib/api";
import { useCountUp } from "./hooks";
import { Avatar, CopyBtn } from "./ui";

function Balance({ value }) {
  return <>{useCountUp(value, 1.0, 2)}</>;
}

export default function Wallets({ wallets, onChange, notify }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const create = async () => {
    setBusy(true);
    try {
      const w = await api("/wallets", { method: "POST" });
      notify(`New wallet created: ${w.address.slice(0, 10)}…`, "ok");
      onChange();
    } catch (e) { notify(e.message, "err"); }
    setBusy(false);
  };

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <button className="btn primary" disabled={busy} onClick={create}>{busy ? "Generating keys…" : "＋ Create wallet"}</button>
        <span className="muted" style={{ fontSize: 13 }}>Keys are secp256k1; the address is Base58Check(hash160(public key)). Private keys never leave the server.</span>
      </div>
      <div className="grid g2">
        <AnimatePresence initial={false}>
          {wallets.map((w, i) => (
            <motion.div key={w.address} layout className="card wallet" initial={{ opacity: 0, y: 30, rotateX: -20 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}
              whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 170, damping: 18 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="row"><Avatar address={w.address} /><b>Wallet {i + 1}</b></div>
                <CopyBtn text={w.address} label="Copy address" />
              </div>
              <div className="bal" style={{ marginTop: 14 }}><Balance value={w.available} /> <small className="muted" style={{ fontSize: 15 }}>FRG</small></div>
              <div className="addr">{w.address}</div>
              <div className="row" style={{ marginTop: 12 }}>
                <span className="badge">confirmed {w.confirmed}</span>
                {w.pendingIn > 0 && <span className="badge ok">+{w.pendingIn} pending</span>}
                {w.pendingChange > 0 && <span className="badge">change {w.pendingChange} pending</span>}
              </div>
              <button className="btn ghost small" style={{ marginTop: 14 }}
                onClick={() => router.push(`/mine?miner=${w.address}`)}>⛏ Mine a block to this wallet</button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
