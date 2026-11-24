"use client";
import { useApp } from "../../components/AppProvider";
import { PageHeader } from "../../components/ui";
import HowItWorks from "../../components/HowItWorks";

export default function Page() {
  const { status, blocks, wallets, mempool, refresh, notify } = useApp();
  return (
    <>
      <PageHeader eyebrow="Under the hood" title="How it works" lead="The ideas behind the platform: hashing, proof of work, elliptic-curve keys, addresses, UTXOs and digital signatures." />
      <div className="wrap pagebody">
        <HowItWorks />
      </div>
    </>
  );
}
