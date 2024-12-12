import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";
import { useEffect, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import * as ExpoDevice from "expo-device";
import Permissions from "./component/bleCallClient/Permissions";

import {
  Button,
  View,
  Text,
  Alert,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function App() {
  const [isHoldPressed, setIsHoldPressed] = useState(false);
  const [isConnected, setIsConnected] = useState(false); // Correctly managing connection state
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [device, setDevice] = useState(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [idFromQr, setIdFromQr] = useState(null);
  // const [maserviceUUIDcId, setserviceUUID] = useState("");
  // const [characteristicUUID, setcharacteristicUUID] = useState("");

  // const nameEsp = "ESP32 QUYET";
  // const idEsp = "F0:24:F9:43:45:6E";
  const serviceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const characteristicUUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

  const blemanager = new BleManager();

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
      const parsedDataRow = data;
      const parsedData = JSON.parse(data);
      console.log("quet ra dc ru Qr", parsedData);
      setIdFromQr(parsedData); // Save QR data
      setCameraEnabled(false); // Turn off camera after scan
      scanForDevices(parsedData, parsedDataRow); // Connect directly using MAC address from QR code
    } catch (error) {
      Alert.alert("Error", "Invalid QR Code data");
    }
  };

  useEffect(() => {
    requestPermissions();
    return () => {
      // Cleanup BLE manager when the component unmounts
      blemanager.destroy();
    };
  }, []);
  //Phan Quyen
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
  //Scan thiet bi
  const scanForDevices = (data, parsedDataRow) => {
    console.log("Scanning for devices...", data.name);
    blemanager.startDeviceScan(null, null, (error, device) => {
      console.log("Scanning...123");
      if (error) {
        console.log("LOI", error);
        return;
      }
      console.log("device", device);
      if (device.name === data.name && device.id === data.id) {
        console.log("Found device", device);
        setDevice(device);
        connectToDevice(parsedDataRow, device.id);
        blemanager.stopDeviceScan();
      }
    });
  };

  const connectToDevice = async (parsedDataRow, deviceId) => {
    try {
      const deviceConnect = await blemanager.connectToDevice(deviceId);
      const services =
        await deviceConnect.discoverAllServicesAndCharacteristics(); // Lấy tất cả dịch vụ và đặc điểm của thiết bị
      setIsConnected(true);
      if (services) {
        setIsConnected(true);
        if (data) {
          await saveLastDevice(parsedDataRow); // Lưu thông tin thiết bị đã kết nối
        }
      } else {
        Alert.alert(
          "Connection failed",
          `Failed to connect to device with MAC address`
        );
      }
    } catch (error) {
      console.log("Connection failed", error);
    }
  };
  //Save last device connected
  const saveLastDevice = async (data) => {
    try {
      await AsyncStorage.setItem("LAST_DEVICE", data);
      console.log("Last connected device saved:", data);
    } catch (error) {
      console.error("Error saving last connected device:", error);
    }
  };
  //Get last device connected
  const getLastDevice = async () => {
    try {
      console.log("Fetching last connected device");
      const lastDevice = await AsyncStorage.getItem("LAST_DEVICE");
      return lastDevice;
    } catch (error) {
      console.error("Error fetching last connected device:", error);
      return null;
    }
  };
  const handleReconnect = async () => {
    console.log("Reconnecting to last device");
    const lastDevice = await getLastDevice();
    const parsedData = JSON.parse(lastDevice);
    if (parsedData) {
      scanForDevices(parsedData);
      // connectToDevice(parsedData.name);
      // setCameraEnabled(false); // Turn off camera after scan
      // setMacAddress(parsedData.name); // Assuming QR data contains mac address
      // setButtonCount(parsedData.count);
      // setShow(parsedData.show);
      // setIdDeviceAddPass(parsedData); // Save QR data
    } else {
      Alert.alert("No device", "No previously connected device found.");
    }
  };

  const sendData = async (device) => {
    try {
      const hexArray = [
        "0x3E",
        "0x08",
        "0x03",
        "0x08",
        "0x08",
        "0x03",
        "0x08",
        "0x08",
      ];

      // Bước 1: Chuyển đổi từ hex sang số nguyên
      const uint8Array = hexArray.map((hex) => parseInt(hex, 16));

      // Bước 2: Tạo Buffer từ mảng số nguyên
      const buffer = Buffer.from(uint8Array);

      console.log("Buffer:", buffer); // Kết quả: <Buffer 3e 08 03 08 08 03 08 08>
      await device.writeCharacteristicWithResponseForService(
        serviceUUID,
        characteristicUUID,
        buffer.toString("base64") // Bluetooth LE yêu cầu dữ liệu phải ở dạng Base64
      );

      console.log("Data sent successfully!");
    } catch (error) {
      console.log("Error sending data", error);
    }
  };

  if (!cameraEnabled) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ImageBackground
          source={require("./assets/Image/bacg.jpg")} // Đường dẫn tới hình nền của bạn
          style={{
            flex: 1, // Đảm bảo ảnh nền phủ toàn bộ không gian
            justifyContent: "center", // Căn giữa các phần tử con trong toàn bộ ứng dụng
            alignItems: "center", // Căn giữa các phần tử con trong toàn bộ ứng dụng
          }}
        >
          <LinearGradient
            colors={["#ffffff", "#2c2d5e"]} // Từ trắng sang đen
            style={{
              position: "absolute", // Để lớp phủ nằm trên ảnh nền
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.8,
            }}
          />
          <View style={styles.container}>
            {idFromQr ? (
              <View style={styles.resultContainer}>
                {isConnected ? (
                  <View style={styles.container}>
                    <View style={styles.buttonContainer}>
                      {Array.from({ length: idFromQr.numberFloor }, (_, i) => (
                        <View style={styles.buttonCallContainer} key={i}>
                          <TouchableOpacity
                            style={styles.buttonCall}
                            key={i}
                            // onPress={() => handleButtonPress(i)}
                          >
                            <Text style={styles.buttonText}>
                              {idFromQr.display[i]}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                    <View style={{ marginTop: 30 }}>
                      <TouchableOpacity
                        style={[
                          styles.buttonFunction,
                          {
                            backgroundColor: isHoldPressed
                              ? "#7b4415" // Màu đỏ khi nhấn
                              : "#fb970c", // Màu xanh khi thả
                            borderColor: isHoldPressed ? "#242322" : "#4a4848", // Viền đỏ khi nhấn, viền xanh khi thả
                            opacity: isHoldPressed ? 0.5 : 1,
                          },
                        ]}
                        key={"buttonhold"}
                        // onPress={() => handleToogle()}
                      >
                        <Text style={styles.buttonTextFunction}>HOLD</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.containerRow}>
                      <View style={styles.buttonDoor}>
                        <TouchableOpacity
                          style={[
                            styles.buttonFunction,
                            {
                              backgroundColor: "#149d2b",
                              borderColor: "#06640e",
                            },
                          ]}
                          key={"buttonopen"}
                          // onPress={() => handleButtonFunctionPress(6)}
                        >
                          <Text style={styles.buttonTextFunction}>OPEN</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.buttonDoor}>
                        <TouchableOpacity
                          style={[
                            styles.buttonFunction,
                            {
                              backgroundColor: "#c92107",
                              borderColor: "#830707",
                            },
                          ]}
                          key={"buttonclose"}
                          // onPress={() => handleButtonFunctionPress(7)}
                        >
                          <Text style={styles.buttonTextFunction}>CLOSE</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.smarttne}>ĐANG KẾT NỐI</Text>
                )}
              </View>
            ) : (
              <View style={styles.container}>
                <View style={styles.messageView}>
                  <Text style={styles.message}>
                    Cấp quyền camera để sử dụng ứng dụng
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.reconnectButton}
                  onPress={handlePermissionRequest}
                >
                  <Text style={styles.reconnectButtonText}>
                    QUÉT QR ĐỂ KẾT NỐI
                  </Text>
                </TouchableOpacity>

                <View>
                  <TouchableOpacity
                    style={styles.reconnectButton}
                    onPress={handleReconnect}
                  >
                    <Text style={styles.reconnectButtonText}>KẾT NỐI LẠI</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View>
              <Text style={styles.logoText}>@tne.vn</Text>
            </View>
          </View>
        </ImageBackground>
      </>
    );
  } else {
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  containerRow: {
    marginTop: 10,
    flexDirection: "row",
    // flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    width: 280, // Chiều rộng của thẻ
    textAlign: "center", // Căn giữa chữ theo chiều ngang
  },

  messageView: {
    alignItems: "center",
    justifyContent: "center",
    // padding: 8,
    // borderRadius: 4,
    // backgroundColor: "#f0f0ea",
    // marginBottom: 8,
  },
  camera: { flex: 1, width: "100%" },
  resultContainer: { alignItems: "center", marginTop: 20 },
  resultText: { fontSize: 18, fontWeight: "bold", margin: 10 },
  input: {
    width: 200,
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 20,
    textAlign: "center",
  },
  sentDataContainer: { marginTop: 20 },
  sentDataText: { fontSize: 16, fontWeight: "normal", color: "green" },
  buttonCall: {
    width: 120, // Tăng kích thước để nút cân đối hơn
    height: 70,
    backgroundColor: "#007BFF", // Màu nền xanh lam đậm
    borderColor: "#0056b3", // Màu viền xanh đậm hơn
    borderWidth: 1,
    borderRadius: 16, // Bo góc mềm mại
    justifyContent: "center", // Căn giữa nội dung theo chiều dọc
    alignItems: "center", // Căn giữa nội dung theo chiều ngang
    marginBottom: 15, // Tăng khoảng cách để dễ nhìn hơn
    shadowColor: "#000", // Hiệu ứng đổ bóng
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4, // Bóng cho Android
  },
  buttonFunction: {
    width: 120, // Tăng kích thước để nút cân đối hơn
    height: 70,

    borderWidth: 1,
    borderRadius: 16, // Bo góc mềm mại
    justifyContent: "center", // Căn giữa nội dung theo chiều dọc
    alignItems: "center", // Căn giữa nội dung theo chiều ngang
    marginBottom: 15, // Tăng khoảng cách để dễ nhìn hơn
    shadowColor: "#000", // Hiệu ứng đổ bóng
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4, // Bóng cho Android
  },
  buttonDoor: {
    marginHorizontal: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "bold",
  },
  buttonTextFunction: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
  },
  buttonContainer: {
    width: "100%",
    flexDirection: "row", // Sắp xếp từ trái sang phải
    flexWrap: "wrap-reverse", // Dòng mới xuất hiện từ dưới lên trên
    justifyContent: "flex-start", // Căn phần tử theo hướng ngang
    alignItems: "flex-start", // Căn phần tử theo chiều dọc
    margin: 10,
  },
  buttonCallContainer: {
    width: "40%", // Mỗi hàng chứa
    marginBottom: 10, // Khoảng cách giữa các nút
    alignItems: "center", // Căn giữa các phần tử bên trong
  },
  smarttne: {
    fontSize: 16,
  },
  logoText: {
    marginBottom: 30,
    fontSize: 16,
    color: "#FFFFFF",
    fontStyle: "italic",
    opacity: 0.5,
  },
  reconnectButton: {
    width: 300,
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    alignItems: "center",
  },
  reconnectButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
