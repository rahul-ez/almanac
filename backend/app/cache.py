"""In-memory TTL cache with tag-based and write-through invalidation."""

from __future__ import annotations

import logging
import threading
import time
from typing import Any

logger = logging.getLogger("campus_companion.cache")


class SimpleTTLCache:
    def __init__(self) -> None:
        self._cache: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Any | None:
        with self._lock:
            item = self._cache.get(key)
            if item is None:
                return None
            expiry, val = item
            if time.time() > expiry:
                del self._cache[key]
                return None
            return val

    def set(self, key: str, value: Any, ttl_seconds: float = 30.0) -> None:
        with self._lock:
            self._cache[key] = (time.time() + ttl_seconds, value)

    def invalidate_all(self) -> None:
        with self._lock:
            self._cache.clear()
        logger.debug("Cache invalidated completely")

    def invalidate_prefix(self, prefix: str) -> None:
        with self._lock:
            keys_to_del = [k for k in self._cache if k.startswith(prefix)]
            for k in keys_to_del:
                del self._cache[k]
        logger.debug("Cache invalidated for prefix=%s (%d keys removed)", prefix, len(keys_to_del))


cache = SimpleTTLCache()
