---
title: Installation Guide
description: How to install and set up your project
audience:
  - users
  - contributors
tags:
  - getting-started
  - setup
---

# Installation Guide

> **Setting up from the template?** See the [New Project Setup](../template/new-project.md) guide instead.

## Requirements

- Python 3.12 or higher
- pip or uv

## Install from PyPI

### Using pip

```bash
pip install pydatatracker
```

### Using uv (recommended)

```bash
uv pip install pydatatracker
```

## Install from Source

### Clone the Repository

```bash
git clone https://github.com/endavis/pydatatracker.git
cd pydatatracker
```

### Install in Development Mode

```bash
# Creates .venv and installs the project, editable, with every extra from uv.lock
uv sync --all-extras --dev
```

The development tools, `doit` included, live in the `dev` and `security` extras, and a plain
`uv sync` uninstalls them. Every sync after this first one is `doit install_dev`, which runs the
same command.

## Optional Dependencies

The development setup above installs both extras:

- `dev` - the test, lint, type-check, docs and release tools, `doit` among them
- `security` - `pip-audit`, `bandit` and the other security tools

## Verify Installation

Check that the package is installed correctly:

```python
import pydatatracker
print(pydatatracker.__version__)
```

## Upgrading

### From PyPI

```bash
pip install --upgrade pydatatracker
```

### From Source

```bash
cd pydatatracker
git pull
doit install_dev
```

## Uninstallation

```bash
pip uninstall pydatatracker
```

## Troubleshooting

### Python Version Issues

Ensure you're using Python 3.12 or higher:

```bash
python --version
```

If you have multiple Python versions:

```bash
python3.12 -m pip install pydatatracker
```

### Virtual Environment Issues

If you encounter issues, try creating a fresh virtual environment:

```bash
rm -rf .venv
uv venv
source .venv/bin/activate
uv pip install pydatatracker
```

### Permission Errors

If you get permission errors, use a virtual environment instead of installing globally:

```bash
uv venv
source .venv/bin/activate
uv pip install pydatatracker
```

## Next Steps

- Read the [Usage Guide](../usage/basics.md) to learn how to use the package
- Check the [API Reference](../reference/api.md) for detailed documentation
- See [Examples](../examples/README.md) for usage examples
