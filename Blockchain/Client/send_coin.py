from decimal import Decimal

from Blockchain.Backend.Util.util import decode_base58
from Blockchain.Backend.Core.script import Script
from Blockchain.Backend.Core.tx import TxIn, TxOut, Tx
from Blockchain.Backend.Core.Database.database import AccountDB
from Blockchain.Backend.Core.EllepticCurve.EllepticCurve import PrivateKey

from Blockchain.config import ONE_COIN, VERSION


class SendCoin:
    def __init__(self, fromAccount, toAccount, Amount, UTXOS, spent=None):
        self.FromPublicAddress = fromAccount
        self.toAccount = toAccount
        # Decimal -> exact integer shards (1 ForgeCoin = 100,000,000 shards)
        self.Amount = int(Decimal(str(Amount)) * ONE_COIN)
        self.utxos = UTXOS
        self.spent = spent or set()          # outpoints (txid, index) already used by pending txs
        self.fee = ONE_COIN                  # flat network fee: 1 ForgeCoin
        self.isBalanceEnough = False

    def scriptPubKey(self, PublicAddress):
        h160 = decode_base58(PublicAddress)
        script_pubkey = Script().p2pkh_script(h160)
        return script_pubkey

    def getPrivateKey(self):
        AllAccounts = AccountDB().read(quiet=True) or []
        for account in AllAccounts:
            if account["PublicAddress"] == self.FromPublicAddress:
                return account["privateKey"]

    def prepareTxIn(self):
        tx_ins = []
        self.Total = 0

        """Convert Public Address into Public Hash to find tx_outs that are locked to this hash"""
        self.From_address_script_pubkey = self.scriptPubKey(self.FromPublicAddress)
        self.fromPubKeyHash = self.From_address_script_pubkey.cmds[2]

        newutxos = dict(self.utxos)

        for Txbyte in newutxos:
            if self.Total >= self.Amount + self.fee:
                break
            TxObj = newutxos[Txbyte]

            for idx, txout in enumerate(TxObj.tx_outs):
                if (Txbyte, idx) in self.spent:
                    continue
                if txout.script_pubkey.cmds[2] == self.fromPubKeyHash:
                    self.Total += txout.amount
                    tx_ins.append(TxIn(bytes.fromhex(Txbyte), idx))
                    if self.Total >= self.Amount + self.fee:
                        break

        # must cover the amount AND the fee
        self.isBalanceEnough = self.Total >= self.Amount + self.fee
        return tx_ins

    def prepareTxOut(self):
        tx_outs = []
        to_scriptPubkey = self.scriptPubKey(self.toAccount)
        tx_outs.append(TxOut(self.Amount, to_scriptPubkey))

        """ Calculate Transaction Fee + change """
        self.changeAmount = self.Total - self.Amount - self.fee

        if self.changeAmount > 0:            # no change output when it is exactly zero
            tx_outs.append(TxOut(self.changeAmount, self.From_address_script_pubkey))

        return tx_outs

    def signTx(self):
        secret = self.getPrivateKey()
        if secret is None:
            raise ValueError("No private key found for this address in Data/forgecoin-account")
        private = PrivateKey(secret=secret)

        for idx, input in enumerate(self.TxIns):
            self.TxObj.sign_input(idx, private, self.From_address_script_pubkey)

    def prepareTransaction(self):
        self.TxIns = self.prepareTxIn()

        if self.isBalanceEnough:
            print(f"Total Balance: {self.Total / ONE_COIN} ForgeCoin")
            self.TxOuts = self.prepareTxOut()
            self.TxObj = Tx(VERSION, self.TxIns, self.TxOuts, 0)
            self.signTx()
            self.TxObj.TxId = self.TxObj.id()

            return self.TxObj
        else:
            print(f"Insufficient Balance: {self.Total / ONE_COIN} ForgeCoin (need amount + {self.fee / ONE_COIN} fee)")
            return False


if __name__ == "__main__":
    accounts = AccountDB().read(quiet=True) or []
    if len(accounts) < 2:
        raise SystemExit("Create two wallets first:  python -m Blockchain.Client.account")

    fromAccount = accounts[0]["PublicAddress"]
    toAccount = accounts[1]["PublicAddress"]
    Amount = 4

    # Demo UTXO: pretend the sender received 5 ForgeCoin in an earlier transaction.
    fake_txid = "e2b8c5f7a1d2e3f4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7e8"
    UTXOS = {
        fake_txid: Tx(
            version=1,
            tx_ins=[TxIn(bytes.fromhex(fake_txid), 0)],
            tx_outs=[TxOut(5 * ONE_COIN, Script().p2pkh_script(decode_base58(fromAccount)))],
            locktime=0
        )
    }

    send_coin = SendCoin(fromAccount, toAccount, Amount, UTXOS)
    tx = send_coin.prepareTransaction()

    if tx:
        print("Transaction prepared successfully!")
        print(f"From: {fromAccount}\nTo:   {toAccount}\nAmount: {Amount} ForgeCoin  (fee 1 ForgeCoin)")
        print(f"Transaction ID: {tx.TxId}")
    else:
        print("Insufficient balance to prepare the transaction.")
