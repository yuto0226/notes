#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

void init() {
  setvbuf(stdout, 0, 2, 0);
  setvbuf(stdin, 0, 2, 0);
}

char charset[] =
    "!\"#$%&\'()*+,-./"
    "0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`"
    "abcdefghijklmnopqrstuvwxyz{|}~";

void main() {
  char secret[0x10];
  char buf[0x10];
  char is_sure = 'y';

  init();
  srand(time(NULL));

  for (int i = 0; i < 15; i++) {
    secret[i] = charset[rand() % strlen(charset)];
  }
  secret[15] = 0;

  printf("Guess the secret, you only have one chance\n");
  while (1) {
    printf("guess >");
    scanf("%15s", buf);
    getchar();

    printf("Your guess: ");
    printf(buf);
    printf("\n");

    printf("Are you sure? [y/n] >");
    scanf("%1c", &is_sure);
    getchar();
    if (is_sure == 'y') {
      if (!strcmp(buf, secret)) {
        printf("Correct answer!\n");
        system("/bin/sh");
      } else {
        printf("Incorrect answer\n");
        printf("Correct answer is %s\n", secret);
        break;
      }
    }
  }
}