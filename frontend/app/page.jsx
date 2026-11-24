"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useApp } from "../components/AppProvider";
import Hero from "../components/Hero";
import { HashText } from "../components/ui";
import { ago, short } from "../lib/api";

const FEATURES = [
  { href: "/mine", ic: "⛏", t: "Mine", p: "Run proof of work, watch the nonce search and earn the block reward.", c: "var(--teal)" },
  { href: "/explorer", ic: "🔗", t: "Explorer", p: "Browse blocks, validate the whole chain and run a tamper test.", c: "var(--violet)" },
  { href: "/wallets", ic: "👛", t: "Wallets", p: "Generate secp256k1 key pairs and track UTXO balances.", c: "var(--amber)" },
  { href: "/send", ic: "💸", t: "Send", p: "Build, sign and verify ECDSA transactions with change and fee.", c: "var(--blue)" },
  { href: "/how-it-works", ic: "📘", t: "How it works", p: "Hashing, proof of work, ECC keys, addresses and the UTXO model.", c: "var(--green)" },
];

export default function Home() {
  const { status, blocks } = useApp();
  const latest = [...blocks].reverse().slice(0, 4);
  return (
    <>
      <Hero status={status} />

      <section className="wrap" style={{ paddingTop: 50 }}>
        <div className="eyebrow">Explore the platform</div>
        <h2 className="title">Everything in its own page</h2>
        <div className="grid g5" style={{ marginTop: 20 }}>
          {FEATURES.map((f, i) => (
            <motion.div key={f.href} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
              <Link href={f.href} className="card feature" style={{ "--c": f.c }}>
                <div className="ic" style={{ background: "var(--panel2)" }}>{f.ic}</div>
                <h3>{f.t}</h3>
                <p>{f.p}</p>
                <span className="go">Open →</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 60 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="eyebrow">Live from the chain</div>
            <h2 className="title" style={{ marginBottom: 0 }}>Latest blocks</h2>
          </div>
          <Link href="/explorer" className="btn ghost small" style={{ textDecoration: "none" }}>View all →</Link>
        </div>
        <div className="card" style={{ marginTop: 18, padding: "6px 20px" }}>
          {latest.length === 0 && <p className="muted">No blocks yet.</p>}
          {latest.map((b) => (
            <motion.div key={b.height} className="txrow" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div>
                <b className="mono">#{b.height}</b> <span className="muted" style={{ fontSize: 13 }}>· {ago(b.timestamp)} · miner {short(b.miner, 5, 4)}</span>
                <div className="mono" style={{ fontSize: 12.5, wordBreak: "break-all" }}><HashText hash={b.hash} target={status?.target} /></div>
              </div>
              <span className="badge">+{b.reward} FRG</span>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
}
