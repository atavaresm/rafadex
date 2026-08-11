"""Read, bump, or check the VERSION file's semver value."""

import argparse
import sys
from pathlib import Path

VERSION_FILE = Path("VERSION")


def parseVersion(text):
    text = text.strip()
    if not text.startswith("v"):
        raise ValueError(f"version must start with 'v': {text!r}")
    parts = text[1:].split(".")
    if len(parts) not in (2, 3):
        raise ValueError(f"version must have 2 or 3 numeric parts: {text!r}")
    if not all(p.isdigit() for p in parts):
        raise ValueError(f"version parts must be numeric: {text!r}")
    numbers = [int(p) for p in parts]
    while len(numbers) < 3:
        numbers.append(0)
    return tuple(numbers)


def formatVersion(parts):
    major, minor, patch = parts
    return f"v{major}.{minor}.{patch}"


def bumpVersion(current, size):
    major, minor, patch = current
    if size == "patch":
        return (major, minor, patch + 1)
    if size == "minor":
        return (major, minor + 1, 0)
    if size == "major":
        return (major + 1, 0, 0)
    raise ValueError(f"unknown bump size: {size!r}")


def checkVersion(current, base):
    if current <= base:
        raise ValueError(
            f"VERSION ({formatVersion(current)}) must be greater than "
            f"the base ({formatVersion(base)}) — bump it before releasing."
        )


def main():
    parser = argparse.ArgumentParser(description="Read, bump, or check the VERSION file.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("size", nargs="?", choices=["patch", "minor", "major"],
                        help="bump the VERSION file by this amount")
    group.add_argument("--check", metavar="BASE", help="check VERSION is greater than BASE")
    args = parser.parse_args()

    current = parseVersion(VERSION_FILE.read_text())

    if args.check is not None:
        base = parseVersion(args.check)
        checkVersion(current, base)
        print(f"OK: {formatVersion(current)} > {formatVersion(base)}")
        return

    newVersion = bumpVersion(current, args.size)
    VERSION_FILE.write_text(formatVersion(newVersion))
    print(formatVersion(newVersion))


if __name__ == "__main__":
    try:
        main()
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        sys.exit(1)
