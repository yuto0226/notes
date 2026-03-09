---
title: pwntools 模板
date: 2026-02-19
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
python3 ./exploit.py GDB # REMOTE
```

可以善用 pwntools 內建的工具來寫 exploit 會事半功倍：

- 利用 `ELF.symbols["main"]` 來取得函式 address
- 利用 `ROP.find_gadget(['pop eax', 'ret']).address` 來取得 gadget
- `fmt

## Script

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re
from pwn import *

BINARY = "./vuln"
REMOTE = "chall.yuto0226.dev:1337`"

# Set up pwntools for the correct architecture
elf = context.binary = ELF(BINARY, False)

context.clear(arch='i386')
# ['CRITICAL', 'DEBUG', 'ERROR', 'INFO', 'NOTSET', 'WARN', 'WARNING']
context.log_level = "info"
context.terminal = ["tmux", "splitw", "-h"]  # -v, -h
# context.terminal = ["tmux", "neww"] # open new window
context.delete_corefiles = True


def start(argv=[], *a, **kw):
    """Start the exploit against the target."""
    if args.GDB:
        return gdb.debug([BINARY] + argv, gdbscript=gdbscript, *a, **kw)
    elif args.REMOTE:
        host, port = REMOTE.split(":")
        return remote(host, int(port))
    else:
        return process([BINARY] + argv, *a, **kw)


def flag(output, pattern):
    match = re.search(pattern, output)
    if match:
        flag = match.group(1).decode()
        success(f"flag: {flag}")
    else:
        warn("flag not found in output")
        info(f"raw output: {output}")


gdbscript = """
init-pwndbg
b main
c
""".format(**locals())

rop = ROP(elf)
sym = elf.symbols # e.g. sym["main"]

# ===========================================================
#                    EXPLOIT GOES HERE
# ===========================================================

io = start()

io.interactive()
data = io.recvall()
flag(data, rb"(FLAG\{.*?\})")
io.close()
```
