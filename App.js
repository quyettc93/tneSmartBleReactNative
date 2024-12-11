import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";
import { View, Text, Button } from "react-native";
import { useState } from "react";

export default function App() {
  const [device, setDevice] = useState(null);
  const [macId, setMacId] = useState("");
  // const [maserviceUUIDcId, setserviceUUID] = useState("");
  // const [characteristicUUID, setcharacteristicUUID] = useState("");

  const serviceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const characteristicUUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

  const manager = new BleManager();
  const scanForDevices = () => {
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
        return;
      }

      if (device.name === "ESP32") {
        setMacId(device.id);
        setDevice(device);
        manager.stopDeviceScan();
      }
    });
  };

  const connectToDevice = async (deviceId) => {
    try {
      const device = await manager.connectToDevice(deviceId);
      console.log("Connected to device", device);
      const services = await device.discoverAllServicesAndCharacteristics();
    } catch (error) {
      console.log("Connection failed", error);
    }
  };

  const sendData = async (device) => {
    try {
      const data = "cdfsf"; // Dữ liệu cần gửi
      const encodedData = Buffer.from(data, "utf-8");
      await device.writeCharacteristicWithResponseForService(
        serviceUUID,
        characteristicUUID,
        encodedData.toString("base64")
      );
      console.log("Data sent successfully!");
    } catch (error) {
      console.log("Error sending data", error);
    }
  };
  return (
    <View>
      <Text>BLE Device Connection</Text>
      <Button title="Scan for Devices" onPress={scanForDevices} />
      <Button title="Connect" onPress={() => connectToDevice(macId)} />
      <Button title="Sentdata" onPress={() => sendData(device)} />
    </View>
  );
}
