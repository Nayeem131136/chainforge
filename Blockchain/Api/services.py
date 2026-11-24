"""
Service layer used by the HTTP API (and the tests).
It only *wraps* the original blockchain code - nothing here changes the blockchain rules.
"""
import contextlib
import io
import threading
import time
from decimal import Decimal, InvalidOperation

from Blockchain.Backend.Core.blockchain import Blockchain
from Blockchain.Backend.Core.Database.database import AccountDB, BlockchainDB
from Blockchain.Backend.Core.EllepticCurve.EllepticCurve import Sha256Point, Signature
from Blockchain.Backend.Core.tx import MINER_PUBLIC_ADDRESS
from Blockchain.Backend.Core.utxo import (address_of, build_utxo_set, chain_spent,
                                          confirmed_balance)
from Blockchain.Backend.Util.util import decode_base58
from Blockchain.Client.account import account as Account
from Blockchain.Client.send_coin import SendCoin
from Blockchain.config import COIN_NAME, CURRENT_REWARD, ONE_COIN, TARGET, VERSION

LOCK = threading.RLock()
MEMPOOL = []          # pending (signed, not yet in a block) transactions - kept in memory


class ApiError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def coins(shards):
    return shards / ONE_COIN


def _chain():
    bc = Blockchain(verbose=False)
    return bc, (bc.read_from_disk() or [])


def _check_address(address):
    try:
        decode_base58(address)
    except Exception:
        raise ApiError(f"'{address}' is not a valid ForgeCoin address (bad Base58 / checksum)")
    return address


def block_summary(block):
    h = block["BlockHeader"]
    tx = block["Txs"]
    return {
        "height": block["Height"],
        "hash": h["blockHash"],
        "prevHash": h["prev_block_hash"],
        "nonce": h["nonce"],
        "timestamp": h["timestamp"],
        "bits": h["bits"],
        "version": h["version"],
        "merkleRoot": h["merkle_root"],
        "txId": tx["TxId"],
        "reward": coins(sum(o["amount"] for o in tx["tx_outs"])),
        "miner": address_of(tx["tx_outs"][0]),
    }


def status():
    with LOCK:
        bc, chain = _chain()
        report = bc.validate_detailed(chain)
        last = chain[-1] if chain else None
        return {
            "coin": COIN_NAME,
            "version": VERSION,
            "height": len(chain),
            "lastHash": last["BlockHeader"]["blockHash"] if last else None,
            "target": TARGET,
            "reward": CURRENT_REWARD,
            "fee": 1,
            "oneCoin": ONE_COIN,
            "valid": bool(report) and all(r["ok"] for r in report),
            "supply": sum(sum(o["amount"] for o in b["Txs"]["tx_outs"]) for b in chain) / ONE_COIN,
            "pending": len(MEMPOOL),
            "wallets": len(AccountDB().read(quiet=True) or []),
            "defaultMiner": MINER_PUBLIC_ADDRESS,
        }


def blocks():
    with LOCK:
        _, chain = _chain()
        return [block_summary(b) for b in chain]


def block_detail(height):
    with LOCK:
        _, chain = _chain()
        for b in chain:
            if b["Height"] == height:
                return {"summary": block_summary(b), "raw": b}
    raise ApiError(f"Block {height} not found", 404)


def mine(miner=None):
    with LOCK:
        miner = miner or MINER_PUBLIC_ADDRESS
        _check_address(miner)
        bc = Blockchain(verbose=False)
        started = time.time()
        block = bc.add_next_block(miner)
        seconds = max(time.time() - started, 1e-6)
        attempts = block["BlockHeader"]["nonce"]
        return {
            "block": block_summary(block),
            "attempts": attempts,
            "seconds": round(seconds, 4),
            "hashRate": int(attempts / seconds),
        }


def validate():
    with LOCK:
        bc, chain = _chain()
        report = bc.validate_detailed(chain)
        return {"valid": bool(report) and all(r["ok"] for r in report), "blocks": report}


def reset():
    with LOCK:
        BlockchainDB().reset()
        MEMPOOL.clear()
        Blockchain(verbose=False)          # creates a fresh genesis block
        return {"ok": True}


# ------------------------------------------------------------------ wallets
def _pending_for(address):
    spent = sum(t["inputTotal"] for t in MEMPOOL if t["from"] == address)
    incoming = sum(o["amount"] for t in MEMPOOL for o in t["outputs"]
                   if o["address"] == address and o["kind"] != "change")
    change = sum(o["amount"] for t in MEMPOOL for o in t["outputs"]
                 if o["address"] == address and o["kind"] == "change")
    return spent, incoming, change


def wallets():
    with LOCK:
        _, chain = _chain()
        result = []
        for a in AccountDB().read(quiet=True) or []:
            addr = a["PublicAddress"]
            confirmed = coins(confirmed_balance(chain, addr))
            spent, incoming, change = _pending_for(addr)      # already in ForgeCoin
            result.append({
                "address": addr,
                "confirmed": confirmed,
                "available": round(confirmed - spent, 8),
                "pendingIn": incoming,
                "pendingChange": change,
            })
        return result


def new_wallet():
    with LOCK:
        acct = Account()
        with contextlib.redirect_stdout(io.StringIO()):
            acct.createKeys()
        AccountDB().write([acct.__dict__])
        return {"address": acct.PublicAddress}


# ------------------------------------------------------------------ transactions
def _verify_signatures(tx, sender):
    """Verify every ECDSA signature of the tx and that the public key belongs to the sender."""
    for i, tx_in in enumerate(tx.tx_ins):
        sig_der, sec = tx_in.script_sig.cmds[0][:-1], tx_in.script_sig.cmds[1]
        point = Sha256Point.parse(sec)
        z = tx.sign_hash(i, sender.From_address_script_pubkey)
        if point.hash160() != sender.fromPubKeyHash:
            return False
        if not point.verify(z, Signature.parse(sig_der)):
            return False
    return True


def send(sender, to, amount):
    with LOCK:
        _check_address(sender)
        _check_address(to)
        if sender == to:
            raise ApiError("Sender and receiver must be different wallets")
        try:
            amount_dec = Decimal(str(amount))
        except InvalidOperation:
            raise ApiError("Amount must be a number")
        if amount_dec <= 0 or amount_dec.as_tuple().exponent < -8:
            raise ApiError("Amount must be > 0 with at most 8 decimal places")
        if not any(a["PublicAddress"] == sender for a in AccountDB().read(quiet=True) or []):
            raise ApiError("This wallet's private key is not stored here, so it cannot sign")

        _, chain = _chain()
        utxos = build_utxo_set(chain)
        spent = chain_spent(chain) | {(t_in["prevTx"], t_in["index"]) for t in MEMPOOL for t_in in t["inputs"]}

        builder = SendCoin(sender, to, amount_dec, utxos, spent)
        with contextlib.redirect_stdout(io.StringIO()):
            tx = builder.prepareTransaction()
        if not tx:
            raise ApiError(
                f"Insufficient balance: you need {amount_dec} + {builder.fee // ONE_COIN} (fee) = "
                f"{amount_dec + builder.fee // ONE_COIN} ForgeCoin, available {coins(builder.Total)}")

        signature_ok = _verify_signatures(tx, builder)

        inputs = []
        for tx_in in tx.tx_ins:
            txid = tx_in.prev_tx.hex()
            inputs.append({"prevTx": txid, "index": tx_in.prev_index,
                           "amount": coins(utxos[txid].tx_outs[tx_in.prev_index].amount)})

        outputs = [{"address": to, "amount": coins(builder.Amount), "kind": "payment"}]
        if builder.changeAmount > 0:
            outputs.append({"address": sender, "amount": coins(builder.changeAmount), "kind": "change"})

        record = {
            "txId": tx.TxId,
            "from": sender,
            "to": to,
            "amount": coins(builder.Amount),
            "fee": coins(builder.fee),
            "change": coins(max(builder.changeAmount, 0)),
            "inputTotal": coins(builder.Total),
            "inputs": inputs,
            "outputs": outputs,
            "signatureValid": signature_ok,
            "timestamp": int(time.time()),
            "size": len(tx.serialize()),
        }
        MEMPOOL.append(record)
        return record


def mempool():
    with LOCK:
        return list(reversed(MEMPOOL))
