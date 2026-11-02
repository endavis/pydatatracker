"""Tests for exporter utilities."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from pydatatracker import TrackedDict
from pydatatracker.exporters import HttpExporter, JsonLinesExporter, KafkaExporter, S3Exporter
from pydatatracker.utils.changelog import ChangeLogEntry


def _make_change() -> ChangeLogEntry:
    tracked = TrackedDict()
    tracked["foo"] = "bar"
    change = tracked.last_change()
    assert change is not None
    return change


def test_json_lines_exporter(tmp_path: Path) -> None:
    change = _make_change()
    exporter = JsonLinesExporter(tmp_path / "changes.jsonl")
    exporter(change)
    data = (tmp_path / "changes.jsonl").read_text().strip().splitlines()
    assert len(data) == 1
    assert json.loads(data[0])["extra"]["location"] == "foo"


def test_http_exporter_invokes_post(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    def fake_post(url: str, json: dict[str, Any] | None = None, **kwargs: object) -> None:
        captured["url"] = url
        captured["json"] = json

    exporter = HttpExporter(fake_post, "https://api.example.com/")
    exporter(_make_change())
    assert captured["url"] == "https://api.example.com/"
    assert captured["json"]["extra"]["location"] == "foo"


def test_s3_exporter(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    class Client:
        def __init__(self) -> None:
            self.calls: list[dict[str, object]] = []

        def put_object(self, **kwargs: object) -> None:
            self.calls.append(kwargs)

    client = Client()
    exporter = S3Exporter(client, bucket="test", prefix="logs")
    exporter(_make_change())
    assert client.calls
    assert client.calls[0]["Bucket"] == "test"


def test_kafka_exporter() -> None:
    class Producer:
        def __init__(self) -> None:
            self.messages: list[tuple[str, bytes]] = []

        def send(self, topic: str, payload: bytes) -> None:
            self.messages.append((topic, payload))

    producer = Producer()
    exporter = KafkaExporter(producer, topic="changes")
    exporter(_make_change())
    assert producer.messages
