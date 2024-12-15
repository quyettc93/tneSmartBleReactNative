//
import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";

const scanAddConnect = () => {
  const [manager] = useState(new BleManager());
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [log, setLog] = useState("");
  const [set, setSet] = useState("");

  const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
  const TARGET_DEVICE_NAME = "ESP32 QUYET";
  const TARGET_DEVICE_ID = "F0:24:F9:43:45:6E";

  const addLog = (message) => setLog((prev) => `${prev}\n${message}`);

  const connectToESP32 = () => {
    addLog("Starting scan...");
    manager.startDeviceScan(null, null, async (error, device) => {
      if (error) {
        addLog(`Scan error: ${error.message}`);
        return;
      }

      // Kiểm tra tên, ID, và khả năng kết nối của thiết bị
      ////phải dùng device ỏ scan thi moi gui di du lieu dc
      if (
        device.localName === TARGET_DEVICE_NAME &&
        device.id === TARGET_DEVICE_ID &&
        device.isConnectable
      ) {
        addLog(`Found device: ${device.name} (${device.id}). Connecting...`);
        console.log(device);
        setConnectedDevice(device);
        manager.stopDeviceScan();

        try {
          const connectedDevice1 = await manager.connectToDevice(device.id);
          await connectedDevice1.discoverAllServicesAndCharacteristics();
          console.log("Connected to device!");
        } catch (err) {
          console.log(err);
        }
      }
    });
  };

  const sendData = async () => {
    if (!connectedDevice) {
      addLog("No device connected!");
      return;
    }
    if (connectedDevice.isConnected()) {
      console.log("connected");
    }
    try {
      const message = "H";
      const encodedMessage = Buffer.from(message, "utf-8").toString("base64");
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        encodedMessage
      );
      console.log(`Message sent: ${message}`);
    } catch (error) {
      console.log(`Error sending message: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BLE ESP32 Test App</Text>
      <Button title="Connect to ESP32" onPress={connectToESP32} />
      {connectedDevice && (
        <Button title="Send Data to ESP32" onPress={sendData} />
      )}
      <Text style={styles.log}>{log}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  log: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 5,
    fontSize: 14,
    maxHeight: 200,
    overflow: "scroll",
    width: "100%",
  },
});

export default App;
