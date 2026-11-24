"use client";
import { useApp } from "../../components/AppProvider";
import { PageHeader } from "../../components/ui";
import Send from "../../components/Send";

export default function Page() {
  const { status, blocks, wallets, mempool, refresh, notify } = useApp();
  return (
    <>
      <PageHeader eyebrow="Transactions" title="Send a transaction" lead="Inputs are picked from your UTXOs, change returns to you, a 1 FRG fee is added and the transaction is signed with your private key." />
      <div className="wrap pagebody">
        <Send wallets={wallets} mempool={mempool} onChange={refresh} notify={notify} />
      </div>
    </>
  );
}
