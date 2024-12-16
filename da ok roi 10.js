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

const bleManager = new BleManager(); // Tạo đối tượng BLE Manager

export default function App() {
  const [devices, setDevices] = useState([]); // Lưu danh sách các thiết bị tìm thấy
  const [isConnected, setIsConnected] = useState(false); // Theo dõi trạng thái kết nối
  const [button, setButton] = useState(false); // Biến theo dõi trạng thái button
  const [connectedDevice, setConnectedDevice] = useState(null); // Lưu thiết bị đã kết nối
  const serviceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const characteristicUUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
  const value = "SGVsbG87"; // Dữ liệu cần gửi (ở định dạng base64)
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [idFromQr, setIdFromQr] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isHoldPressed, setIsHoldPressed] = useState(false);

  const handlePermissionRequest = () => {
    requestPermission().then(() => {
      if (permission.granted) {
        setCameraEnabled(true);
      }
    });
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
  // Hàm quét thiết bị
  const scanForPeripherals = () => {
    console.log("Bắt đầu quét thiết bị BLE...");
    setDevices([]); // Xóa danh sách thiết bị cũ

    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("Lỗi khi quét thiết bị:", error);
        return;
      }

      if (
        device.localName === "ESP32 QUYET" &&
        device.id === "F0:24:F9:43:45:6E"
      ) {
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
      if (button && isConnected) {
        await writeDataToDevice(serviceUUID, characteristicUUID, value);
        // Reset trạng thái button sau khi gửi xong
        setButton(false);
      }
    };

    sendData(); // Gọi hàm sendData khi có sự thay đổi
  }, [button, isConnected]); // Theo dõi button và trạng thái kết nối

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
                      <Button title="Efect" onPress={() => setButton(true)} />
                      <Button
                        title="TrucTiep"
                        onPress={() =>
                          writeDataToDevice(
                            serviceUUID,
                            characteristicUUID,
                            value
                          )
                        }
                      />
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
                <Button
                  title="Quét thiết bị BLE"
                  onPress={scanForPeripherals}
                />

                <View>
                  <TouchableOpacity
                    style={styles.reconnectButton}
                    // onPress={handleReconnect}
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
