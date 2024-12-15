import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";
import { useEffect, useState, useCallback } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import * as ExpoDevice from "expo-device";

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
  const [connectedDevice, setConnectedDevice] = useState(null); // Lưu thiết bị đã kết nối
  const [hasPermissions, setHasPermissions] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [idFromQr, setIdFromQr] = useState({
    display: ["G", "1", "2", "3", "4"],
    id: "F0:24:F9:43:45:6E",
    name: "ESP32 QUYET",
    numberFloor: "5",
  });
  const [a, seta] = useState("");
  const [callBinary, setCallBinary] = useState([0, 0, 0, 0, 0, 0, 0, 0]);
  const [funcBinary, setFuncBinary] = useState([0, 0, 0, 0, 0, 0, 0, 0]);
  const [arrSentData, setArrSentData] = useState([
    "0x00",
    "0x00",
    "0x00",
    "0x00",
  ]);
  const [button, setButton] = useState(false);

  // const [maserviceUUIDcId, setserviceUUID] = useState("");
  // const [characteristicUUID, setcharacteristicUUID] = useState("");
  // const nameEsp = "ESP32 QUYET";
  // const idEsp = "F0:24:F9:43:45:6E";

  const serviceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const characteristicUUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
  const value = "SGVsbG87"; // Dữ liệu cần gửi (ở định dạng base64)
  // console.log("isConnected, idqr", isConnected, idFromQr);
  // Log when the component re-renders
  console.log("Component re-rendered");
  const bleManager = new BleManager();
  console.log("connectedDevice dau tienn", connectedDevice);
  // useEffect(() => {
  //   console.log("callBinaryfect");
  //   writeDataToDevice();
  // }, [callBinary]);

  // useEffect(() => {
  //   if (idFromQr !== null && connectedDevice !== null) {
  //     saveLastDevice(connectedDevice, idFromQr);
  //   }
  // }, [idFromQr]);

  // useEffect(() => {
  //   requestPermissions();
  //   return () => {
  //     // Cleanup BLE manager when the component unmounts
  //     bleManager.destroy();
  //   };
  // }, []);

  // useEffect(() => {
  //   if (isConnected) {
  //     let newState = [...funcBinary];
  //     newState[5] = isHoldPressed ? 1 : 0;
  //     setFuncBinary(newState);
  //   }
  // }, [isHoldPressed]);

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

  // useEffect(() => {
  //   requestPermissions();
  //   return () => {
  //     // Cleanup BLE manager when the component unmounts
  //     bleManager.destroy();
  //   };
  // }, []);
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
  const scanForPeripherals = useCallback(() => {
    console.log("Bắt đầu quét thiết bị BLE...");
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("Lỗi khi quét thiết bị:", error);
        return;
      }

      if (device.localName === "ESP32 QUYET") {
        console.log("Tìm thấy thiết bị:", device.localName);
        bleManager.stopDeviceScan();
        setConnectedDevice((prevDevice) => {
          if (device) {
            return device;
          }
          return prevDevice; // Không ghi đè khi không có thiết bị mới
        });
        connectToPeripheral(device);
      }
    });
  }, []);

  // Hàm kết nối với thiết bị
  const connectToPeripheral = useCallback(async (device) => {
    console.log(
      `Đang kết nối với thiết bị: ${device.localName} (${device.id})`
    );
    try {
      const connectedDeviceNew = await bleManager.connectToDevice(device.id);
      console.log("Đã kết nối thành công:", connectedDeviceNew);
      const servers =
        await connectedDeviceNew.discoverAllServicesAndCharacteristics(); // Khám phá các dịch vụ
      // Ensure connectedDevice is valid before setting state
      if (servers) {
        console.log("Updating state with connected device", connectedDevice);
        // setConnectedDevice((prevDevice) => {
        //   if (connectedDeviceNew) {
        //     return connectedDeviceNew;
        //   }
        //   return prevDevice; // Không ghi đè khi không có thiết bị mới
        // });
        console.log("co vao lai day ko");
        // setConnectedDevice(connectedDeviceNew); // Lưu lại thiết bị đã kết nối
        // setIsConnected(true); // Cập nhật trạng thái kết nối
        console.log("Device state updated successfully.");
      } else {
        console.error("Connected device is null or undefined.");
      }
    } catch (error) {
      console.error("Lỗi khi kết nối với thiết bị:", error);
    }
  }, []);

  // Hàm gửi dữ liệu
  const writeDataToDevice = async (serviceUUID, characteristicUUID, value) => {
    console.log("writeDataToDevice", connectedDevice);
    if (!connectedDevice) {
      console.log("Chưa kết nối với thiết bị.");
      return;
    }

    try {
      const isConnected = await connectedDevice.isConnected();
      if (!isConnected) {
        console.log(`Device ${connectedDevice.id} is not connected`);
        return;
      }

      console.log("Sending data...");
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
  // useEffect(() => {
  //   if (button && isConnected && connectedDevice) {
  //     writeDataToDevice(serviceUUID, characteristicUUID, value);
  //     // Reset trạng thái button sau khi gửi xong
  //     setButton(false);
  //   }
  // }, [button]); // Theo dõi button và trạng thái kết nối

  //Save last device connected
  const saveLastDevice = async (device, data) => {
    try {
      const jsonServices = JSON.stringify(device);
      await AsyncStorage.setItem("LAST_DEVICE_ESP", jsonServices);
      console.log("Last connected device saved:", jsonServices);
      console.log("data", data);
      const jsonData = JSON.stringify(data);
      await AsyncStorage.setItem("ID_FROM_QR", jsonData);
      console.log("Last connected device saved:", jsonData);
    } catch (error) {
      console.error("Error saving last connected device:", error);
    }
  };
  //Get last device connected
  const getLastDevice = async () => {
    try {
      console.log("Fetching last connected device");
      const lastDevice = await AsyncStorage.getItem("LAST_DEVICE_ESP");
      const parsedData = JSON.parse(lastDevice);

      console.log("Fetching last connected device");
      const lastIdQr = await AsyncStorage.getItem("ID_FROM_QR");
      const parsedlastIdQr = JSON.parse(lastIdQr);
      setIdFromQr(parsedlastIdQr);

      return parsedData;
    } catch (error) {
      console.error("Error fetching last connected device:", error);
      return null;
    }
  };
  const handleReconnect = async () => {
    console.log("Reconnecting to last device");
    const lastDevice = await getLastDevice();
    if (lastDevice) {
      console.log("Last device found", lastDevice);
      connectToPeripheral(lastDevice.id);
    } else {
      Alert.alert("No device", "No previously connected device found.");
    }
  };

  //nhan nut gui du lieu
  const handleButtonPress = (buttonNumber) => {
    console.log("buttonNumber");
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
        return newCallBinary;
      });

      // setTimeout(() => {
      //   setCallBinary((prevState) => {
      //     const newState = [...prevState];
      //     newState[numberFloor - buttonNumber] = 0; // Đặt lại giá trị về 0 sau 1 giây
      //     return newState;
      //   });
      // }, 1000);
    } else {
      Alert.alert(
        "Bluetooth not connected",
        "Please connect to a Bluetooth device first."
      );
    }
  };

  const handleToogle = () => {
    // playSound();
    setIsHoldPressed((e) => !e);
  };

  //function button open and close
  const handleButtonFunctionPress = (buttonFunction) => {
    // playSound(); // Play sound when button is pressed
    if (isConnected) {
      setFuncBinary((prev) => {
        const newCallBinary = [...prev];
        for (let i = 0; i < newCallBinary.length; i++) {
          newCallBinary[i] =
            i === 5 ? newCallBinary[i] : i === buttonFunction ? 1 : 0;
        }
        newCallBinary[buttonFunction] = 1;
        return newCallBinary;
      });
    }
  };
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Button title="Quét thiết bị BLE" onPress={scanForPeripherals} />

      {isConnected ? (
        <Text style={{ marginVertical: 20 }}>Đã kết nối với thiết bị BLE</Text>
      ) : (
        <Text style={{ marginVertical: 20 }}>Chưa kết nối thiết bị</Text>
      )}

      <Button
        title="Gửi dữ liệu"
        onPress={() =>
          writeDataToDevice(serviceUUID, characteristicUUID, value)
        }
      />
    </View>
  );

  // if (!cameraEnabled) {
  //   return (
  //     <>
  //       <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
  //       <ImageBackground
  //         source={require("./assets/Image/bacg.jpg")} // Đường dẫn tới hình nền của bạn
  //         style={{
  //           flex: 1, // Đảm bảo ảnh nền phủ toàn bộ không gian
  //           justifyContent: "center", // Căn giữa các phần tử con trong toàn bộ ứng dụng
  //           alignItems: "center", // Căn giữa các phần tử con trong toàn bộ ứng dụng
  //         }}
  //       >
  //         <LinearGradient
  //           colors={["#ffffff", "#2c2d5e"]} // Từ trắng sang đen
  //           style={{
  //             position: "absolute", // Để lớp phủ nằm trên ảnh nền
  //             top: 0,
  //             left: 0,
  //             right: 0,
  //             bottom: 0,
  //             opacity: 0.8,
  //           }}
  //         />
  //         <View style={styles.container}>
  //           {idFromQr && isConnected ? (
  //             <View style={styles.resultContainer}>
  //               {isConnected ? (
  //                 <View style={styles.container}>
  //                   <View style={styles.buttonContainer}>
  //                     {Array.from({ length: idFromQr.numberFloor }, (_, i) => (
  //                       <View style={styles.buttonCallContainer} key={i}>
  //                         <TouchableOpacity
  //                           style={styles.buttonCall}
  //                           key={i}
  //                           onPress={() => handleButtonPress(i)}
  //                         >
  //                           <Text style={styles.buttonText}>
  //                             {idFromQr.display[i]}
  //                           </Text>
  //                         </TouchableOpacity>
  //                       </View>
  //                     ))}
  //                   </View>
  //                   <View style={{ marginTop: 30 }}>
  //                     <TouchableOpacity
  //                       style={[
  //                         styles.buttonFunction,
  //                         {
  //                           backgroundColor: isHoldPressed
  //                             ? "#7b4415" // Màu đỏ khi nhấn
  //                             : "#fb970c", // Màu xanh khi thả
  //                           borderColor: isHoldPressed ? "#242322" : "#4a4848", // Viền đỏ khi nhấn, viền xanh khi thả
  //                           opacity: isHoldPressed ? 0.5 : 1,
  //                         },
  //                       ]}
  //                       key={"buttonhold"}
  //                       onPress={() => handleToogle()}
  //                     >
  //                       <Text style={styles.buttonTextFunction}>HOLD</Text>
  //                     </TouchableOpacity>
  //                   </View>
  //                   <View style={styles.containerRow}>
  //                     <View style={styles.buttonDoor}>
  //                       <TouchableOpacity
  //                         style={[
  //                           styles.buttonFunction,
  //                           {
  //                             backgroundColor: "#149d2b",
  //                             borderColor: "#06640e",
  //                           },
  //                         ]}
  //                         key={"buttonopen"}
  //                         onPress={() => handleButtonFunctionPress(6)}
  //                       >
  //                         <Text style={styles.buttonTextFunction}>OPEN</Text>
  //                       </TouchableOpacity>
  //                     </View>
  //                     <Button
  //                       title="Gửi dữ liệu"
  //                       onPress={() => setButton(true)}
  //                       disabled={!isConnected} // Chỉ gửi dữ liệu khi đã kết nối
  //                     />
  //                     <View style={styles.buttonDoor}>
  //                       <TouchableOpacity
  //                         style={[
  //                           styles.buttonFunction,
  //                           {
  //                             backgroundColor: "#c92107",
  //                             borderColor: "#830707",
  //                           },
  //                         ]}
  //                         key={"buttonclose"}
  //                         onPress={() => handleButtonFunctionPress(7)}
  //                       >
  //                         <Text style={styles.buttonTextFunction}>CLOSE</Text>
  //                       </TouchableOpacity>
  //                     </View>
  //                   </View>
  //                 </View>
  //               ) : (
  //                 <Text style={styles.smarttne}>ĐANG KẾT NỐI</Text>
  //               )}
  //             </View>
  //           ) : (
  //             <View style={styles.container}>
  //               <View style={styles.messageView}>
  //                 <Text style={styles.message}>
  //                   Cấp quyền camera để sử dụng ứng dụng
  //                 </Text>
  //               </View>
  //               <TouchableOpacity
  //                 style={styles.reconnectButton}
  //                 onPress={handlePermissionRequest}
  //               >
  //                 <Text style={styles.reconnectButtonText}>
  //                   QUÉT QR ĐỂ KẾT NỐI
  //                 </Text>
  //               </TouchableOpacity>
  //               <Button
  //                 title="Quét thiết bị BLE"
  //                 onPress={scanForPeripherals}
  //               />

  //               <View>
  //                 <TouchableOpacity
  //                   style={styles.reconnectButton}
  //                   onPress={handleReconnect}
  //                 >
  //                   <Text style={styles.reconnectButtonText}>KẾT NỐI LẠI</Text>
  //                 </TouchableOpacity>
  //               </View>
  //             </View>
  //           )}
  //           <View>
  //             <Text style={styles.logoText}>@tne.vn</Text>
  //           </View>
  //         </View>
  //       </ImageBackground>
  //     </>
  //   );
  // } else {
  //   return (
  //     <View style={styles.container}>
  //       <CameraView
  //         style={styles.camera}
  //         facing="back"
  //         onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
  //       />
  //       {scanned && (
  //         <Button title="Scan Again" onPress={() => setScanned(false)} />
  //       )}
  //     </View>
  //   );
  // }
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
