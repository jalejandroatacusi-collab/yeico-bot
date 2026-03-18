import time

class DecisionEngine:
    def evaluate_feeding(self, dog: dict, event: dict) -> dict:
        """
        Evaluate a feeding event against deterministic rules.
        Returns: {accept: bool, reason: str, confidence: float}
        """
        confidence = 1.0
        reasons = []

        # Rule 1: dog must be active
        if dog.get("status") != "active":
            return {"accept": False, "reason": "Dog is not active.", "confidence": 0.0}

        # Rule 2: timestamp must be plausible (not in future, not older than 1h)
        ts = event.get("timestamp", 0)
        now = int(time.time())
        if ts > now + 60:
            return {"accept": False, "reason": "Timestamp is in the future.", "confidence": 0.0}
        if ts < now - 3600:
            reasons.append("Timestamp older than 1 hour")
            confidence -= 0.3

        # Rule 3: image hash must be present
        if not event.get("image"):
            return {"accept": False, "reason": "No image hash provided.", "confidence": 0.0}

        # Rule 4: metadata coherence (size vs weight)
        if not self._check_metadata_coherence(dog):
            reasons.append("Dog metadata incoherent (size/weight mismatch)")
            confidence -= 0.2

        # If confidence dropped too much, reject
        if confidence < 0.7:
            return {
                "accept": False,
                "reason": f"Low confidence ({confidence:.2f}): {'; '.join(reasons)}",
                "confidence": confidence,
            }

        return {"accept": True, "reason": "All rules passed.", "confidence": confidence}

    def evaluate_registration(self, metadata: dict, image_hash: str) -> dict:
        """Evaluate dog registration metadata."""
        if not image_hash:
            return {"accept": False, "reason": "Image required."}
        if not self._check_metadata_coherence(metadata):
            return {"accept": False, "reason": "Incoherent size/weight combination."}
        return {"accept": True, "reason": "Registration valid."}

    @staticmethod
    def _check_metadata_coherence(data: dict) -> bool:
        """Basic coherence: size vs weight."""
        size = str(data.get("size", "")).lower()
        weight_raw = data.get("weight", 0)
        try:
            weight = float(weight_raw)
        except (ValueError, TypeError):
            return True  # Can't validate, don't reject

        if size == "small" and weight > 15:
            return False
        if size == "large" and weight < 5:
            return False
        return True
