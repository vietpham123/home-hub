# Smarthouse

A React Native smart home management app with a local Tuya/Gosund MQTT bridge for controlling devices without cloud dependency.

![React Native](https://img.shields.io/badge/React%20Native-Expo%20SDK%2054-blue)
![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android%20%7C%20Web-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- **Dashboard** — Overview of all devices, sensors, and quick stats
- **Room Management** — Organize devices by room with per-room controls
- **Device Control** — Lights (brightness, color), thermostats, locks, cameras, blinds, sensors
- **Gosund / Tuya Integration** — Connect Gosund smart bulbs via Tuya Cloud API
- **Local MQTT Bridge** — Control devices locally over your network without cloud dependency
- **Real-time Updates** — Live device state via WebSocket MQTT connection
- **Dark Theme** — Purpose-built dark UI for smart home control

### Supported Devices

| Type | Features |
|------|----------|
| Lights | On/off, brightness, color temperature, HSV color |
| Thermostat | Current/target temperature, mode (heat/cool/auto/off) |
| Door Locks | Lock/unlock |
| Cameras | Recording toggle, live preview placeholder |
| Blinds | Position slider, presets (closed/25%/50%/75%/open) |
| Sensors | Temperature, humidity, motion detection |

## Architecture

```
┌──────────────┐       WebSocket (9001)      ┌──────────────────┐
│  Smarthouse  │◄──────────────────────────►  │  MQTT Broker     │
│  Mobile App  │                              │  (Mosquitto)     │
└──────────────┘                              └────────┬─────────┘
                                                       │ MQTT (1883)
                                              ┌────────┴─────────┐
                                              │  Tuya-MQTT       │
                                              │  Bridge (Node.js)│
                                              └────────┬─────────┘
                                                       │ LAN (TCP 6668)
                                    ┌──────────────────┼──────────────────┐
                                    │                  │                  │
                              ┌─────┴─────┐    ┌──────┴────┐    ┌───────┴───────┐
                              │ Gosund    │    │ Gosund    │    │ Gosund        │
                              │ Bulb #1   │    │ Bulb #2   │    │ Smart Plug    │
                              └───────────┘    └───────────┘    └───────────────┘
```

## Project Structure

```
Smarthouse/
├── App.tsx                         # App entry point
├── index.ts                        # Expo root component registration
├── app.json                        # Expo configuration
├── package.json
├── tsconfig.json
├── src/
│   ├── components/
│   │   ├── DeviceCard.tsx          # Device tile with status & toggle
│   │   ├── RoomCard.tsx            # Room summary card
│   │   └── SensorWidget.tsx        # Sensor reading display
│   ├── data/
│   │   └── mockData.ts            # Mock devices for 5 rooms
│   ├── hooks/
│   │   └── useMqtt.ts             # React hooks for MQTT state & commands
│   ├── navigation/
│   │   └── AppNavigator.tsx        # Tab + stack navigation
│   ├── screens/
│   │   ├── DashboardScreen.tsx     # Home overview
│   │   ├── RoomsScreen.tsx         # Room list
│   │   ├── RoomDetailScreen.tsx    # Devices in a room
│   │   ├── DeviceDetailScreen.tsx  # Per-device controls
│   │   ├── SettingsScreen.tsx      # App settings
│   │   ├── GosundSetupScreen.tsx   # Tuya API credentials
│   │   ├── GosundDiscoveryScreen.tsx # Discover Gosund devices
│   │   └── MqttConfigScreen.tsx    # MQTT broker configuration
│   ├── services/
│   │   ├── mqttService.ts          # WebSocket MQTT 3.1.1 client
│   │   └── gosundService.ts        # Tuya Cloud API client
│   ├── theme/
│   │   └── index.ts                # Colors, spacing, typography
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   └── utils/
│       └── crypto.ts               # HMAC-SHA256 for Tuya auth
└── bridge/
    ├── bridge.js                   # Tuya-MQTT bridge server
    ├── config.example.json         # Example bridge configuration
    └── package.json
```

## Prerequisites

- **Node.js** 20+
- **npm** 9+
- **Expo CLI** (installed automatically via npx)
- **Ubuntu server** (for MQTT broker + bridge) — 22.04 LTS or newer recommended

## Quick Start (Development)

```bash
git clone <repo-url>
cd Smarthouse

# Install dependencies
npm install

# Start the dev server
npx expo start

# Open in:
#   Browser → press 'w'
#   iOS Simulator → press 'i'
#   Expo Go on phone → scan QR code
```

---

## Ubuntu Server Deployment

This section covers setting up the MQTT broker and Tuya bridge on an Ubuntu server.

### 1. System Setup

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Mosquitto MQTT Broker

```bash
sudo apt install -y mosquitto mosquitto-clients
```

Create the Smarthouse configuration:

```bash
sudo tee /etc/mosquitto/conf.d/smarthouse.conf << 'EOF'
# Standard MQTT — used by the bridge
listener 1883

# WebSocket — used by the mobile app
listener 9001
protocol websockets

# Authentication (recommended for production)
# password_file /etc/mosquitto/passwd
# allow_anonymous false
EOF
```

Start and enable the broker:

```bash
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto
```

Verify it's running:

```bash
sudo systemctl status mosquitto

# Quick test (run in two terminals):
mosquitto_sub -t "smarthouse/test" &
mosquitto_pub -t "smarthouse/test" -m '{"status":"ok"}'
```

### 3. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x
```

### 4. Get Gosund Device Keys

Each Gosund device has a **Device ID** and a **Local Key** needed for local control. Extract them using `tinytuya`:

```bash
sudo apt install -y python3-pip
pip3 install tinytuya

python3 -m tinytuya wizard
```

The wizard will:
1. Ask for your Tuya IoT developer credentials (from [iot.tuya.com](https://iot.tuya.com))
2. Scan your network for Tuya-compatible devices
3. Output a `devices.json` file with IDs, keys, and IPs

> **First time with Tuya IoT?**
> 1. Create an account at [iot.tuya.com](https://iot.tuya.com)
> 2. Create a Cloud Project → select "Smart Home" → your region
> 3. Go to **Devices** → **Link Tuya App Account** → scan the QR code with the Gosund/Smart Life app
> 4. Under **API Explorer**, authorize the IoT Core API group

### 5. Configure the Bridge

```bash
cd ~/
git clone <repo-url> smarthouse
cd smarthouse/bridge

npm install

cp config.example.json config.json
nano config.json
```

Edit `config.json` with your device details:

```json
{
  "mqtt": {
    "host": "127.0.0.1",
    "port": 1883,
    "username": "",
    "password": ""
  },
  "devices": [
    {
      "id": "gosund-bulb-living",
      "name": "Living Room Bulb",
      "type": "light",
      "tuyaId": "abcdef1234567890",
      "tuyaKey": "0123456789abcdef",
      "ip": "192.168.1.50",
      "version": "3.3",
      "roomId": "living-room"
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `id` | Your internal device ID (used in MQTT topics) |
| `name` | Friendly name |
| `type` | `light` or `plug` |
| `tuyaId` | Device ID from tinytuya |
| `tuyaKey` | Local key from tinytuya |
| `ip` | Device's LAN IP (optional — will auto-discover if empty) |
| `version` | Tuya protocol version, usually `3.3` |
| `roomId` | Matches a room ID in the app |

Test the bridge:

```bash
node bridge.js --verbose
```

You should see:
```
[2026-04-02T...] Connecting to MQTT broker at mqtt://127.0.0.1:1883...
[2026-04-02T...] Connected to MQTT broker
[2026-04-02T...] Device connected: Living Room Bulb (gosund-bulb-living)
```

### 6. Run as a Systemd Service

```bash
sudo tee /etc/systemd/system/smarthouse-bridge.service << EOF
[Unit]
Description=Smarthouse Tuya-MQTT Bridge
After=network.target mosquitto.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/smarthouse/bridge
ExecStart=/usr/bin/node bridge.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable smarthouse-bridge
sudo systemctl start smarthouse-bridge
```

Check it's running:

```bash
sudo systemctl status smarthouse-bridge

# Follow logs
journalctl -u smarthouse-bridge -f
```

### 7. Firewall Configuration

```bash
sudo ufw allow 1883/tcp comment "MQTT"
sudo ufw allow 9001/tcp comment "MQTT WebSocket"
sudo ufw enable
```

### 8. Enable MQTT Authentication (Recommended)

```bash
# Create a password file
sudo mosquitto_passwd -c /etc/mosquitto/passwd smarthouse
# Enter a password when prompted

# Enable auth in Mosquitto
sudo sed -i 's/^# password_file/password_file/' /etc/mosquitto/conf.d/smarthouse.conf
sudo sed -i 's/^# allow_anonymous/allow_anonymous/' /etc/mosquitto/conf.d/smarthouse.conf

sudo systemctl restart mosquitto
```

Update the bridge config with the credentials:

```bash
nano ~/smarthouse/bridge/config.json
# Set "username": "smarthouse" and "password": "your-password"

sudo systemctl restart smarthouse-bridge
```

Then enter the same credentials in the app under **Settings → MQTT Broker**.

---

## Connect the App

1. Open the Smarthouse app
2. Go to **Settings → MQTT Broker**
3. Enter:
   - **Host**: your Ubuntu server's IP (e.g. `192.168.1.100`)
   - **WebSocket Port**: `9001`
   - **Username/Password** (if auth is enabled)
4. Tap **Connect**

The connection status banner shows green when connected. Device controls will now send commands through the MQTT bridge to your Gosund devices.

## MQTT Topic Reference

| Topic | Direction | Payload |
|-------|-----------|---------|
| `smarthouse/{deviceId}/state` | Bridge → App | `{"isOn":true,"brightness":80,"timestamp":...}` |
| `smarthouse/{deviceId}/command` | App → Bridge | `{"isOn":false}` or `{"brightness":50}` |
| `smarthouse/{deviceId}/status` | Bridge → App | `{"online":true,"timestamp":...}` |
| `smarthouse/bridge/status` | Bridge → App | `{"online":true,"devices":3,"timestamp":...}` |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Bridge can't find devices | Ensure devices are on the same subnet. Try setting `ip` explicitly in config.json |
| `invalid key` error | Re-run `tinytuya wizard` — local keys change when devices are re-paired |
| App can't connect to broker | Check firewall allows port 9001. Verify WebSocket listener in mosquitto.conf |
| Device shows offline | Check the device has power and is connected to WiFi. Try restarting the bridge |
| Bridge disconnects repeatedly | Device firmware may have updated protocol version — try changing `version` to `3.4` |

## License

MIT
