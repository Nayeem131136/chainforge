"use client";
import { motion } from "framer-motion";

const CARDS = [
  { ic: "🔗", t: "Blocks & hashes", p: "Each block header (version, prev hash, merkle root, timestamp, bits, nonce) is hashed with SHA-256. Change one byte and the hash changes completely — and every later block breaks.", c: "hash256(version+prev+merkle+time+bits+nonce)" },
  { ic: "⛏", t: "Proof of Work", p: "Miners increment the nonce until the hash starts with the target zeros. Finding it is hard, checking it is instant.", c: 'while hash[:4] != "0000": nonce += 1' },
  { ic: "🔑", t: "ECC keys (secp256k1)", p: "A private key is a random 256-bit number. The public key is that number multiplied with the generator point G on the secp256k1 curve.", c: "public = private × G" },
  { ic: "🏷", t: "Addresses", p: "hash160 (SHA-256 → RIPEMD-160) of the compressed public key, a version byte and a 4-byte checksum, then Base58 encoded.", c: "Base58(0x00 + hash160 + checksum)" },
  { ic: "💸", t: "UTXO model", p: "There are no account balances. Your balance is the sum of unspent outputs locked to your address. Sending spends whole outputs and returns the rest as change.", c: "inputs = outputs + change + fee" },
  { ic: "✍", t: "ECDSA signatures", p: "To spend an output you sign the transaction hash with your private key (P2PKH). Anyone can verify the signature with your public key.", c: "verify(z, sig, pubkey) → true" },
];

export default function HowItWorks() {
  return (
    <>
      <div className="pipe">
        {["Private key", "Public key", "SHA-256", "RIPEMD-160", "+ checksum", "Base58 address"].map((s, i, a) => (
          <motion.div key={s} style={{ display: "flex", alignItems: "center", gap: 10 }}
            initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}>
            <span className="st">{s}</span>{i < a.length - 1 && <span className="arrow">➜</span>}
          </motion.div>
        ))}
      </div>
      <div className="grid g3 how">
        {CARDS.map((c, i) => (
          <motion.div key={c.t} className="card" initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: (i % 3) * 0.1, duration: 0.55 }} whileHover={{ y: -6, borderColor: "rgba(94,234,212,.6)" }}>
            <div className="ic">{c.ic}</div>
            <h3>{c.t}</h3>
            <p>{c.p}</p>
            <code>{c.c}</code>
          </motion.div>
        ))}
      </div>
    </>
  );
}
