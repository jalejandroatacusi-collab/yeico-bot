import time
from datetime import datetime
from typing import Optional

from core.decisions import DecisionEngine
from core.antifraud import AntiFraudEngine
from core.state import AgentState
from blockchain.escrow import Escrow
from blockchain.governance import Governance
from services.ipfs import IPFSService
from services.moltbook import MoltbookService


class YeicoAgent:
    def __init__(self):
        self.decisions = DecisionEngine()
        self.antifraud = AntiFraudEngine()
        self.state = AgentState()
        self.escrow = Escrow()
        self.governance = Governance()
        self.ipfs = IPFSService()
        self.moltbook = MoltbookService()
