import time
import uuid
from typing import Optional

class AgentState:
    def __init__(self):
        self.dogs: dict[str, dict] = {}
        self.safe_mode: bool = False
        self.conservative_mode: bool = False
        self._start_time: int = int(time.time())

        # Economics
        self._total_revenue: float = 0.0
        self._total_costs: float = 0.0
        self._reserve: float = 0.0

        # Operational parameters
        self._execution_cost_threshold: float = 0.01  # SYS
