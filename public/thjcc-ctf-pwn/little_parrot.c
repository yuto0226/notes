#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// gcc -o chal chal.c

void win() {
  printf("\nYou win!\n");
  printf("Here is your flag: flag{fake_flag}");
  fflush(stdout);
}

int parrot() {
  char buf[0x100];
  printf(
      "I'm a little parrot, and I'll repeat whatever you said!(or exit)\n> ");
  while (1) {
    fflush(stdout);
    fgets(buf, sizeof(buf), stdin);

    if (!strcmp(buf, "exit\n")) {
      break;
    }

    printf("You said > ");
    printf(buf);
    printf("> ");
    fflush(stdout);
  }
}

int main() {
  parrot();

  char buf[0x30];
  printf("anything left to say?\n> ");
  fflush(stdout);
  getchar();
  gets(buf);
  printf("You said > %s", buf);
  fflush(stdout);
  return 0;
}
