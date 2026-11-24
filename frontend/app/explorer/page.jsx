"use client";
import { useApp } from "../../components/AppProvider";
import { PageHeader } from "../../components/ui";
import Explorer from "../../components/Explorer";

export default function Page() {
  const { status, blocks, wallets, mempool, refresh, notify } = useApp();
  return (
    <>
      <PageHeader eyebrow="Explorer" title="Blockchain explorer" lead="Blocks are linked by hashes. Validate the chain, open any block and try to tamper with it." />
      <div className="wrap pagebody">
        <Explorer blocks={blocks} status={status} onChange={refresh} notify={notify} />
      </div>
    </>
  );
}
