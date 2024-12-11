import React, { useState, useEffect } from "react";
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
import { BleManager } from "react-native-ble-plx";
import * as ExpoDevice from "expo-device";

export default function App() {
  const [allDevices, setAllDevices] = useState([]); // Lưu danh sách thiết bị quét được
  const [hasPermissions, setHasPermissions] = useState(false); // Kiểm tra quyền Bluetooth
  const [connectedDevice, setConnectedDevice] = useState(null); // Thiết bị đang kết nối
  const [sendingData, setSendingData] = useState(false); // Trạng thái gửi dữ liệu

  const bleManager = new BleManager();

  // UUID của dịch vụ và đặc tính mà bạn muốn ghi dữ liệu vào
  const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

  // Kiểm tra quyền Bluetooth (Android 31+)
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

  // Kiểm tra thiết bị đã có trong danh sách chưa
  const isDuplicateDevice = (devices, nextDevice) =>
    devices.findIndex((device) => nextDevice.id === device.id) > -1;

  // Quét các thiết bị BLE
  const scanForPeripherals = () => {
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log("Error scanning devices: ", error);
        return;
      }

      // Kiểm tra và thêm thiết bị vào danh sách nếu nó chưa tồn tại
      if (device && (device.localName === "ESP32" || device.name === "ESP32")) {
        setAllDevices((prevState) => {
          if (!isDuplicateDevice(prevState, device)) {
            return [
              ...prevState,
              {
                id: device.id,
                localName: device.localName,
                name: device.name,
              },
            ];
          }
          return prevState;
        });
      }
    });
  };

  // Kết nối tới thiết bị
  const connectToDevice = async (device) => {
    console.log("Attempting to connect to device: ", device);

    try {
      // Kết nối với thiết bị
      const deviceConnection = await bleManager.connectToDevice(device.id);
      console.log("Connected to device: ", device.id);

      // Lưu kết nối vào state
      setConnectedDevice(deviceConnection);
      console.log("Connected device: ", deviceConnection);

      // Kiểm tra kết nối trước khi khám phá dịch vụ và đặc tính
      const isConnected = await deviceConnection.isConnected();
      console.log("Is connected: ", isConnected);
      if (!isConnected) {
        throw new Error(`Device ${device.id} is not connected`);
      }

      // Khám phá tất cả các dịch vụ và đặc tính của thiết bị
      await deviceConnection.discoverAllServicesAndCharacteristics();
      console.log("Discovered services and characteristics", deviceConnection);

      // // Dừng quét sau khi kết nối
      bleManager.stopDeviceScan();

      // In thông báo khi kết nối thành công
      console.log(
        "Kết nối thành công với thiết bị:",
        device.name || device.localName
      );
      console.log("Thông tin thiết bị:", deviceConnection);
    } catch (e) {
      console.log("FAILED TO CONNECT", e);
      Alert.alert("Lỗi", `Không thể kết nối với thiết bị: ${e.message}`);
    }
  };

  // Gửi mã hex 0x08 đến thiết bị
  const sendData = async () => {
    if (connectedDevice) {
      try {
        // Ensure the device is connected
        const isConnected = await connectedDevice.isConnected();
        if (!isConnected) {
          await connectedDevice.connect();
        }

        // Chuyển đổi mã hex 0x08 thành buffer và ghi vào đặc tính
        const dataToSend = Buffer.from([0x08]);

        await connectedDevice.writeCharacteristicWithResponseForService(
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          dataToSend.toString("base64")
        );

        setSendingData(true);
        Alert.alert("Thông báo", "Dữ liệu đã được gửi thành công!");
      } catch (e) {
        console.log("Error sending data: ", e);
        Alert.alert("Lỗi", "Không thể gửi dữ liệu.");
      }
    } else {
      Alert.alert("Lỗi", "Chưa kết nối với thiết bị.");
    }
  };

  useEffect(() => {
    requestPermissions();
  }, []);

  return (
    <View style={styles.container}>
      {!hasPermissions ? (
        <Text style={styles.permissionText}>
          Vui lòng cấp quyền Bluetooth để tiếp tục.
          <Button title="Cấp quyền" onPress={requestPermissions} />
        </Text>
      ) : (
        <>
          <Button title="Quét thiết bị" onPress={scanForPeripherals} />
          <FlatList
            data={allDevices}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.deviceItem}
                onPress={() => connectToDevice(item)}
              >
                <Text style={styles.deviceName}>
                  {item.name || item.localName}
                </Text>
              </TouchableOpacity>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF",
  },
  permissionText: {
    textAlign: "center",
    margin: 10,
  },
  deviceItem: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: "#ccc",
  },
  deviceName: {
    fontSize: 16,
  },
});
