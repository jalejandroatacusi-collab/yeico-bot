from typing import Optional

class Escrow:
    def __init__(self):
        # dog_id → balance
        self._balances: dict[str, float] = {}

    def create_escrow(self, dog_id: str):
        self._balances[dog_id] = 0.0

    def deposit(self, dog_id: str, amount: float) -> dict:
        if dog_id not in self._balances:
            self._balances[dog_id] = 0.0
        self._balances[dog_id] += amount
        return {
            "ok": True,
            "dog_id": dog_id,
            "deposited": amount,
            "new_balance": self._balances[dog_id],
        }

    def release_payment(
        self,
        dog_id: str,
        caregiver_wallet: str,
        caregiver_amount: float,
        agent_fee: float,
    ) -> dict:
        balance = self._balances.get(dog_id, 0.0)
        total = caregiver_amount + agent_fee

        if balance < total:
            return {"ok": False, "reason": "Insufficient balance."}

        self._balances[dog_id] -= total

        # TODO: replace with actual on-chain transfer
        print(f"[ESCROW] Released {caregiver_amount:.4f} SYS → {caregiver_wallet}")
        print(f"[ESCROW] Fee     {agent_fee:.4f} SYS → agent")

        return {
            "ok": True,
            "dog_id": dog_id,
            "caregiver_received": caregiver_amount,
            "agent_fee": agent_fee,
            "remaining_balance": self._balances[dog_id],
        }

    def get_balance(self, dog_id: str) -> float:
        return self._balances.get(dog_id, 0.0)
