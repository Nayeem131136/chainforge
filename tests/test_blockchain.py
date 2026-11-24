"""Smoke tests - run from the project root:   python -m unittest discover -s tests -v"""
import os
import tempfile
import unittest

# use a throw-away Data folder so the tests never touch your real chain / wallets
os.environ["FORGE_DATA_DIR"] = tempfile.mkdtemp(prefix="forgecoin-test-")

from Blockchain.Api import services as svc                      # noqa: E402
from Blockchain.Backend.Core.blockchain import Blockchain       # noqa: E402
from Blockchain.Backend.Core.Database.database import BlockchainDB  # noqa: E402


class ChainForgeTests(unittest.TestCase):
    def test_1_genesis_and_mining(self):
        svc.reset()
        w = svc.new_wallet()["address"]
        result = svc.mine(w)
        self.assertEqual(result["block"]["height"], 2)
        self.assertTrue(result["block"]["hash"].startswith("0000"))
        self.assertEqual(svc.status()["height"], 2)

    def test_2_chain_validation_detects_tampering(self):
        svc.reset()
        svc.mine()
        self.assertTrue(svc.validate()["valid"])
        db = BlockchainDB()
        chain = db.read()
        chain[0]["BlockHeader"]["timestamp"] += 1            # tamper with block 1
        db.update(chain)
        report = svc.validate()
        self.assertFalse(report["valid"])
        self.assertFalse(report["blocks"][0]["ok"])

    def test_3_duplicate_height_rejected(self):
        svc.reset()
        db = BlockchainDB()
        dup = db.read()[0]
        self.assertFalse(db.write([dup]))
        self.assertEqual(len(db.read()), 1)

    def test_4_send_balance_and_signature(self):
        svc.reset()
        a = svc.new_wallet()["address"]
        b = svc.new_wallet()["address"]
        svc.mine(a)                                           # a earns 50
        tx = svc.send(a, b, 10)
        self.assertTrue(tx["signatureValid"])
        self.assertEqual(tx["fee"], 1)
        self.assertEqual(tx["change"], 39)                    # 50 - 10 - 1
        bal = {w["address"]: w for w in svc.wallets()}
        self.assertEqual(bal[a]["available"], 0)              # its only UTXO is now spent (pending)
        self.assertEqual(bal[b]["pendingIn"], 10)

    def test_5_insufficient_balance(self):
        svc.reset()
        a = svc.new_wallet()["address"]
        b = svc.new_wallet()["address"]
        with self.assertRaises(svc.ApiError):
            svc.send(a, b, 5)

    def test_6_validate_chain_cli_object(self):
        svc.reset()
        bc = Blockchain(verbose=False)
        bc.add_next_block()
        self.assertTrue(bc.validate_chain())


if __name__ == "__main__":
    unittest.main()
