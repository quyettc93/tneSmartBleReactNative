import React, { useState, useEffect } from "react";
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
import { BleManager } from "react-native-ble-plx";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Buffer } from "buffer";
import { PermissionsAndroid, Platform } from "react-native";
import * as ExpoDevice from "expo-device";

const bleManager = new BleManager(); // Tạo đối tượng BLE Manager

export default function App() {
  // const [devices, setDevices] = useState([]); // Lưu danh sách các thiết bị tìm thấy
  const [isConnected, setIsConnected] = useState(false); // Theo dõi trạng thái kết nối
  const [button, setButton] = useState(false); // Biến theo dõi trạng thái button
  const [connectedDevice, setConnectedDevice] = useState(null); // Lưu thiết bị đã kết nối
  const serviceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const characteristicUUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [idFromQr, setIdFromQr] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isHoldPressed, setIsHoldPressed] = useState(false);
  const [callBinary, setCallBinary] = useState([0, 0, 0, 0, 0, 0, 0, 0]);
  const [funcBinary, setFuncBinary] = useState([0, 0, 0, 0, 0, 0, 0, 0]);
  const [dataSend, setDataSend] = useState([]);

  console.log("Kiem tra", dataSend);
  const handlePermissionRequest = () => {
    requestPermission().then(() => {
      if (permission.granted) {
        setCameraEnabled(true);
      }
    });
  };
  useEffect(() => {
    requestPermissions();
    // return () => {
    //   // Cleanup BLE manager when the component unmounts
    //   bleManager.destroy();
    // };
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
  const handleBarcodeScanned = ({ type, data }) => {
    setScanned(true);
    console.log("vao day chua");
    try {
      const parsedData = JSON.parse(data);
      console.log("quet ra dc ru Qr", parsedData);
      if (parsedData) {
        setIdFromQr(parsedData); // Save QR data
        setCameraEnabled(false); // Turn off camera after scan
        scanForPeripherals(parsedData); // Connect directly using MAC address from QR code
      } else {
        Alert.alert("Error", "parsedData ko ton tai");
      }
    } catch (error) {
      Alert.alert("Error", "Invalid QR Code data");
    }
  };
  //save trang thai quet
  useEffect(() => {
    if (idFromQr !== null && isConnected) {
      console.log("useEffcet Save idFromQr", idFromQr);
      saveLastDevice(idFromQr);
    }
  }, [idFromQr, isConnected]);
  //Save last device connected
  const saveLastDevice = async (data) => {
    console.log("Saving last connected device:", data);
    try {
      const jsonData = JSON.stringify(data);
      await AsyncStorage.setItem("ID_FROM_QR", jsonData);
      console.log("Last connected device saved:", jsonData);
    } catch (error) {
      console.error("Error saving last connected device:", error);
    }
  };
  //Reconnect to last device
  const handleReconnect = async () => {
    console.log("Reconnecting to last device");
    const lastDevice = await getLastDevice();
    if (lastDevice) {
      console.log("Last device found", lastDevice);
      connectToPeripheral(lastDevice);
    } else {
      Alert.alert("No device", "No previously connected device found.");
    }
  };
  //Get last device connected
  const getLastDevice = async () => {
    try {
      console.log("Fetching last connected device");
      const lastIdQr = await AsyncStorage.getItem("ID_FROM_QR");
      const parsedlastIdQr = JSON.parse(lastIdQr);
      setIdFromQr(parsedlastIdQr);
      return parsedlastIdQr;
    } catch (error) {
      console.error("Error fetching last connected device:", error);
      return null;
    }
  };

  // Hàm chuyển Mảng binary về HEx
  const binaryArrayToHex = (binaryArray) => {
    const binaryString = binaryArray.join("");
    let hexValue = parseInt(binaryString, 2).toString(16).toUpperCase();
    hexValue = hexValue.padStart(2, "0"); // Đảm bảo đủ 2 ký tự
    const formattedHexValue = `0x${hexValue}`;
    return formattedHexValue;
  };

  // hàm chuyển mảng hex về base64
  function hexArrayToBase64(hexArray) {
    // Bước 1: Tạo Buffer từ mảng hex
    const buffer = Buffer.from(hexArray);

    // Bước 2: Chuyển Buffer thành Base64
    const base64String = buffer.toString("base64");

    return base64String;
  }

  // Hàm quét thiết bị
  const scanForPeripherals = (parsedData) => {
    console.log("Bắt đầu quét thiết bị BLE...");
    // setDevices([]); // Xóa danh sách thiết bị cũ

    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("Lỗi khi quét thiết bị:", error);
        return;
      }

      if (device.localName === parsedData.name && device.id === parsedData.id) {
        console.log("Tìm thấy thiết bị:", device.localName);
        connectToPeripheral(device); // Kết nối thiết bị ngay khi tìm thấy
        bleManager.stopDeviceScan();
      }
    });
  };

  // Hàm kết nối với thiết bị
  const connectToPeripheral = async (device) => {
    console.log(
      `Đang kết nối với thiết bị: ${device.localName} (${device.id})`
    );
    try {
      const connectedDevice = await bleManager.connectToDevice(device.id);
      console.log("Đã kết nối thành công:", connectedDevice);
      setConnectedDevice(connectedDevice); // Lưu lại thiết bị đã kết nối
      setIsConnected(true);
      await connectedDevice.discoverAllServicesAndCharacteristics(); // Khám phá các dịch vụ
      console.log("Khám phá dịch vụ thành công.");
    } catch (error) {
      console.error("Lỗi khi kết nối với thiết bị:", error);
    }
  };

  // Hàm gửi dữ liệu
  const writeDataToDevice = async (serviceUUID, characteristicUUID, value) => {
    if (!connectedDevice) {
      console.log("Chưa kết nối với thiết bị.");
      return;
    }
    console.log("mang chuan bị de gui du lieu di", connectedDevice);
    console.log(serviceUUID, characteristicUUID, value);
    try {
      await connectedDevice.writeCharacteristicWithResponseForService(
        serviceUUID,
        characteristicUUID,
        value
      );
      console.log("Gửi dữ liệu thành công.");
    } catch (error) {
      console.error("Lỗi khi gửi dữ liệu:", error);
    }
  };

  // useEffect theo dõi biến button
  useEffect(() => {
    const sendData = async () => {
      console.log("dataSend useeffect", dataSend, dataSend[0]);
      console.log("button", button);
      let value = "SGVsbG87";
      if (dataSend.length !== 0) {
        value = hexArrayToBase64(dataSend);
      }

      // Gửi dữ liệu khi button = true / dataSend và đã kết nối
      if ((button && isConnected) || (isConnected && dataSend.length !== 0)) {
        console.log("Gửi dữ liệu... từ Efect");
        await writeDataToDevice(serviceUUID, characteristicUUID, value);
        // Reset trạng thái button sau khi gửi xong
        setButton(false);
      }
    };
    sendData(); // Gọi hàm sendData khi có sự thay đổi
  }, [button, isConnected, dataSend, isHoldPressed]); // Theo dõi button và trạng thái kết nối

  //Sử lý nút Gọi
  const handleButtonPress = (buttonNumber) => {
    console.log("Đã nhấn vào nút số", buttonNumber);
    // playSound(); // Play sound when button is pressed
    if (isConnected) {
      const numberFloor = 7; //0 đến 7 là thành 8 tầng
      setCallBinary((prev) => {
        const newCallBinary = [...prev];
        for (let i = 0; i < newCallBinary.length; i++) {
          // newCallBinary[numberFloor - buttonNumber] = 1;
          const index = numberFloor - buttonNumber;
          if (i === index) {
            newCallBinary[i] = 1;
          } else {
            newCallBinary[i] = 0;
          }
        }
        const hexCall = binaryArrayToHex(newCallBinary);
        setDataSend((prev) => {
          const newDataSend = [...prev];
          newDataSend[0] = hexCall;
          newDataSend[1] = "0x00";
          newDataSend[2] = "0x00";
          newDataSend[3] = "0x00";

          return newDataSend;
        });
        return newCallBinary;
      });
    } else {
      Alert.alert(
        "Bluetooth not connected",
        "Please connect to a Bluetooth device first."
      );
    }
  };
  // Sử lý nút hold
  const handleButtonFunctionPress = (buttonFunction) => {
    console.log("Đã nhấn vào nút chức năng", buttonFunction);
    // playSound(); // Play sound when button is pressed
    if (isConnected) {
      setFuncBinary((prev) => {
        const newFunctionButton = [...prev];
        for (let i = 0; i < newFunctionButton.length; i++) {
          if (i === buttonFunction) {
            newFunctionButton[i] = 1;
          } else {
            newFunctionButton[i] = 0;
          }
        }
        const hexFunction = binaryArrayToHex(newFunctionButton);
        setDataSend((prev) => {
          const newDataSend = [...prev];
          newDataSend[0] = "0x00";
          newDataSend[1] = "0x00";
          newDataSend[2] = "0x00";
          newDataSend[3] = hexFunction;

          return newDataSend;
        });
        return newFunctionButton;
      });
    } else {
      Alert.alert(
        "Bluetooth not connected",
        "Please connect to a Bluetooth device first."
      );
    }
  };
  // return (
  //   <>
  //     <View style={{ flex: 1, padding: 20 }}>
  //       <Button title="Quét thiết bị BLE" onPress={scanForPeripherals} />

  //       {connected ? (
  //         <Text style={{ marginVertical: 20 }}>
  //           Đã kết nối với thiết bị BLE
  //         </Text>
  //       ) : (
  //         <Text style={{ marginVertical: 20 }}>Chưa kết nối thiết bị</Text>
  //       )}

  //       <Button
  //         title="Gửi dữ liệu"
  //         onPress={() => setButton(true)}
  //         disabled={!connected} // Chỉ gửi dữ liệu khi đã kết nối
  //       />
  //       <Button
  //         title="Gửi dữ liệu trực tiếp"
  //         onPress={() =>
  //           writeDataToDevice(serviceUUID, characteristicUUID, value)
  //         }
  //         disabled={!connected} // Chỉ gửi dữ liệu khi đã kết nối
  //       />
  //     </View>
  //   </>
  // );
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
            {idFromQr && isConnected ? (
              <View style={styles.resultContainer}>
                {isConnected ? (
                  <View style={styles.container}>
                    <View style={styles.buttonContainer}>
                      {Array.from({ length: idFromQr.numberFloor }, (_, i) => (
                        <View style={styles.buttonCallContainer} key={i}>
                          <TouchableOpacity
                            style={styles.buttonCall}
                            key={i}
                            onPress={() => handleButtonPress(i)}
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
                        onPress={() => handleButtonFunctionPress(5)}
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
                          onPress={() => handleButtonFunctionPress(6)}
                        >
                          <Text style={styles.buttonTextFunction}>OPEN</Text>
                        </TouchableOpacity>
                      </View>
                      {/* <Button title="Efect" onPress={() => setButton(true)} /> */}
                      {/* <Button
                        title="TrucTiep"
                        onPress={() =>
                          writeDataToDevice(
                            serviceUUID,
                            characteristicUUID,
                            "SGVsbG87"
                          )
                        }
                      /> */}
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
                          onPress={() => handleButtonFunctionPress(7)}
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
                {/* <Button
                  title="Quét thiết bị BLE"
                  onPress={scanForPeripherals}
                /> */}

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
