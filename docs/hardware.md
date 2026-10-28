# ESP8266 + RC522 Hardware Wiring & Pin Configuration

This guide provides the complete hardware wiring table, voltage specifications, and peripheral setup for deploying the physical Smart Rack IoT Gateway.

---

## 1. NodeMCU ESP8266 to RC522 RFID Pinout Table

> [!CAUTION]
> **Voltage Warning:** The RC522 RFID reader module operates at **3.3V DC**. **DO NOT connect the RC522 VCC pin to 5V (VIN / USB)**, as this will permanently damage the RC522 IC. Always connect VCC to the **3V3** pin of the NodeMCU.

| RC522 Pin Name | NodeMCU Board Label | ESP8266 GPIO Number | SPI / Bus Function | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **VCC (3.3V)** | `3V3` | 3.3V Power Rail | Power Supply | **3.3V ONLY** (Max 3.6V) |
| **RST (Reset)** | `D3` | `GPIO 0` | Hardware Reset | Configured in `config.h` |
| **GND (Ground)**| `GND` | Ground | Common Ground | Connect to common ground |
| **IRQ (Interrupt)**| *Unconnected* | - | Interrupt Request | Not required for polling |
| **MISO (Master In)**| `D6` | `GPIO 12` | SPI MISO | Hardware SPI Bus |
| **MOSI (Master Out)**| `D7` | `GPIO 13` | SPI MOSI | Hardware SPI Bus |
| **SCK (Clock)** | `D5` | `GPIO 14` | SPI Clock | Hardware SPI Bus |
| **SDA / SS (Chip Select)**| `D8` | `GPIO 15` | SPI Slave Select | Configured in `config.h` |

---

## 2. Optional OLED Display Wiring (SSD1306 128×64 I2C)

The firmware includes built-in support for an I2C 0.96" SSD1306 OLED display to provide instant on-rack status feedback:

| OLED Pin Name | NodeMCU Board Label | ESP8266 GPIO Number | I2C Function | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **VCC** | `3V3` | 3.3V Power Rail | Power Supply | 3.3V Power |
| **GND** | `GND` | Ground | Ground | Common Ground |
| **SCL** | `D1` | `GPIO 5` | I2C Clock | Software Wire SCL |
| **SDA** | `D2` | `GPIO 4` | I2C Data | Software Wire SDA |

---

## 3. Optional Audio & Visual Indicators

| Peripheral | NodeMCU Board Label | ESP8266 GPIO Number | Behavioral Signal |
| :--- | :--- | :--- | :--- |
| **Active 5V/3.3V Buzzer** | `D4` | `GPIO 2` | Short beep (100ms) on valid scan; Double beep (2× 120ms) on unknown tag / offline error |
| **Green Status LED** | `D0` | `GPIO 16` | Flashes during successful scan & heartbeat transmission |
| **Red Alert LED** | `D4` | `GPIO 2` | Flashes on unassigned RFID tag or Wi-Fi disconnection |

---

## 4. Hardware Assembly & Connection Diagram

```text
               +-----------------------------+
               |      NodeMCU ESP8266        |
               |                             |
               |  [3V3] ------------------+  |
               |  [GND] ---------------+  |  |
               |  [D3 / GPIO 0] -----+ |  |  |
               |  [D5 / GPIO 14] --+ | |  |  |
               |  [D6 / GPIO 12] + | | |  |  |
               |  [D7 / GPIO 13] | | | |  |  |
               |  [D8 / GPIO 15] | | | |  |  |
               +-----------------|-|-|-|-|-|--+
                                 | | | | | |
     +---------------------------+ | | | | |
     |   +-------------------------+ | | | |
     |   |   +-----------------------+ | | |
     |   |   |   +---------------------+ | |
     |   |   |   |   +-------------------+ |
     |   |   |   |   |   +-----------------+
     |   |   |   |   |   |
     V   V   V   V   V   V
   [SDA SCK MOSI MISO RST 3V3 GND]
   +-----------------------------+
   |      RC522 RFID Reader      |
   |   (13.56 MHz RFID Sensor)   |
   +-----------------------------+
```

---

## 5. Firmware Flashing Instructions

1. Open the Arduino IDE (v2.0+ recommended).
2. Install the ESP8266 Board Package:
   - File -> Preferences -> Additional Boards Manager URLs:
     `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
   - Tools -> Board -> Boards Manager -> Install **esp8266 by ESP8266 Community**.
3. Install required libraries via Library Manager:
   - `MFRC522` by GithubCommunity
   - `ArduinoJson` by Benoit Blanchon (v6.x)
   - `Adafruit SSD1306` and `Adafruit GFX` (if OLED is used)
4. Open `firmware/esp8266_rc522/esp8266_rc522.ino`.
5. Edit `config.h` with your Wi-Fi SSID, Password, and FastAPI backend host IP.
6. Select **NodeMCU 1.0 (ESP-12E Module)**, set Upload Speed to **115200**, and click **Upload**.

---

## 6. Hardware Troubleshooting

- **Symptom: RC522 not detecting cards**
  - Verify 3.3V power rail with a multimeter (must be between 3.0V and 3.4V).
  - Verify that `D8 (GPIO 15)` is securely connected to RC522 `SDA/SS`.
  - Check Serial Monitor output at 115200 baud for `"RC522 initialized"`. If it outputs `"WARNING: RC522 communication failed"`, check SPI header soldering.
- **Symptom: Wi-Fi Reconnecting continuously**
  - NodeMCU Wi-Fi requires adequate power supply during transmission bursts (peak ~250mA). Ensure the USB cable or 5V power supply provides at least 500mA.
