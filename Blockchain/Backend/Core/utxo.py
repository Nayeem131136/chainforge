"""
UTXO helpers - work out "who owns what" by scanning the blockchain stored on disk.

UTXO = Unspent Transaction Output. A wallet balance is simply the sum of all UTXOs that are
locked to that wallet's public-key-hash (hash160).
"""
from Blockchain.Backend.Core.script import Script
from Blockchain.Backend.Core.tx import Tx, TxOut
from Blockchain.Backend.Util.util import decode_base58, h160_to_address


def out_hash160(tx_out_dict):
    """hash160 (hex) that a stored TxOut dict is locked to."""
    return tx_out_dict["script_pubkey"]["cmds"][2]


def chain_outputs(chain):
    """Yield (txid, index, amount, hash160_hex, height) for every output on the chain."""
    for block in chain or []:
        tx = block["Txs"]
        for idx, out in enumerate(tx["tx_outs"]):
            yield tx["TxId"], idx, out["amount"], out_hash160(out), block["Height"]


def chain_spent(chain):
    """Outpoints already spent by transactions that are stored in blocks."""
    spent = set()
    for block in chain or []:
        for tx_in in block["Txs"]["tx_ins"]:
            if tx_in["prev_index"] != 0xFFFFFFFF:      # coinbase inputs spend nothing
                spent.add((tx_in["prev_tx"], tx_in["prev_index"]))
    return spent


def build_utxo_set(chain):
    """dict  txid(hex) -> Tx object (only tx_outs are filled) - the format SendCoin expects."""
    utxos = {}
    for block in chain or []:
        tx = block["Txs"]
        tx_outs = [
            TxOut(o["amount"], Script([0x76, 0xA9, bytes.fromhex(out_hash160(o)), 0x88, 0xAC]))
            for o in tx["tx_outs"]
        ]
        utxos[tx["TxId"]] = Tx(tx["version"], [], tx_outs, tx["locktime"])
    return utxos


def confirmed_balance(chain, address):
    """Total shards locked to `address` on the chain (minus anything spent inside blocks)."""
    h160 = decode_base58(address).hex()
    spent = chain_spent(chain)
    return sum(
        amount for txid, idx, amount, owner, _ in chain_outputs(chain)
        if owner == h160 and (txid, idx) not in spent
    )


def address_of(tx_out_dict):
    return h160_to_address(out_hash160(tx_out_dict))
