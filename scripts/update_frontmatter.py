#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
from __future__ import annotations

import argparse
import subprocess
from datetime import datetime, timedelta, timezone

TAIPEI = timezone(timedelta(hours=8))
DATE_RE_TMPL = "{key}:"


def now_iso() -> str:
    return datetime.now(TAIPEI).strftime("%Y-%m-%dT%H:%M:%S+08:00")


def git_status(paths: list[str]) -> dict[str, str]:
    """Map path -> staged status letter (A/M/R/...) via `git diff --cached`."""
    out = subprocess.run(
        ["git", "diff", "--cached", "--name-status", "--", *paths],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    status = {}
    for line in out.splitlines():
        parts = line.split("\t")
        code, path = parts[0], parts[-1]
        status[path] = code[0]
    return status


def split_frontmatter(text: str) -> tuple[list[str], str] | None:
    if not text.startswith("---\n") and not text.startswith("---\r\n"):
        return None
    lines = text.splitlines(keepends=True)
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        return None
    return lines[1:end], "".join(lines[end:])


def find_key_line(fm: list[str], key: str) -> int | None:
    prefix = DATE_RE_TMPL.format(key=key)
    for i, line in enumerate(fm):
        if line.startswith(prefix):
            return i
    return None


def set_or_insert(
    fm: list[str], key: str, value: str, after_key: str | None, eol: str
) -> list[str]:
    idx = find_key_line(fm, key)
    line = f"{key}: {value}{eol}"
    if idx is not None:
        fm[idx] = line
        return fm
    insert_at = len(fm)
    if after_key is not None:
        after_idx = find_key_line(fm, after_key)
        if after_idx is not None:
            insert_at = after_idx + 1
    fm.insert(insert_at, line)
    return fm


def process(path: str, status: str) -> bool:
    with open(path, encoding="utf-8", newline="") as f:
        text = f.read()

    split = split_frontmatter(text)
    if split is None:
        return False
    fm, rest = split
    eol = "\r\n" if "\r\n" in text else "\n"

    has_date = find_key_line(fm, "date") is not None

    if status == "A" or not has_date:
        fm = set_or_insert(fm, "date", now_iso(), after_key="title", eol=eol)
    else:
        fm = set_or_insert(fm, "updated", now_iso(), after_key="date", eol=eol)

    new_text = f"---{eol}" + "".join(fm) + rest
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(new_text)
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fill `date` on new notes/essays and bump `updated` on edited ones.",
    )
    parser.add_argument(
        "paths", nargs="*", metavar="FILE", help="staged Markdown/MDX files"
    )
    parser.add_argument(
        "--no-stage",
        action="store_true",
        help="skip `git add` after rewriting files (useful for manual/dry runs)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.paths:
        return 0

    status_map = git_status(args.paths)
    touched = [p for p in args.paths if process(p, status_map.get(p, "M"))]

    if touched and not args.no_stage:
        subprocess.run(["git", "add", *touched], check=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
