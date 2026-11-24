"use client";
import { useApp } from "../../components/AppProvider";
import { PageHeader } from "../../components/ui";
import Miner from "../../components/Miner";

export default function Page() {
  const { status, blocks, wallets, mempool, refresh, notify } = useApp();
  return (
    <>
      <PageHeader eyebrow="Proof of Work" title="Mine a block" lead="Find a nonce so the block hash starts with the target zeros. Pick who receives the reward, then watch the search happen." />
      <div className="wrap pagebody">
        <Miner status={status} wallets={wallets} onChange={refresh} notify={notify} />
      </div>
    </>
  );
}
