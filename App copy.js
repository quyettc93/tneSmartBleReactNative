import React, { useState, useEffect } from "react";
import {
  Button,
  View,
  Text,
  Alert,
  FlatList,
  TouchableOpacity,
  Platform,
} from "react-native";
import { PermissionsAndroid } from "react-native";
import { BleManager } from "react-native-ble-plx";

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
  const requestAndroid31Permissions = async () => {
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

    return (
      bluetoothScanPermission === "granted" &&
      bluetoothConnectPermission === "granted" &&
      fineLocationPermission === "granted"
    );
  };

  // Yêu cầu quyền Bluetooth
  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      if ((Platform.Version ?? -1) < 31) {
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
        const isAndroid31PermissionsGranted =
          await requestAndroid31Permissions();
        setHasPermissions(isAndroid31PermissionsGranted);
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
      if (device) {
        if (device.localName === "Arduino" || device.name === "Arduino") {
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
      }
    });
  };

  // Kết nối tới thiết bị
  const connectToDevice = async (device) => {
    try {
      const deviceConnection = await bleManager.connectToDevice(device.id);
      setConnectedDevice(deviceConnection);
      await deviceConnection.discoverAllServicesAndCharacteristics();
      bleManager.stopDeviceScan(); // Dừng quét sau khi kết nối
    } catch (e) {
      console.log("FAILED TO CONNECT", e);
    }
  };

  // Gửi mã hex 0x08 đến thiết bị
  const sendHexData = async () => {
    if (connectedDevice) {
      try {
        const characteristic =
          await connectedDevice.readCharacteristicForService(
            SERVICE_UUID,
            CHARACTERISTIC_UUID
          );

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
    // Kiểm tra và yêu cầu quyền khi component mount
    requestPermissions();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {!hasPermissions ? (
        <Text>Vui lòng cấp quyền Bluetooth để tiếp tục.</Text>
      ) : (
        <>
          <Button title="Quét thiết bị" onPress={scanForPeripherals} />
          <FlatList
            data={allDevices}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => connectToDevice(item)}>
                <Text>{item.name || item.localName}</Text>
              </TouchableOpacity>
            )}
          />
          {connectedDevice && (
            <View>
              <TouchableOpacity onPress={() => sendHexData()}>
                <Text>Gửi mã 0x08</Text>
              </TouchableOpacity>
              <Text>Đã kết nối với: {connectedDevice.id}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
