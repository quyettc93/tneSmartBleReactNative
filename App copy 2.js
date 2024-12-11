import React, { useState, useEffect } from "react";
import {
  Button,
  View,
  Text,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
} from "react-native";
import RNBluetoothClassic from "react-native-bluetooth-classic";
import { CameraView, useCameraPermissions } from "expo-camera";
// import buttonData from "./buttonData.json"; // Import the custom button data
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
// import dataSent from "./sentdata";
import { PermissionsAndroid } from "react-native";
import { BleManager } from "react-native-ble-plx";

// QR scanner and Bluetooth handler
export default function App() {
  const [allDevices, setAllDevices] = useState([]);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);

  //Yeu cau quyen bluetooth BLE (android 14)
  const requestAndroid31Permissions = async () => {
    const bluetoothScanPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );
    const bluetoothConnectPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
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

    return (
      bluetoothScanPermission === "granted" &&
      bluetoothConnectPermission === "granted" &&
      fineLocationPermission === "granted"
    );
  };

  //Yeu cau quyen bluetooth BLE (He thong)
  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      if ((Platform.Version ?? -1) < 31) {
        // Yêu cầu quyền ACCESS_FINE_LOCATION cho Android API level dưới 31
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
        // Yêu cầu quyền Bluetooth cho Android API level >= 31
        const isAndroid31PermissionsGranted =
          await requestAndroid31Permissions();
        setHasPermissions(isAndroid31PermissionsGranted);
      }
    } else {
      // Trên iOS, quyền đã được cấp mặc định
      setHasPermissions(true);
    }
  };

  //Scan thiet bi BLE
  const isDuplicateDevice = (devices, nextDevice) =>
    devices.findIndex((device) => nextDevice.id === device.id) > -1;

  const scanForPeripherals = () => {
    const bleManager = new BleManager();

    // Bắt đầu quét thiết bị
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log("Error scanning devices: ", error);
        return;
      }

      // Kiểm tra và thêm thiết bị vào danh sách nếu nó chưa tồn tại
      if (device) {
        // Chỉ lấy thiết bị có tên "Arduino"
        if (device.localName === "Arduino" || device.name === "Arduino") {
          setAllDevices((prevState) => {
            // Kiểm tra xem thiết bị đã tồn tại trong danh sách hay chưa
            if (!isDuplicateDevice(prevState, device)) {
              // Thêm thiết bị mới vào danh sách nếu chưa tồn tại
              return [
                ...prevState,
                {
                  id: device.id,
                  localName: device.localName,
                  name: device.name,
                },
              ];
            }
            // Trả về danh sách ban đầu nếu thiết bị đã tồn tại
            return prevState;
          });
        }
      }
    });
  };
  const connectToDevice = async (device) => {
    const bleManager = new BleManager();
    try {
      // Kết nối đến thiết bị qua BleManager
      const deviceConnection = await bleManager.connectToDevice(device.id);

      // Cập nhật thiết bị đã kết nối vào state
      setConnectedDevice(deviceConnection);

      // Khám phá tất cả các dịch vụ và đặc tính của thiết bị
      await deviceConnection.discoverAllServicesAndCharacteristics();

      // Dừng quét thiết bị (nếu có)
      bleManager.stopDeviceScan();

      // Bắt đầu stream dữ liệu từ thiết bị (nếu cần)
      // startStreamingData(deviceConnection);
    } catch (e) {
      console.log("FAILED TO CONNECT", e);
    }
  };

  return (
    <TouchableOpacity onPress={handlePermissionRequest}>
      <Text>Cap quyen Bluetooth</Text>
    </TouchableOpacity>
  );
  //END
}
