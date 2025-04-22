#include <stdio.h>
#include <stdlib.h>

int main() {
  setbuf(stdin, NULL);
  setbuf(stdout, NULL);
  setbuf(stderr, NULL);

  printf("            Welcome to the FLAG SHOP!!!\n");
  printf("===================================================\n\n");

  int money = 100;
  int price[4] = {0, 25, 20, 123456789};
  int own[4] = {};
  int option = 0;
  long long num = 0;

  while (1) {
    printf("Which one would you like? (enter the serial number)\n");
    printf("1. Coffee\n");
    printf("2. Tea\n");
    printf("3. Flag\n> ");

    scanf("%d", &option);
    if (option < 1 || option > 3) {
      printf("invalid option\n");
      continue;
    }

    printf("How many do you need?\n> ");
    scanf("%lld", &num);
    if (num < 1) {
      printf("invalid number\n");
      continue;
    }

    if (money < price[option] * (int)num) {
      printf("You only have %d, ", money);
      printf("But it cost %d * %d = %d\n", price[option], (int)num,
             price[option] * (int)num);
      continue;
    }

    money -= price[option] * (int)num;
    own[option] += num;

    if (own[3]) {
      printf("flag{fake_flag}");
      exit(0);
    }
  }
}