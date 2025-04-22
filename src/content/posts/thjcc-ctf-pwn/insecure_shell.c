#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void init() {
  setvbuf(stdout, 0, 2, 0);
  setvbuf(stdin, 0, 2, 0);
}

int check_password(char* a, char* b, int length) {
  for (int i = 0; i < length; i++)
    if (a[i] != b[i])
      return 1;
  return 0;
}

int main() {
  init();

  char password[0x10];
  char buf[0x10];

  int fd = open("/dev/urandom", O_RDONLY);
  if (fd < 0) {
    printf("Error opening /dev/urandom. If you see this. call admin");
    return 1;
  }
  read(fd, password, 15);

  printf("Enter the password >");
  scanf("%15s", buf);

  if (check_password(password, buf, strlen(buf)))
    printf("Wrong password!\n");
  else
    system("/bin/sh");
}