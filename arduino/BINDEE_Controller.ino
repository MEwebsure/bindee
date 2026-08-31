#include <Servo.h>

Servo sorter;
const int SERVO_PIN = 9;
const int HOME = 90, PLASTIC = 20, PAPER = 55, GLASS = 125, METAL = 160, REJECT = 90;

void setup() {
  Serial.begin(115200);
  sorter.attach(SERVO_PIN);
  sorter.write(HOME);
  Serial.println("BINDEE_READY");
}

void sortWaste(char command) {
  int angle = REJECT;
  switch (command) {
    case 'P': angle = PLASTIC; break;
    case 'A': angle = PAPER; break;
    case 'G': angle = GLASS; break;
    case 'M': angle = METAL; break;
    case 'R': angle = REJECT; break;
    case 'S': sorter.detach(); Serial.println("STOPPED"); return;
    default: return;
  }
  sorter.write(angle);
  delay(1200);
  sorter.write(HOME);
  delay(700);
  Serial.print("DONE:"); Serial.println(command);
}

void loop() {
  if (Serial.available()) {
    char command = Serial.read();
    while (Serial.available()) Serial.read();
    sortWaste(command);
  }
}
