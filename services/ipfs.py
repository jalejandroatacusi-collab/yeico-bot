import os
import httpx

IPFS_GATEWAY = os.getenv("IPFS_GATEWAY", "https://ipfs.io/ipfs/")
IPFS_UPLOAD_URL = os.getenv("IPFS_UPLOAD_URL", "")
IPFS_API_KEY = os.getenv("IPFS_API_KEY", "")

class IPFSService:
    def is_available(self) -> bool:
        """Dependency check: can we reach IPFS?"""
        try:
            # Lightweight check against gateway
            r = httpx.get(IPFS_GATEWAY, timeout=5.0)
            return r.status_code < 500
        except Exception:
            return False

    def get_url(self, ipfs_hash: str) -> str:
        return f"{IPFS_GATEWAY}{ipfs_hash}"

    async def upload(self, data: bytes, filename: str = "image.jpg") -> dict:
        """
        Upload data to IPFS via pinning service.
        Returns: {ok: bool, hash: str, url: str}

        TODO: configure IPFS_UPLOAD_URL with your pinning service.
        Examples: Pinata, Web3.Storage, nft.storage
        """
        if not IPFS_UPLOAD_URL:
            # Simulate — return a placeholder hash for development
            fake_hash = f"Qm{hash(data) % (10**40):040d}"
            return {
                "ok": True,
                "hash": fake_hash,
                "url": self.get_url(fake_hash),
                "simulated": True,
            }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = {"file": (filename, data, "image/jpeg")}
                headers = {"Authorization": f"Bearer {IPFS_API_KEY}"}
                r = await client.post(IPFS_UPLOAD_URL, files=files, headers=headers)
                result = r.json()
                ipfs_hash = result.get("IpfsHash") or result.get("cid")
                return {
                    "ok": True,
                    "hash": ipfs_hash,
                    "url": self.get_url(ipfs_hash),
                }
        except Exception as e:
            return {"ok": False, "error": str(e)}
