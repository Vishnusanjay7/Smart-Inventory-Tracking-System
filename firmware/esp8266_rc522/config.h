#ifndef CONFIG_H
#define CONFIG_H

// ==============================================================================
// SMART RACK IOT FIRMWARE CONFIGURATION (ESP8266 + RC522)
// ==============================================================================

// 1. Wi-Fi Configuration
#define WIFI_SSID "siriiiiiii"   // Wi-Fi SSID
#define WIFI_PASSWORD "qwerty12" // Wi-Fi Password
#define WIFI_TIMEOUT_MS 15000    // Connection timeout before non-blocking retry

// 2. Smart Rack API Server Configuration
#define API_SERVER_HOST "10.251.126.192" // PC IP verified on current Wi-Fi (pingable)
#define API_SERVER_PORT 8000 // Port of FastAPI server (default: 8000)
#define API_RFID_ENDPOINT                                                      \
  "/api/v1/iot/rfid" // REST endpoint for RFID scan events
#define API_HEARTBEAT_ENDPOINT                                                 \
  "/api/v1/iot/heartbeat" // REST endpoint for periodic heartbeat

// 3. Device Identification & Security Key
#define DEVICE_ID "ESP8266-01" // Unique identifier for this ESP8266 unit
#define READER_ID "RC522-01"   // Unique identifier for the mounted RC522 reader
#define RACK_CODE "A1"         // Physical Rack location (Rack A1)
#define DEVICE_API_KEY                                                         \
  "SR-IOT-DEVICE-KEY-98421-ESP8266-A1" // Must match backend DEVICE_API_KEY

// 4. Timing & Debounce Settings
#define HEARTBEAT_INTERVAL_MS 30000 // Send heartbeat every 30 seconds
#define RFID_LOCAL_DEBOUNCE_MS 2500 // Ignore same tag within 2.5s locally

// 5. Hardware Pin Mapping (NodeMCU ESP8266)
// ------------------------------------------------------------------------------
// RC522 SPI Pins:
// RC522 SDA (SS)   -> NodeMCU D8 (GPIO 15)
// RC522 SCK        -> NodeMCU D5 (GPIO 14)
// RC522 MOSI       -> NodeMCU D7 (GPIO 13)
// RC522 MISO       -> NodeMCU D6 (GPIO 12)
// RC522 RST        -> NodeMCU D3 (GPIO 0)
// RC522 3.3V       -> NodeMCU 3V3 (DO NOT CONNECT TO 5V!)
// RC522 GND        -> NodeMCU GND
#define RC522_SS_PIN 15 // NodeMCU D8 / GPIO 15
#define RC522_RST_PIN 0 // NodeMCU D3 / GPIO 0

// 6. Optional Peripherals (Enabled = 1, Disabled = 0)
#define ENABLE_LCD_DISPLAY 1  // 1 = Enable 16x2 / 20x4 I2C LCD (4 pins: GND, VCC, SDA, SCL)
#define ENABLE_OLED_DISPLAY 0 // 1 = Enable SSD1306 128x64 I2C OLED, 0 = Disable
#define ENABLE_BUZZER 0       // 1 = Enable Piezo Buzzer, 0 = Disable
#define ENABLE_STATUS_LEDS 0  // 1 = Enable Green/Red status LEDs, 0 = Disable

// 7. 4-Pin I2C LCD Configuration (if ENABLE_LCD_DISPLAY is 1)
// Wiring:
// LCD GND -> NodeMCU GND
// LCD VCC -> NodeMCU VIN (5V from USB power for bright text contrast)
// LCD SDA -> NodeMCU D2 (GPIO 4)
// LCD SCL -> NodeMCU D1 (GPIO 5)
#define LCD_SDA_PIN 4        // NodeMCU D2 / GPIO 4
#define LCD_SCL_PIN 5        // NodeMCU D1 / GPIO 5
#define LCD_I2C_ADDRESS 0x27 // Typically 0x27 or 0x3F (PCF8574 I2C backpack)
#define LCD_COLUMNS 16       // 16 columns
#define LCD_ROWS 2          // 2 rows

// OLED I2C Pins (if ENABLE_OLED_DISPLAY is 1)
#define OLED_SDA_PIN 4        // NodeMCU D2 / GPIO 4
#define OLED_SCL_PIN 5        // NodeMCU D1 / GPIO 5
#define OLED_I2C_ADDRESS 0x3C // Typical SSD1306 I2C address

// Buzzer & LED Pins
#define PIN_BUZZER 2     // NodeMCU D4 / GPIO 2 (Active Buzzer or onboard LED)
#define PIN_LED_GREEN 16 // NodeMCU D0 / GPIO 16 (Green status LED)
#define PIN_LED_RED 2    // NodeMCU D4 / GPIO 2 (Red status LED / Alert)

#endif // CONFIG_H
