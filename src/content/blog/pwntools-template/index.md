---
title: pwntools 模板
date: 2025-04-22
updated: 2025-07-18
description: ''
image: ''
tags:
  - pwn
---

## Install

```zsh
pip install pwntools
```

## Usage

```zsh
python3 ./exploit.py DEBUG # REMOTE
```

## Script

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pwn import *

BINARY = "./vuln"
REMOTE = "yuto0226.com:1337"

# Set up pwntools for the correct architecture
elf = context.binary = ELF(BINARY, checksec=False)

context.log_level = "info"  # info, debug
context.terminal = ["tmux", "splitw", "-h"]
context.delete_corefiles = True


def start(argv=[], *a, **kw):
    """Start the exploit against the target."""
    if args.DEBUG:
        return gdb.debug([BINARY] + argv, gdbscript=gdbscript, *a, **kw)
    elif args.REMOTE:
        host, port = REMOTE.split(":")
        return remote(host, int(port))
    else:
        return process([BINARY] + argv, *a, **kw)


gdbscript = """
init-pwndbg
b main
c
""".format(**locals())

# ===========================================================
#                    EXPLOIT GOES HERE
# ===========================================================

io = start()

flag = io.recvline()
success(f"flag: {flag.decode()}")

io.close()
```
