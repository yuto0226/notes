---
title: pwntools 模板
published: 2025-04-22
description: ''
image: ''
tags: ['pwn']
category: 'CTF'
draft: false 
lang: ''
---

## Install

```zsh
pip install pwntools
```

## Usage

```zsh
python3 ./exploit.py
```

## Script

```py
from pwn import *
import sys

BINARY = "./vuln"
REMOTE = "yuto0226.com:1337"
DEBUG = len(sys.argv) > 1 and sys.argv[1] == "debug"

context.arch = "amd64"
context.os = "linux"
context.terminal = ["tmux", "splitw", "-h"]
context.log_level = "debug"

# setup gdb scripts
GDBSCRIPT = """
b main
c
"""


def connect():
    if DEBUG:
        return gdb.debug(BINARY, gdbscript=GDBSCRIPT)
    else:
        host, port = REMOTE.split(":")
        return remote(host, int(port))


def exploit(io):
    # script here

    io.interactive()
    io.close()


if __name__ == "__main__":
    io = connect()
    try:
        exploit(io)
    finally:
        io.close()
```
