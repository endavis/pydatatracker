"""The package's `__version__` must agree with the installed distribution (#7)."""

from __future__ import annotations

import importlib.metadata

import pydatatracker


def test_version_matches_installed_metadata() -> None:
    assert pydatatracker.__version__ == importlib.metadata.version("pydatatracker")
