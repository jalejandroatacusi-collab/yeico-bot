import time
from collections import defaultdict
from typing import Optional

class AntiFraudEngine:
    def __init__(self):
        # dog_id → list of feeding timestamps (today)
        self._feeding_log: dict[str, list[int]] = defaultdict(list)
        # dog_id → set of used image hashes
        self._image_registry: dict[str, set] = defaultdict(set)
        # Fingerprints of registered dogs (color+size+zone)
        self._dog_fingerprints: list[dict] = []
