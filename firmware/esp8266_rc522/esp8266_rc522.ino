/*
 * ==============================================================================
 * SMART RACK INVENTORY MANAGEMENT SYSTEM - ESP8266 + RC522 FIRMWARE
 * ==============================================================================
 * Hardware Target: ESP8266 NodeMCU / Wemos D1 Mini
 * RFID Reader: MFRC522 (13.56 MHz High-Frequency RFID)
 * Optional Peripherals: SSD1306 128x64 I2C OLED & Active Buzzer
 *
 * Wiring Table (NodeMCU to RC522):
 * -------------------------------------------------------------
 * RC522 Pin  | NodeMCU Pin | ESP8266 GPIO | Description
 * -------------------------------------------------------------
 * SDA (SS)   | D8          | GPIO 15      | SPI Chip Select
 * SCK        | D5          | GPIO 14      | SPI Clock
 * MOSI       | D7          | GPIO 13      | SPI Master Out Slave In
 * MISO       | D6          | GPIO 12      | SPI Master In Slave Out
 * IRQ        | Not Conn    | -            | Unused
 * GND        | GND         | GND          | Ground
 * RST        | D3          | GPIO 0       | Reset Pin
 * 3.3V       | 3V3         | 3.3V         | VCC (3.3V ONLY - DO NOT USE 5V)
 * -------------------------------------------------------------
 *
 * 4-Pin I2C LCD Wiring (PCF8574 Backpack to NodeMCU):
 * -------------------------------------------------------------
 * LCD Pin    | NodeMCU Pin | ESP8266 GPIO | Description
 * -------------------------------------------------------------
 * GND        | GND         | GND          | Ground
 * VCC        | VIN         | 5V (USB)     | 5V recommended for bright contrast (or 3V3)
 * SDA        | D2          | GPIO 4       | I2C Data
 * SCL        | D1          | GPIO 5       | I2C Clock
 * -------------------------------------------------------------
 *
 * Optional OLED Wiring (I2C fallback):
 * -------------------------------------------------------------
 * OLED SDA   | D2          | GPIO 4       | I2C Data
 * OLED SCL   | D1          | GPIO 5       | I2C Clock
 * OLED VCC   | 3V3         | 3.3V         | Power
 * OLED GND   | GND         | GND          | Ground
 * -------------------------------------------------------------
 *
 * Required Libraries (Install via Arduino Library Manager):
 * 1. MFRC522 by GithubCommunity (v1.4.10+)
 * 2. ArduinoJson by Benoit Blanchon (v6.21.0+)
 * 3. LiquidCrystal_I2C by Frank de Brabander or Marco Schwartz (for 4-pin LCD)
 * 4. Adafruit SSD1306 & Adafruit GFX (Optional, if OLED enabled)
 * ==============================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

#include "config.h"

#if ENABLE_LCD_DISPLAY
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
LiquidCrystal_I2C lcd(LCD_I2C_ADDRESS, LCD_COLUMNS, LCD_ROWS);
#elif ENABLE_OLED_DISPLAY
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
#endif

// Global Hardware Instances
MFRC522 mfrc522(RC522_SS_PIN, RC522_RST_PIN);
WiFiClient wifiClient;

// State tracking variables
unsigned long lastHeartbeatTime = 0;
unsigned long lastScanTime = 0;
String lastScannedUID = "";
bool isWiFiConnected = false;

// Function Prototypes
void connectWiFi();
void checkWiFiConnection();
void initRC522();
void initDisplay();
void showStandbyDisplay();
void showTagDisplay(String uid, String productName, int httpCode);
void showUnknownTagDisplay(String uid);
void showOfflineDisplay();
void showConnectionErrorDisplay(String uid, String errStr, int httpCode);
void showHttpErrorDisplay(String uid, int httpCode);
void showDebouncedDisplay(String uid);
void triggerBuzzerSuccess();
void triggerBuzzerAlert();
void sendHeartbeat();
bool sendRFIDScan(String uidNormalized, String uidSpaced);
String formatUIDSpaced(byte *buffer, byte bufferSize);
String formatUIDNormalized(byte *buffer, byte bufferSize);

// ==============================================================================
// SETUP ROUTINE
// ==============================================================================
void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println();
    Serial.println("==========================================");
    Serial.println("  SMART RACK IOT FIRMWARE (ESP8266-01)   ");
    Serial.println("  Target Rack: Rack " RACK_CODE);
    Serial.println("==========================================");

    // Initialize LED and Buzzer pins
#if ENABLE_BUZZER
    pinMode(PIN_BUZZER, OUTPUT);
    digitalWrite(PIN_BUZZER, LOW);
#endif

#if ENABLE_STATUS_LEDS
    pinMode(PIN_LED_GREEN, OUTPUT);
    digitalWrite(PIN_LED_GREEN, LOW);
#endif

    // Initialize Optional Display (I2C LCD or OLED)
#if ENABLE_LCD_DISPLAY || ENABLE_OLED_DISPLAY
    initDisplay();
#endif

    // Connect to Wi-Fi
    connectWiFi();

    // Initialize SPI and RC522 RFID Module
    initRC522();

    Serial.println(F("ESP8266-01 ready\n"));
    Serial.println(F("Waiting for RFID...\n"));

#if ENABLE_LCD_DISPLAY || ENABLE_OLED_DISPLAY
    showStandbyDisplay();
#endif

    // Send immediate initial heartbeat
    if (WiFi.status() == WL_CONNECTED) {
        sendHeartbeat();
    }
}

// ==============================================================================
// MAIN LOOP
// ==============================================================================
void loop() {
    // 1. Maintain Non-blocking Wi-Fi Connection
    checkWiFiConnection();

    // 2. Periodic Heartbeat Watchdog
    unsigned long currentMillis = millis();
    if (currentMillis - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeatTime = currentMillis;
        if (WiFi.status() == WL_CONNECTED) {
            sendHeartbeat();
        }
    }

    // 3. Check for New RFID Cards on RC522 Reader
    if (!mfrc522.PICC_IsNewCardPresent()) {
        return;
    }

    if (!mfrc522.PICC_ReadCardSerial()) {
        return;
    }

    // Extract RFID UID in normalized (E234A891) and spaced (E2 34 A8 91) formats
    String uidNormalized = formatUIDNormalized(mfrc522.uid.uidByte, mfrc522.uid.size);
    String uidSpaced = formatUIDSpaced(mfrc522.uid.uidByte, mfrc522.uid.size);

    // Local debounce filter: suppress repeated scans of the exact same tag within debounce interval
    if (uidNormalized == lastScannedUID && (currentMillis - lastScanTime < RFID_LOCAL_DEBOUNCE_MS)) {
        mfrc522.PICC_HaltA();
        mfrc522.PCD_StopCrypto1();
        return;
    }

    lastScannedUID = uidNormalized;
    lastScanTime = currentMillis;

    Serial.print(F("RFID detected: "));
    Serial.println(uidSpaced);

    // Send event to FastAPI backend
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println(F("Sending event..."));
        bool success = sendRFIDScan(uidNormalized, uidSpaced);
        if (success) {
            triggerBuzzerSuccess();
        } else {
            triggerBuzzerAlert();
        }
    } else {
        Serial.println(F("Wi-Fi offline. Event cached locally."));
        showOfflineDisplay();
        triggerBuzzerAlert();
    }

    Serial.println(F("\nWaiting for RFID...\n"));

    // Halt PICC to save power and prepare for next read
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
}

// ==============================================================================
// WI-FI MANAGER
// ==============================================================================
void connectWiFi() {
    Serial.print(F("Connecting to Wi-Fi..."));
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long startAttempt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < WIFI_TIMEOUT_MS) {
        delay(500);
        Serial.print(".");
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println(F("\nWi-Fi connected"));
        Serial.print(F("IP: "));
        Serial.println(WiFi.localIP());
        isWiFiConnected = true;
    } else {
        Serial.println(F("\nWi-Fi connection timed out. Will retry in background."));
        isWiFiConnected = false;
    }
}

void checkWiFiConnection() {
    if (WiFi.status() != WL_CONNECTED) {
        if (isWiFiConnected) {
            Serial.println(F("Wi-Fi disconnected"));
            Serial.println(F("Retrying..."));
            isWiFiConnected = false;
#if ENABLE_LCD_DISPLAY || ENABLE_OLED_DISPLAY
            showOfflineDisplay();
#endif
        }
        WiFi.reconnect();
    } else if (!isWiFiConnected) {
        Serial.println(F("Wi-Fi connected"));
        Serial.println(F("Synchronizing..."));
        Serial.print(F("IP: "));
        Serial.println(WiFi.localIP());
        isWiFiConnected = true;
#if ENABLE_LCD_DISPLAY || ENABLE_OLED_DISPLAY
        showStandbyDisplay();
#endif
        sendHeartbeat();
    }
}

// ==============================================================================
// HARDWARE INITIALIZATION
// ==============================================================================
void initRC522() {
    SPI.begin();
    mfrc522.PCD_Init();
    delay(50);
    byte version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
    if (version == 0x00 || version == 0xFF) {
        Serial.println(F("WARNING: RC522 reader communication check failed! Verify wiring."));
    } else {
        Serial.println(F("RC522 initialized"));
    }
}

#if ENABLE_LCD_DISPLAY
// ==============================================================================
// 4-PIN I2C LCD (16x2 / 20x4) IMPLEMENTATION
// ==============================================================================
void initDisplay() {
    Wire.begin(LCD_SDA_PIN, LCD_SCL_PIN);
    lcd.init();
    lcd.backlight();
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(F("SMART RACK IOT"));
    lcd.setCursor(0, 1);
    lcd.print(F("Booting ESP8266"));
    delay(1000);
}

void showStandbyDisplay() {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(F("Rack " RACK_CODE " READY"));
    lcd.setCursor(0, 1);
    lcd.print(F("Scan RFID Tag..."));
}

void showTagDisplay(String uid, String productName, int httpCode) {
    lcd.clear();
    lcd.setCursor(0, 0);
    String top = "UID:" + uid;
    lcd.print(top.substring(0, LCD_COLUMNS));
    lcd.setCursor(0, 1);
    if (productName.length() > 0) {
        lcd.print(productName.substring(0, LCD_COLUMNS));
    } else {
        lcd.print("OK (HTTP " + String(httpCode) + ")");
    }
}

void showUnknownTagDisplay(String uid) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(F("! UNKNOWN TAG !"));
    lcd.setCursor(0, 1);
    lcd.print(uid.substring(0, LCD_COLUMNS));
}

void showOfflineDisplay() {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(F("! WIFI OFFLINE !"));
    lcd.setCursor(0, 1);
    lcd.print(F("Reconnecting..."));
}

void showConnectionErrorDisplay(String uid, String errStr, int httpCode) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(F("! CONN FAILED !"));
    lcd.setCursor(0, 1);
    lcd.print("Err: " + String(httpCode));
}

void showHttpErrorDisplay(String uid, int httpCode) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("ERR HTTP: " + String(httpCode));
    lcd.setCursor(0, 1);
    if (httpCode == 401) {
        lcd.print(F("Bad Device Key"));
    } else if (httpCode == 404) {
        lcd.print(F("404 Not Found"));
    } else if (httpCode == 422) {
        lcd.print(F("Invalid JSON"));
    } else {
        lcd.print(F("Request Denied"));
    }
}

void showDebouncedDisplay(String uid) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(F("TAG DEBOUNCED"));
    lcd.setCursor(0, 1);
    lcd.print(uid.substring(0, LCD_COLUMNS));
}

#elif ENABLE_OLED_DISPLAY
void initDisplay() {
    Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);
    if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDRESS)) {
        Serial.println(F("OLED SSD1306 allocation failed. Proceeding headless."));
    } else {
        display.clearDisplay();
        display.setTextColor(WHITE);
        display.setTextSize(1);
        display.setCursor(10, 15);
        display.println(F("SMART RACK SYSTEM"));
        display.setCursor(10, 35);
        display.println(F("Booting ESP8266..."));
        display.display();
        delay(1000);
    }
}

void showStandbyDisplay() {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(WHITE);
    display.setCursor(0, 0);
    display.println(F("SMART RACK SYSTEM"));
    display.drawLine(0, 10, 128, 10, WHITE);
    display.setCursor(0, 16);
    display.print(F("Rack: "));
    display.println(RACK_CODE);
    display.setCursor(0, 28);
    display.print(F("IP: "));
    display.println(WiFi.localIP());
    display.setCursor(0, 42);
    display.println(F("STATUS: READY"));
    display.setCursor(0, 54);
    display.println(F("Scan RFID Tag..."));
    display.display();
}

void showTagDisplay(String uid, String productName, int httpCode) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(WHITE);
    display.setCursor(0, 0);
    display.println(F("RFID DETECTED"));
    display.drawLine(0, 10, 128, 10, WHITE);
    display.setCursor(0, 16);
    display.print(F("UID: "));
    display.println(uid);
    display.setCursor(0, 28);
    display.print(F("Prod: "));
    display.println(productName.length() > 0 ? productName.substring(0, 12) : F("Recognized"));
    display.setCursor(0, 42);
    display.print(F("Rack: "));
    display.println(RACK_CODE);
    display.setCursor(0, 54);
    display.print(F("HTTP: "));
    display.println(httpCode);
    display.display();
}

void showUnknownTagDisplay(String uid) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(WHITE);
    display.setCursor(0, 0);
    display.println(F("! UNKNOWN RFID !"));
    display.drawLine(0, 10, 128, 10, WHITE);
    display.setCursor(0, 18);
    display.println(F("Tag not registered:"));
    display.setCursor(0, 32);
    display.setTextSize(1);
    display.println(uid);
    display.setCursor(0, 48);
    display.println(F("Alert logged."));
    display.display();
}

void showOfflineDisplay() {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(WHITE);
    display.setCursor(0, 0);
    display.println(F("! WIFI OFFLINE !"));
    display.drawLine(0, 10, 128, 10, WHITE);
    display.setCursor(0, 24);
    display.println(F("RECONNECTING..."));
    display.setCursor(0, 44);
    display.print(F("Rack: "));
    display.println(RACK_CODE);
    display.display();
}

void showConnectionErrorDisplay(String uid, String errStr, int httpCode) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(WHITE);
    display.setCursor(0, 0);
    display.println(F("! CONN FAILED !"));
    display.drawLine(0, 10, 128, 10, WHITE);
    display.setCursor(0, 14);
    display.print(F("Host: "));
    display.println(API_SERVER_HOST);
    display.setCursor(0, 26);
    display.print(F("Port: "));
    display.println(API_SERVER_PORT);
    display.setCursor(0, 38);
    display.print(F("Err: "));
    display.println(errStr.length() > 14 ? errStr.substring(0, 14) : errStr);
    display.setCursor(0, 50);
    display.print(F("Code: "));
    display.println(httpCode);
    display.display();
}

void showHttpErrorDisplay(String uid, int httpCode) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(WHITE);
    display.setCursor(0, 0);
    display.println(F("! HTTP ERROR !"));
    display.drawLine(0, 10, 128, 10, WHITE);
    display.setCursor(0, 14);
    display.print(F("UID: "));
    display.println(uid);
    display.setCursor(0, 26);
    display.print(F("Status: "));
    display.println(httpCode);
    display.setCursor(0, 40);
    if (httpCode == 401) {
        display.println(F("Bad X-Device-API-Key"));
    } else if (httpCode == 404) {
        display.println(F("404 Route Not Found"));
    } else if (httpCode == 400 || httpCode == 422) {
        display.println(F("Invalid JSON payload"));
    } else if (httpCode >= 500) {
        display.println(F("Backend 500 Error"));
    } else {
        display.println(F("Request Rejected"));
    }
    display.display();
}

void showDebouncedDisplay(String uid) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(WHITE);
    display.setCursor(0, 0);
    display.println(F("TAG DEBOUNCED"));
    display.drawLine(0, 10, 128, 10, WHITE);
    display.setCursor(0, 16);
    display.print(F("UID: "));
    display.println(uid);
    display.setCursor(0, 30);
    display.println(F("Status: Debounced"));
    display.setCursor(0, 44);
    display.println(F("Duplicate scan cached"));
    display.display();
}
#else
void initDisplay() {}
void showStandbyDisplay() {}
void showTagDisplay(String uid, String productName, int httpCode) {}
void showUnknownTagDisplay(String uid) {}
void showOfflineDisplay() {}
void showConnectionErrorDisplay(String uid, String errStr, int httpCode) {}
void showHttpErrorDisplay(String uid, int httpCode) {}
void showDebouncedDisplay(String uid) {}
#endif

// ==============================================================================
// AUDIO & VISUAL FEEDBACK
// ==============================================================================
void triggerBuzzerSuccess() {
#if ENABLE_STATUS_LEDS
    digitalWrite(PIN_LED_GREEN, HIGH);
#endif
#if ENABLE_BUZZER
    digitalWrite(PIN_BUZZER, HIGH);
    delay(100);
    digitalWrite(PIN_BUZZER, LOW);
#endif
#if ENABLE_STATUS_LEDS
    delay(100);
    digitalWrite(PIN_LED_GREEN, LOW);
#endif
}

void triggerBuzzerAlert() {
#if ENABLE_STATUS_LEDS
    digitalWrite(PIN_LED_RED, HIGH);
#endif
#if ENABLE_BUZZER
    // Double beep for alerts / unregistered tags
    digitalWrite(PIN_BUZZER, HIGH);
    delay(120);
    digitalWrite(PIN_BUZZER, LOW);
    delay(80);
    digitalWrite(PIN_BUZZER, HIGH);
    delay(120);
    digitalWrite(PIN_BUZZER, LOW);
#endif
#if ENABLE_STATUS_LEDS
    digitalWrite(PIN_LED_RED, LOW);
#endif
}

// ==============================================================================
// REST API CLIENT IMPLEMENTATION
// ==============================================================================
bool sendRFIDScan(String uidNormalized, String uidSpaced) {
    HTTPClient http;
    String url = "http://" + String(API_SERVER_HOST) + ":" + String(API_SERVER_PORT) + String(API_RFID_ENDPOINT);

    http.begin(wifiClient, url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-API-Key", DEVICE_API_KEY);

    // Build JSON Payload
    StaticJsonDocument<256> doc;
    doc["device_id"] = DEVICE_ID;
    doc["reader_id"] = READER_ID;
    doc["rfid_uid"] = uidNormalized;
    doc["source"] = DEVICE_ID;

    String requestBody;
    serializeJson(doc, requestBody);

    int httpCode = http.POST(requestBody);
    Serial.print(F("HTTP Status: "));
    Serial.println(httpCode);

    bool isSuccess = false;
    if (httpCode == 200 || httpCode == 201) {
        String responsePayload = http.getString();
        Serial.print(F("Response Body (preview): "));
        Serial.println(responsePayload.length() > 100 ? responsePayload.substring(0, 100) + "..." : responsePayload);

        StaticJsonDocument<512> respDoc;
        DeserializationError error = deserializeJson(respDoc, responsePayload);

        if (!error && respDoc.containsKey("status") && respDoc["status"] == "ignored_debounce") {
            Serial.println(F("[RESULT: DEBOUNCED] Duplicate RFID scan suppressed by server."));
            showDebouncedDisplay(uidSpaced);
            isSuccess = true;
        } else {
            String prodName = "";
            if (!error && respDoc.containsKey("product_name") && !respDoc["product_name"].isNull()) {
                prodName = respDoc["product_name"].as<String>();
            }

            String eventType = "";
            if (!error && respDoc.containsKey("event_type")) {
                eventType = respDoc["event_type"].as<String>();
            }

            if (eventType == "UNKNOWN") {
                Serial.println(F("[RESULT: UNKNOWN TAG] RFID UID not registered to any catalog product."));
                showUnknownTagDisplay(uidSpaced);
            } else {
                Serial.print(F("[RESULT: SUCCESS] Recognized Product: "));
                Serial.println(prodName.length() > 0 ? prodName : F("Registered SKU"));
                showTagDisplay(uidSpaced, prodName, httpCode);
            }
            isSuccess = true;
        }
    } else if (httpCode < 0) {
        String errStr = http.errorToString(httpCode);
        Serial.println(F("--------------------------------------------------"));
        Serial.print(F("[ERROR: CONNECTION FAILURE] Code: "));
        Serial.print(httpCode);
        Serial.print(F(" ("));
        Serial.print(errStr);
        Serial.println(F(")"));
        Serial.print(F("Target URL: "));
        Serial.println(url);
        Serial.println(F("Check if backend is running and ESP8266 is on same Wi-Fi subnet."));
        Serial.println(F("--------------------------------------------------"));
        showConnectionErrorDisplay(uidSpaced, errStr, httpCode);
    } else {
        String responsePayload = http.getString();
        Serial.println(F("--------------------------------------------------"));
        if (httpCode == 401) {
            Serial.println(F("[ERROR: AUTHENTICATION FAILED (401)] X-Device-API-Key was rejected."));
        } else if (httpCode == 400 || httpCode == 422) {
            Serial.println(F("[ERROR: INVALID PAYLOAD (400/422)] JSON schema validation error."));
        } else if (httpCode == 404) {
            Serial.println(F("[ERROR: ROUTE NOT FOUND (404)] Endpoint path does not exist on server."));
        } else if (httpCode >= 500) {
            Serial.println(F("[ERROR: SERVER INTERNAL ERROR (500)] Backend unhandled exception."));
        } else {
            Serial.print(F("[ERROR: HTTP "));
            Serial.print(httpCode);
            Serial.println(F("] Request was not accepted by backend."));
        }
        Serial.print(F("Response Body (preview): "));
        Serial.println(responsePayload.length() > 100 ? responsePayload.substring(0, 100) + "..." : responsePayload);
        Serial.println(F("--------------------------------------------------"));
        showHttpErrorDisplay(uidSpaced, httpCode);
    }

    http.end();
    return isSuccess;
}

void sendHeartbeat() {
    HTTPClient http;
    String url = "http://" + String(API_SERVER_HOST) + ":" + String(API_SERVER_PORT) + String(API_HEARTBEAT_ENDPOINT);

    http.begin(wifiClient, url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-API-Key", DEVICE_API_KEY);

    StaticJsonDocument<256> doc;
    doc["device_id"] = DEVICE_ID;
    doc["reader_id"] = READER_ID;
    doc["ip_address"] = WiFi.localIP().toString();
    doc["firmware_version"] = "1.0.0";
    doc["uptime_seconds"] = millis() / 1000;

    String requestBody;
    serializeJson(doc, requestBody);

    int httpCode = http.POST(requestBody);
    if (httpCode == 200) {
        Serial.println(F("[HEARTBEAT] OK (200) - Device marked ONLINE"));
    } else if (httpCode < 0) {
        Serial.print(F("[HEARTBEAT] Connection failed, Code: "));
        Serial.print(httpCode);
        Serial.print(F(" ("));
        Serial.print(http.errorToString(httpCode));
        Serial.println(F(")"));
    } else {
        Serial.print(F("[HEARTBEAT] Server returned HTTP "));
        Serial.println(httpCode);
        String responsePayload = http.getString();
        if (responsePayload.length() > 0) {
            Serial.print(F("[HEARTBEAT] Response: "));
            Serial.println(responsePayload.length() > 80 ? responsePayload.substring(0, 80) + "..." : responsePayload);
        }
    }
    http.end();
}

// ==============================================================================
// RFID FORMATTING HELPERS
// ==============================================================================
String formatUIDSpaced(byte *buffer, byte bufferSize) {
    String uidString = "";
    for (byte i = 0; i < bufferSize; i++) {
        if (buffer[i] < 0x10) {
            uidString += "0";
        }
        uidString += String(buffer[i], HEX);
        if (i < bufferSize - 1) {
            uidString += " ";
        }
    }
    uidString.toUpperCase();
    return uidString;
}

String formatUIDNormalized(byte *buffer, byte bufferSize) {
    String uidString = "";
    for (byte i = 0; i < bufferSize; i++) {
        if (buffer[i] < 0x10) {
            uidString += "0";
        }
        uidString += String(buffer[i], HEX);
    }
    uidString.toUpperCase();
    return uidString;
}
