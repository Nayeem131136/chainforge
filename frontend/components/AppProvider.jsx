"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

/** Loads status / blocks / wallets / mempool once and shares them with every page. */
export default function AppProvider({ children }) {
  const [data, setData] = useState({ status: null, blocks: [], wallets: [], mempool: [] });
  const [failures, setFailures] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);
  const timer = useRef(null);

  const notify = useCallback((text, kind = "ok") => {
    const id = ++counter.current;
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const refresh = useCallback(async () => {
    let ok = false;
    try {
      const [status, blocks, wallets, mempool] = await Promise.all([api("/status"), api("/blocks"), api("/wallets"), api("/mempool")]);
      setData({ status, blocks, wallets, mempool });
      setFailures(0); setLoaded(true); ok = true;
    } catch (e) {
      setFailures((f) => f + 1);
    }
    return ok;
  }, []);

  useEffect(() => {
    let stop = false;
    let okNow = false;
    const loop = async () => {
      okNow = await refresh();
      if (!stop) timer.current = setTimeout(loop, okNow ? 6000 : 2500);   // retry quickly while offline
    };
    loop();
    return () => { stop = true; clearTimeout(timer.current); };
  }, [refresh]);

  // online: true / false / null (still connecting for the first ~5 seconds)
  const online = failures === 0 ? (loaded ? true : null) : failures >= 2 ? false : null;

  return <Ctx.Provider value={{ ...data, online, loaded, refresh, notify, toasts }}>{children}</Ctx.Provider>;
}
