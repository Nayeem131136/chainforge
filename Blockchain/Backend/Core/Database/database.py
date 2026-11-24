import os
import json

# Project root = <repo>/ (this file lives in Blockchain/Backend/Core/Database/)
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), *([".."] * 4)))


class BaseDB:
    def __init__(self):
        # Data/ always lives in the project root, no matter where you run Python from.
        # Override with the FORGE_DATA_DIR environment variable if you want (used by the tests).
        self.basepath = os.environ.get("FORGE_DATA_DIR") or os.path.join(PROJECT_ROOT, "Data")
        self.filepath = os.path.join(self.basepath, self.filename)

    def DBExists(self):
        return os.path.exists(self.filepath)

    def read(self, quiet=False):
        if not self.DBExists():
            if not quiet:
                print(f"File {self.filepath} not available")
            return False

        with open(self.filepath, "r") as file:
            raw = file.readline()

        if len(raw) > 0:
            data = json.loads(raw)
        else:
            data = []
        return data

    def update(self, data):
        os.makedirs(self.basepath, exist_ok=True)
        with open(self.filepath, "w+") as f:
            f.write(json.dumps(data))
        return True

    def write(self, item):
        data = self.read(quiet=True)
        if data:
            data = data + item
        else:
            data = item

        os.makedirs(self.basepath, exist_ok=True)
        with open(self.filepath, "w+") as file:
            file.write(json.dumps(data))
        return True


class BlockchainDB(BaseDB):
    def __init__(self):
        self.filename = "forgecoin-blockchain"
        super().__init__()

    def write(self, item):
        """
        item = list of proposed blocks.
        Returns True if stored, False if rejected (a block with the same Height already exists
        or the same Height appears twice inside `item`). Prevents duplicate block storage.
        """
        if isinstance(item, dict):
            item = [item]

        data = self.read(quiet=True) or []

        existing_heights = {block["Height"] for block in data}
        seen = set()
        for block in item:
            height = block["Height"]
            if height in existing_heights or height in seen:
                return False
            seen.add(height)

        os.makedirs(self.basepath, exist_ok=True)
        with open(self.filepath, "w+") as file:
            file.write(json.dumps(data + item))
        return True

    def lastBlock(self):
        data = self.read(quiet=True)

        if data:
            return data[-1]

    def reset(self):
        if self.DBExists():
            os.remove(self.filepath)


class AccountDB(BaseDB):
    def __init__(self):
        self.filename = "forgecoin-account"
        super().__init__()
