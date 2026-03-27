"""Memory storage backend."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from nexusai_agi.core.types import MemoryEntry


class MemoryStore:
    """In-memory storage with optional persistence."""

    def __init__(self, persistence_path: str | None = None):
        self._entries: dict[str, MemoryEntry] = {}
        self._persistence_path = persistence_path
        if persistence_path:
            self._load_from_disk()

    def add(self, entry: MemoryEntry) -> None:
        self._entries[entry.id] = entry

    def get(self, entry_id: str) -> MemoryEntry | None:
        entry = self._entries.get(entry_id)
        if entry:
            entry.access_count += 1
            import time

            entry.last_accessed = time.time()
        return entry

    def remove(self, entry_id: str) -> bool:
        return self._entries.pop(entry_id, None) is not None

    def search(self, query: str, limit: int = 10) -> list[MemoryEntry]:
        """Simple keyword search (no embeddings required)."""
        query_lower = query.lower()
        query_words = set(query_lower.split())

        scored: list[tuple[float, MemoryEntry]] = []
        for entry in self._entries.values():
            content_lower = entry.content.lower()
            # Score by word overlap
            content_words = set(content_lower.split())
            overlap = len(query_words & content_words)
            if overlap > 0 or query_lower in content_lower:
                score = overlap / max(len(query_words), 1)
                if query_lower in content_lower:
                    score += 0.5
                # Boost by importance and recency
                score += entry.importance * 0.3
                scored.append((score, entry))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [entry for _, entry in scored[:limit]]

    def search_by_tags(self, tags: list[str], limit: int = 10) -> list[MemoryEntry]:
        """Search by tags."""
        tag_set = set(tags)
        results = []
        for entry in self._entries.values():
            if tag_set & set(entry.tags):
                results.append(entry)
        results.sort(key=lambda e: e.timestamp, reverse=True)
        return results[:limit]

    def search_by_type(
        self, memory_type: str, limit: int = 10
    ) -> list[MemoryEntry]:
        """Get entries of a specific type."""
        results = [e for e in self._entries.values() if e.memory_type == memory_type]
        results.sort(key=lambda e: e.timestamp, reverse=True)
        return results[:limit]

    def all_entries(self) -> list[MemoryEntry]:
        return list(self._entries.values())

    def count(self) -> int:
        return len(self._entries)

    def clear(self) -> None:
        self._entries.clear()

    def save(self) -> None:
        """Persist to disk."""
        if not self._persistence_path:
            return
        path = Path(self._persistence_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        data = [e.to_dict() for e in self._entries.values()]
        path.write_text(json.dumps(data, indent=2))

    def _load_from_disk(self) -> None:
        path = Path(self._persistence_path)
        if not path.exists():
            return
        try:
            data = json.loads(path.read_text())
            for item in data:
                entry = MemoryEntry(
                    content=item["content"],
                    memory_type=item.get("memory_type", "long_term"),
                    id=item.get("id", ""),
                    importance=item.get("importance", 0.5),
                    tags=item.get("tags", []),
                    timestamp=item.get("timestamp", 0),
                    access_count=item.get("access_count", 0),
                )
                self._entries[entry.id] = entry
        except (json.JSONDecodeError, KeyError):
            pass
