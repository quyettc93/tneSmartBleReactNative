import React, { useEffect, useState } from "react";
import { BleManager } from "react-native-ble-plx";
import {
  Button,
  View,
  Text,
  Alert,
  FlatList,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from "react-native";
import { PermissionsAndroid } from "react-native";
import * as ExpoDevice from "expo-device";
import { Buffer } from "buffer";

export default function App() {
  const [hasPermissions, setHasPermissions] = useState(false); // Kiểm tra quyền Bluetooth
  const [isConnected, setIsConnected] = useState(false); // Kiểm tra quyền Bluetooth
  const [connectedDevice, setConnectedDevice] = useState(null); // Thiết bị đang kết nối
  const [service, setService] = useState([]); // Thiết bị đang kết nối
  const manager = new BleManager();

  const macAddress = "F0:24:F9:43:45:6E"; // Thay bằng địa chỉ MAC của bạn

  // 4fafc201-1fb5-459e-8fcc-c5c9c331914b", "uuid": "beb5483e-36e1-4688-b7f5-ea07361b26a8"

  console.log("hasPermissions", hasPermissions);
  console.log("isConnected", isConnected);
  useEffect(() => {
    requestPermissions();
    return () => {
      // Cleanup BLE manager when the component unmounts
      manager.destroy();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "Bluetooth Low Energy requires Location",
            buttonPositive: "OK",
          }
        );
        setHasPermissions(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        const bluetoothScanPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          {
            title: "Bluetooth Permission",
            message: "This app requires Bluetooth Scan Permission",
            buttonPositive: "OK",
          }
        );
        const bluetoothConnectPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          {
            title: "Bluetooth Permission",
            message: "This app requires Bluetooth Connect Permission",
            buttonPositive: "OK",
          }
        );
        const fineLocationPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "Bluetooth Low Energy requires Location",
            buttonPositive: "OK",
          }
        );
        setHasPermissions(
          bluetoothScanPermission === PermissionsAndroid.RESULTS.GRANTED &&
            bluetoothConnectPermission === PermissionsAndroid.RESULTS.GRANTED &&
            fineLocationPermission === PermissionsAndroid.RESULTS.GRANTED
        );
      }
    } else {
      setHasPermissions(true); // Trên iOS, quyền đã được cấp mặc định
    }
  };
  const connectToDevice = async (macAddress) => {
    try {
      const connectedDevice = await manager.connectToDevice(macAddress);

      await connectedDevice.discoverAllServicesAndCharacteristics();
      manager.stopDeviceScan();
      const services = await connectedDevice.services();
      console.log("Discovered services 000000000000:", services);

      for (const service of services) {
        const characteristics = await service.characteristics();
        console.log(
          "Characteristics for service",
          service.uuid,
          characteristics
        );
      }
      setIsConnected(true);
      setConnectedDevice(connectedDevice);
    } catch (error) {
      console.error("BLE error:", error.message);
      Alert.alert("Connection Failed", error.message);
    }
  };

  const sendData = async (device) => {
    try {
      // Lấy dịch vụ 4fafc201-1fb5-459e-8fcc-c5c9c331914b
      const serviceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
      const characteristicUUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

      // Dữ liệu cần gửi (ví dụ: chuỗi "Hello")
      const data = "Hello";

      // Chuyển dữ liệu thành kiểu byte array
      const encodedData = Buffer.from(data, "utf-8");

      // Gửi dữ liệu tới đặc tính
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
    <View style={styles.container}>
      <Text style={styles.title}>BLE Device Connection</Text>
      <Button
        title="Connect to Device"
        onPress={() => connectToDevice(macAddress)}
      />
      <Button title="Send Data" onPress={() => sendData(connectedDevice)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
    fontWeight: "bold",
  },
});
