"""Memory manager - coordinates all memory operations."""

from __future__ import annotations

from nexusai_agi.core.config import MemoryConfig
from nexusai_agi.core.types import MemoryEntry
from nexusai_agi.memory.store import MemoryStore


class MemoryManager:
    """Manages short-term, long-term, episodic, and semantic memory."""

    def __init__(self, config: MemoryConfig | None = None):
        self.config = config or MemoryConfig()
        self._store = MemoryStore(persistence_path=self.config.persistence_path)

    def add(
        self,
        content: str,
        memory_type: str = "short_term",
        tags: list[str] | None = None,
        importance: float = 0.5,
    ) -> MemoryEntry:
        """Add a memory entry."""
        entry = MemoryEntry(
            content=content,
            memory_type=memory_type,
            importance=importance,
            tags=tags or [],
        )
        self._store.add(entry)
        self._enforce_capacity(memory_type)
        return entry

    def recall(self, query: str, limit: int = 5) -> list[MemoryEntry]:
        """Search across all memory types for relevant entries."""
        return self._store.search(query, limit=limit)

    def recall_by_tags(self, tags: list[str], limit: int = 5) -> list[MemoryEntry]:
        return self._store.search_by_tags(tags, limit=limit)

    def recall_by_type(self, memory_type: str, limit: int = 10) -> list[MemoryEntry]:
        return self._store.search_by_type(memory_type, limit=limit)

    def consolidate(self) -> int:
        """Consolidate short-term memories into long-term."""
        short_term = self._store.search_by_type("short_term", limit=1000)
        promoted = 0
        for entry in short_term:
            if entry.access_count >= 2 or entry.importance >= 0.7:
                entry.memory_type = "long_term"
                promoted += 1
        return promoted

    def count(self) -> int:
        return self._store.count()

    def clear(self) -> None:
        self._store.clear()

    def save(self) -> None:
        self._store.save()

    def _enforce_capacity(self, memory_type: str) -> None:
        """Remove oldest entries if capacity exceeded."""
        capacity_map = {
            "short_term": self.config.short_term_capacity,
            "long_term": self.config.long_term_capacity,
            "episodic": self.config.episodic_capacity,
        }
        capacity = capacity_map.get(memory_type)
        if not capacity:
            return

        entries = self._store.search_by_type(memory_type, limit=capacity + 100)
        if len(entries) > capacity:
            # Remove oldest, least accessed entries
            entries.sort(key=lambda e: (e.access_count, e.timestamp))
            for entry in entries[: len(entries) - capacity]:
                self._store.remove(entry.id)
