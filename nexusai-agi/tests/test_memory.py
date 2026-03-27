"""Tests for the memory system."""

import pytest

from nexusai_agi.core.config import MemoryConfig
from nexusai_agi.core.types import MemoryEntry
from nexusai_agi.memory.manager import MemoryManager
from nexusai_agi.memory.store import MemoryStore


class TestMemoryStore:
    def setup_method(self):
        self.store = MemoryStore()

    def test_add_and_count(self):
        entry = MemoryEntry(content="test memory")
        self.store.add(entry)
        assert self.store.count() == 1

    def test_get(self):
        entry = MemoryEntry(content="test")
        self.store.add(entry)
        retrieved = self.store.get(entry.id)
        assert retrieved is not None
        assert retrieved.content == "test"
        assert retrieved.access_count == 1

    def test_remove(self):
        entry = MemoryEntry(content="test")
        self.store.add(entry)
        assert self.store.remove(entry.id) is True
        assert self.store.count() == 0

    def test_search(self):
        self.store.add(MemoryEntry(content="The sky is blue"))
        self.store.add(MemoryEntry(content="Grass is green"))
        self.store.add(MemoryEntry(content="The ocean is blue"))

        results = self.store.search("blue sky")
        assert len(results) >= 1
        assert any("blue" in r.content.lower() for r in results)

    def test_search_by_tags(self):
        self.store.add(MemoryEntry(content="fact 1", tags=["science"]))
        self.store.add(MemoryEntry(content="fact 2", tags=["history"]))

        results = self.store.search_by_tags(["science"])
        assert len(results) == 1
        assert results[0].content == "fact 1"

    def test_search_by_type(self):
        self.store.add(MemoryEntry(content="short", memory_type="short_term"))
        self.store.add(MemoryEntry(content="long", memory_type="long_term"))

        results = self.store.search_by_type("long_term")
        assert len(results) == 1
        assert results[0].content == "long"

    def test_clear(self):
        self.store.add(MemoryEntry(content="test"))
        self.store.clear()
        assert self.store.count() == 0

    def test_all_entries(self):
        self.store.add(MemoryEntry(content="one"))
        self.store.add(MemoryEntry(content="two"))
        entries = self.store.all_entries()
        assert len(entries) == 2


class TestMemoryManager:
    def setup_method(self):
        self.config = MemoryConfig(short_term_capacity=5)
        self.manager = MemoryManager(self.config)

    def test_add_and_recall(self):
        self.manager.add("Python is a programming language", tags=["tech"])
        results = self.manager.recall("Python programming")
        assert len(results) >= 1

    def test_recall_by_tags(self):
        self.manager.add("item 1", tags=["important"])
        self.manager.add("item 2", tags=["trivial"])
        results = self.manager.recall_by_tags(["important"])
        assert len(results) == 1

    def test_recall_by_type(self):
        self.manager.add("short item", memory_type="short_term")
        self.manager.add("long item", memory_type="long_term")
        results = self.manager.recall_by_type("long_term")
        assert len(results) == 1

    def test_consolidate(self):
        entry = self.manager.add("important item", importance=0.9)
        promoted = self.manager.consolidate()
        assert promoted >= 1

    def test_capacity_enforcement(self):
        for i in range(10):
            self.manager.add(f"item {i}", memory_type="short_term")
        # Capacity is 5, so older entries should be removed
        results = self.manager.recall_by_type("short_term", limit=20)
        assert len(results) <= 5

    def test_count(self):
        self.manager.add("test")
        assert self.manager.count() >= 1

    def test_clear(self):
        self.manager.add("test")
        self.manager.clear()
        assert self.manager.count() == 0
