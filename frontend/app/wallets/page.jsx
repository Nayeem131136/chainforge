"use client";
import { useApp } from "../../components/AppProvider";
import { PageHeader } from "../../components/ui";
import Wallets from "../../components/Wallets";

export default function Page() {
  const { status, blocks, wallets, mempool, refresh, notify } = useApp();
  return (
    <>
      <PageHeader eyebrow="ECC wallets" title="Wallets" lead="Generate secp256k1 key pairs and see balances computed from the unspent transaction outputs (UTXOs)." />
      <div className="wrap pagebody">
        <Wallets wallets={wallets} onChange={refresh} notify={notify} />
      </div>
    </>
  );
}
