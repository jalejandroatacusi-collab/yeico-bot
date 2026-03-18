class Governance:
    def __init__(self):
        self._dog_states: dict[str, dict] = {}
        self._params: dict = {
            "payment_per_feed": 0.5,    # SYS per validated feeding
            "fee_percentage": 0.05,      # 5% agent fee
            "min_feedings_for_release": 1,
            "max_feedings_per_day": 2,
            "min_hours_between_feedings": 6,
        }

    def get_state(self, dog_id: str) -> dict:
        return self._dog_states.get(dog_id, {"flagged": False, "reason": None})

    def freeze_dog(self, dog_id: str, reason: str):
        self._dog_states[dog_id] = {"flagged": True, "reason": reason}
        print(f"[GOVERNANCE] Dog {dog_id} FROZEN: {reason}")

    def unfreeze_dog(self, dog_id: str):
        self._dog_states[dog_id] = {"flagged": False, "reason": None}
        print(f"[GOVERNANCE] Dog {dog_id} UNFROZEN")

    def report_fraud(self, dog_id: str, evidence: str):
        self.freeze_dog(dog_id, f"Fraud report: {evidence}")

    def get_params(self) -> dict:
        return self._params.copy()

    def update_params(self, updates: dict):
        """Governance can update economic params dynamically."""
        self._params.update(updates)
        print(f"[GOVERNANCE] Params updated: {updates}")
