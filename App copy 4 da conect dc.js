import { useEffect, useState } from "react";
import {
  Button,
  StyleSheet,
  Text,
  View,
  Alert,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import RNBluetoothClassic from "react-native-bluetooth-classic";
import { PermissionsAndroid, Platform } from "react-native";

// Đoạn mã quét QR
export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [idDeviceAddPass, setIdDeviceAddPass] = useState(null);

  const handlePermissionRequest = () => {
    requestPermission().then(() => {
      if (permission.granted) {
        setCameraEnabled(true);
      }
    });
  };

  const handleBarcodeScanned = ({ type, data }) => {
    setScanned(true);
    try {
      const parsedData = JSON.parse(data);
      setIdDeviceAddPass(parsedData); // Lưu dữ liệu QR
      setCameraEnabled(false); // Tắt camera sau khi quét
      scanForDevices(parsedData.name); // Tìm thiết bị khi quét QR thành công
    } catch (error) {
      Alert.alert("Error", "Invalid QR Code data");
    }
  };

  if (!cameraEnabled) {
    return (
      <View style={styles.container}>
        {idDeviceAddPass ? (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>Name: {idDeviceAddPass.name}</Text>
            <Text style={styles.resultText}>
              Password: {idDeviceAddPass.pass}
            </Text>
          </View>
        ) : (
          <View>
            <Text style={styles.message}>
              We need your permission to show the camera
            </Text>
            <Button
              onPress={handlePermissionRequest}
              title="Grant Camera Permission"
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
      {scanned && (
        <Button title="Scan Again" onPress={() => setScanned(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  message: { textAlign: "center", paddingBottom: 10 },
  camera: { flex: 1, width: "100%" },
  resultContainer: { alignItems: "center", marginTop: 20 },
  resultText: { fontSize: 18, fontWeight: "bold", margin: 10 },
});

// Đoạn mã kết nối Bluetooth
const requestBluetoothPermissions = async () => {
  if (Platform.OS === "android" && Platform.Version >= 31) {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return (
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (err) {
      console.warn(err);
      return false;
    }
  } else {
    return true;
  }
};

const initializeBluetooth = async () => {
  const hasPermissions = await requestBluetoothPermissions();
  if (!hasPermissions) {
    Alert.alert(
      "Permissions required",
      "Please grant Bluetooth permissions to use this feature."
    );
    return false;
  }
  return true;
};

const scanForDevices = async (deviceNameToConnect) => {
  try {
    const initialized = await initializeBluetooth();
    if (!initialized) return;

    // Hủy quét nếu đang quét thiết bị
    await RNBluetoothClassic.cancelDiscovery();

    // Bắt đầu quét thiết bị Bluetooth
    const discoveredDevices = await RNBluetoothClassic.startDiscovery();
    console.log("Devices:", discoveredDevices);

    // Tìm thiết bị Bluetooth theo tên hoặc địa chỉ
    const targetDevice = discoveredDevices.find(
      (device) =>
        device.name === deviceNameToConnect ||
        device.address === deviceNameToConnect
    );

    if (targetDevice) {
      connectToDevice(targetDevice);
    } else {
      Alert.alert(
        "Device not found",
        "The device was not found during discovery."
      );
    }
  } catch (error) {
    console.error("Scan Error:", error);
    Alert.alert("Error", "An error occurred while scanning for devices");
  }
};

const connectToDevice = async (device) => {
  try {
    const connected = await RNBluetoothClassic.connectToDevice(device.id);
    if (connected) {
      Alert.alert("Connected", `Connected to ${device.name}`);
    } else {
      Alert.alert("Connection failed", `Failed to connect to ${device.name}`);
    }
  } catch (error) {
    console.error("Connection Error:", error);
    Alert.alert("Error", "An error occurred while connecting to the device");
  }
};
