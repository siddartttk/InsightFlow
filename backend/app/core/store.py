import json
import os
import secrets
import time
from pathlib import Path
from dataclasses import dataclass, field
from threading import RLock
import pandas as pd
from fastapi import HTTPException
from app.schemas import Metadata, Quality
from app.services.validation import normalize

ROOT = Path(__file__).resolve().parents[3]
TTL = int(os.getenv('SESSION_TTL_SECONDS', '1800'))
MAX_SESSIONS = int(os.getenv('MAX_UPLOAD_SESSIONS', '20'))
MAX_SESSION_MEMORY = int(os.getenv('MAX_SESSION_MEMORY_MB', '128')) * 1024 * 1024
UPLOADS_ENABLED = os.getenv('ENABLE_UPLOADS', 'true').lower() == 'true'


@dataclass
class Dataset:
    frame: pd.DataFrame
    quality: Quality
    name: str
    source: str
    synthetic: bool
    cache: dict = field(default_factory=dict)
    lock: RLock = field(default_factory=RLock)

    def metadata(self) -> Metadata:
        return Metadata(name=self.name, source=self.source, synthetic=self.synthetic,
                        start=self.frame.InvoiceDate.min().date().isoformat(), end=self.frame.InvoiceDate.max().date().isoformat(),
                        countries=sorted(self.frame.Country.unique().tolist()), quality=self.quality,
                        uploads_enabled=UPLOADS_ENABLED, session_ttl_seconds=TTL)


class Store:
    def __init__(self):
        self.lock = RLock()
        self.sessions: dict[str, tuple[float, Dataset]] = {}
        self._demo = None

    def demo(self) -> Dataset:
        with self.lock:
            if self._demo is None:
                path = ROOT / 'data' / 'sample' / 'demo.csv'
                if not path.exists():
                    raise HTTPException(503, 'Demo data is missing. Run scripts/prepare_data.py --download or scripts/generate_sample.py.')
                provenance = json.loads(path.with_suffix('.json').read_text(encoding='utf-8'))
                frame, quality = normalize(pd.read_csv(path, dtype={'InvoiceNo': 'string', 'StockCode': 'string', 'CustomerID': 'string'}))
                self._demo = Dataset(frame, quality, provenance['name'], provenance['source'], provenance['synthetic'])
            return self._demo

    def purge(self):
        now = time.monotonic()
        for token in [token for token, (expiry, _) in self.sessions.items() if expiry <= now]:
            del self.sessions[token]

    def get(self, authorization: str | None) -> Dataset:
        if not authorization:
            return self.demo()
        if not authorization.startswith('Bearer '):
            raise HTTPException(401, 'Use a valid dataset session token.')
        token = authorization[7:]
        with self.lock:
            self.purge()
            if token not in self.sessions:
                raise HTTPException(401, 'Your upload session expired or is unavailable. Upload the CSV again or switch to demo data.')
            return self.sessions[token][1]

    def add(self, dataset: Dataset) -> str:
        with self.lock:
            self.purge()
            used_memory = sum(int(d.frame.memory_usage(deep=True).sum()) for _, d in self.sessions.values())
            needed_memory = int(dataset.frame.memory_usage(deep=True).sum())
            if len(self.sessions) >= MAX_SESSIONS or used_memory + needed_memory > MAX_SESSION_MEMORY:
                raise HTTPException(503, 'Upload capacity is temporarily full. Try again after sessions expire.')
            token = secrets.token_urlsafe(32)
            self.sessions[token] = (time.monotonic() + TTL, dataset)
            return token

    def delete(self, authorization: str | None):
        self.get(authorization)
        if authorization:
            with self.lock:
                self.sessions.pop(authorization[7:], None)


store = Store()
