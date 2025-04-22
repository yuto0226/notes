#include <stdio.h>
#include <stdlib.h>

void init() {
  setvbuf(stdout, 0, 2, 0);
  setvbuf(stdin, 0, 2, 0);
}

struct {
  int id;
  char name[20];
  unsigned short money;
} customer;

void shop(int choice) {
  switch (choice) {
    case 1:
      if (customer.money >= 100) {
        customer.money -= 100;
        printf("Here is your cake: %s", "🍰\n");
      } else
        printf("Not enough money QQ\n");
      break;
    case 2:
      if (customer.money >= 50) {
        customer.money -= 50;
        printf("Here is your bun: %s", "🥖\n");
      } else
        printf("Not enough money QQ\n");
      break;
    case 3:
      if (customer.money >= 25) {
        customer.money -= 25;
        printf("Here is your cookie: %s", "🍪\n");
      } else
        printf("Not enough money QQ\n");
      break;
    case 4:
      if (customer.money >= 10) {
        customer.money -= 10;
        printf("Here is your water: %s", "💧\n");
      } else
        printf("Not enough money QQ\n");
      break;
    case 5:
      if (customer.money >= 65535) {
        system("/bin/sh");
        exit(0);
      } else
        printf("Not enough money QQ\n");
      break;
    default:
      printf("Not an available choice\n");
      break;
  }
  if (customer.money <= 0) {
    printf("No money QQ\n");
    exit(0);
  }
}

void main() {
  init();
  customer.id = 1;
  customer.money = 100;
  printf("Enter your name: ");
  gets(customer.name);
  int choice;
  while (1) {
    printf("1) cake 100$\n");
    printf("2) bun 50$\n");
    printf("3) cookie 25$\n");
    printf("4) water 15$\n");
    printf("5) get shell 65535$\n");
    printf("Your money : %d$\n", customer.money);
    printf("Buy > ");
    scanf("%d", &choice);
    shop(choice);
  }
}