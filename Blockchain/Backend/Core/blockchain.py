import json
import time

from Blockchain.Backend.Core.blockheader import BlockHeader
from Blockchain.Backend.Core.block import Block
from Blockchain.Backend.Core.Database.database import BlockchainDB
from Blockchain.Backend.Util.util import hash256
from Blockchain.Backend.Core.tx import CoinbaseTx, MINER_PUBLIC_ADDRESS

from Blockchain.config import VERSION, TARGET, ZERO_HASH


class Blockchain:
    def __init__(self, verbose=True):
        self.verbose = verbose
        self.blockchainDB = BlockchainDB()

        if not self.blockchainDB.DBExists():
            if self.verbose:
                print("Blockchain database not found. Creating genesis block...")
            self.create_genesis_block()

    # ---------- disk ----------
    def write_on_disk(self, block):
        return self.blockchainDB.write(block)

    def read_from_disk(self):
        return self.blockchainDB.read(quiet=True)

    def get_last_block(self):
        return self.blockchainDB.lastBlock()

    # ---------- mining ----------
    def create_genesis_block(self, miner_address=MINER_PUBLIC_ADDRESS):
        return self.add_block(1, ZERO_HASH, miner_address)

    def add_block(self, blockHeight, prevBlockHash, miner_address=MINER_PUBLIC_ADDRESS):
        version = VERSION
        timestamp = int(time.time())
        bits = "ffff0000"  # placeholder for the real difficulty target

        # Every block holds one coinbase transaction (the miner's reward)
        coinbase_tx = CoinbaseTx(blockHeight, miner_address).CoinbaseTransaction()
        Txs = [coinbase_tx]

        merkle_root = ''

        block_header = BlockHeader(version, prevBlockHash, merkle_root, timestamp, bits)

        started = time.time()
        block_header.mine(TARGET, verbose=self.verbose)
        self.last_mining_seconds = time.time() - started

        new_block = Block(blockHeight, 1, block_header.__dict__, Txs[0].to_dict()).__dict__

        self.write_on_disk([new_block])

        if self.verbose:
            print(f"\nBlock {blockHeight} added to the blockchain with hash: {block_header.blockHash}")
        return new_block

    def add_next_block(self, miner_address=MINER_PUBLIC_ADDRESS):
        last_block = self.get_last_block()
        new_block_height = last_block["Height"] + 1
        new_prev_hash = last_block["BlockHeader"]["blockHash"]
        return self.add_block(new_block_height, new_prev_hash, miner_address)

    # ---------- validation ----------
    @staticmethod
    def _recalc_hash(h):
        """Re-compute a block hash from its header. The accepted hash used (nonce - 1)."""
        return hash256((str(h["version"]) + h["prev_block_hash"] + h["merkle_root"] +
                        str(h["timestamp"]) + str(h["bits"]) + str(h["nonce"] - 1)).encode("utf-8"))

    def validate_detailed(self, chain=None):
        """Returns a list of {height, ok, reason} - one entry per block."""
        if chain is None:
            chain = self.read_from_disk()
        report = []
        if not chain:
            return report
        for i, block in enumerate(chain):
            h = block["BlockHeader"]
            reason = None
            if block["Height"] != i + 1:
                reason = "Height is not sequential"
            elif i == 0 and h["prev_block_hash"] != ZERO_HASH:
                reason = "Genesis block must point to the zero hash"
            elif i > 0 and h["prev_block_hash"] != chain[i - 1]["BlockHeader"]["blockHash"]:
                reason = "prev_block_hash does not match the previous block"
            elif self._recalc_hash(h) != h["blockHash"]:
                reason = "Stored hash does not match the recalculated hash"
            elif h["blockHash"][:len(TARGET)] != TARGET:
                reason = f"Hash does not satisfy the target {TARGET}"
            report.append({"height": block["Height"], "ok": reason is None,
                           "reason": reason or "Valid"})
        return report

    def validate_chain(self, chain=None):
        report = self.validate_detailed(chain)
        return bool(report) and all(r["ok"] for r in report)

    def print(self):
        print(json.dumps(self.read_from_disk(), indent=4))
