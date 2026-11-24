"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useApp } from "./AppProvider";
import Backdrop from "./Backdrop";
import { Toasts } from "./ui";

const LINKS = [
  { href: "/mine", label: "Mine" },
  { href: "/explorer", label: "Explorer" },
  { href: "/wallets", label: "Wallets" },
  { href: "/send", label: "Send" },
  { href: "/how-it-works", label: "How it works" },
];

export default function Shell({ children }) {
  const path = usePathname();
  const { online, refresh, toasts } = useApp();
  return (
    <>
      <Backdrop />
      <nav className="nav">
        <div className="wrap">
          <Link href="/" className="logo"><i>◆</i> ChainForge</Link>
          <div className="links">
            {LINKS.map((l) => {
              const active = path === l.href || path.startsWith(l.href + "/");
              return (
                <Link key={l.href} href={l.href} className={active ? "active" : ""}>
                  {active && <motion.span layoutId="navpill" className="pillbg" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                  <span style={{ position: "relative" }}>{l.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="live">
            <span className={`dot ${online === false ? "off" : online === null ? "wait" : ""}`} />
            {online === false ? "API offline" : online === null ? "Connecting…" : "API online"}
          </div>
        </div>
      </nav>

      {online === false && (
        <div className="wrap">
          <div className="banner">
            <b>Cannot reach the ChainForge API.</b> Start it from the project root with <code>python -m Blockchain.Api.server</code> — or run{" "}
            <code>run.bat</code> / <code>./run.sh</code>. If you used the launcher, check the <b>“ChainForge API”</b> window for an error message.
            <button className="btn ghost small" style={{ marginLeft: 10 }} onClick={refresh}>Retry now</button>
          </div>
        </div>
      )}

      {children}

      <footer>
        <div className="wrap">
          <div className="footlinks">
            <Link href="/mine">Mine</Link><Link href="/explorer">Explorer</Link><Link href="/wallets">Wallets</Link>
            <Link href="/send">Send</Link><Link href="/how-it-works">How it works</Link>
          </div>
          <div>ChainForge · an educational blockchain built from scratch · <span className="grad">Python + Next.js</span></div>
        </div>
      </footer>
      <Toasts items={toasts} />
    </>
  );
}
