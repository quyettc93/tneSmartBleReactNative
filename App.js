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
import RNBluetoothClassic from "react-native-bluetooth-classic";
import { CameraView, useCameraPermissions } from "expo-camera";
// import buttonData from "./buttonData.json"; // Import the custom button data
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dataSent from "./sentdata";

// QR scanner and Bluetooth handler
export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [idDeviceAddPass, setIdDeviceAddPass] = useState(null);
  const [isConnected, setIsConnected] = useState(false); // Correctly managing connection state
  const [buttonCount, setButtonCount] = useState(0);
  const [macAddress, setMacAddress] = useState(""); // MAC address of the Bluetooth device
  const [sentData, setSentData] = useState(""); // New state to store the sent data
  const [show, setShow] = useState([]); // New state to store the sent data
  const [isHoldPressed, setIsHoldPressed] = useState(false);
  const [callBinary, setCallBinary] = useState([0, 0, 0, 0, 0, 0, 0, 0]);
  const [funcBinary, setFuncBinary] = useState([0, 0, 0, 0, 0, 0, 0, 0]);
  const [arrSentData, setArrSentData] = useState([
    "0x00",
    "0x00",
    "0x00",
    "0x00",
  ]);

  // console.log(isConnected);
  // console.log(isHoldPressed);
  // console.log(callBinary);
  // console.log(funcBinary);
  // console.log(arrSentData);

  useEffect(() => {
    if (isConnected) {
      // Chuyển mảng nhị phân thành chuỗi nhị phân
      const binaryString = callBinary.join("");
      // Chuyển chuỗi nhị phân thành số thập phân rồi chuyển thành thập lục phân
      let hexValue = parseInt(binaryString, 2).toString(16).toUpperCase();
      hexValue = hexValue.padStart(2, "0"); // Đảm bảo đủ 2 ký tự
      const formattedHexValue = `0x${hexValue}`;
      console.log(`SentCall: ${formattedHexValue}`);

      // Cập nhật arrSentData
      setArrSentData((prevState) => {
        const newState = [...prevState];
        newState[0] = formattedHexValue;
        newState[1] = "0x00";
        newState[2] = "0x00";
        return newState;
      });
    }
  }, [callBinary]);

  useEffect(() => {
    if (isConnected) {
      // Chuyển mảng nhị phân thành chuỗi nhị phân
      const binaryString = funcBinary.join("");
      // Chuyển chuỗi nhị phân thành số thập phân rồi chuyển thành thập lục phân
      let hexValue = parseInt(binaryString, 2).toString(16).toUpperCase();
      hexValue = hexValue.padStart(2, "0"); // Đảm bảo đủ 2 ký tự
      const formattedHexValue = `0x${hexValue}`;
      console.log(`SentFunction: ${formattedHexValue}`);

      // Gửi dữ liệu Bluetooth
      setArrSentData((prevState) => {
        const newState = [...prevState];
        newState[1] = "0x00";
        newState[2] = "0x00";
        newState[3] = formattedHexValue;
        return newState;
      });
    }
  }, [funcBinary]);

  useEffect(() => {
    if (isConnected) {
      senDataToBluetooth();
    }
  }, [arrSentData]);

  useEffect(() => {
    if (isConnected) {
      let newState = [...funcBinary];
      newState[5] = isHoldPressed ? 1 : 0;
      setFuncBinary(newState);
    }
  }, [isHoldPressed]);

  //ket noi voi thiet bij truoc do da ket noi
  const saveLastDevice = async (data) => {
    try {
      await AsyncStorage.setItem("LAST_DEVICE", data);
      console.log("Last connected device saved:", data);
    } catch (error) {
      console.error("Error saving last connected device:", error);
    }
  };

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

  //nut ket noi lai
  const handleReconnect = async () => {
    console.log("Reconnecting to last device");
    const lastDevice = await getLastDevice();
    console.log(`vao chua ${lastDevice}`);
    const parsedData = JSON.parse(lastDevice);
    if (parsedData) {
      connectToDevice(parsedData.name);
      setCameraEnabled(false); // Turn off camera after scan
      setMacAddress(parsedData.name); // Assuming QR data contains mac address
      setButtonCount(parsedData.count);
      setShow(parsedData.show);
      setIdDeviceAddPass(parsedData); // Save QR data
    } else {
      Alert.alert("No device", "No previously connected device found.");
    }
  };

  // //âm thanh
  let soundObject = null;

  // Hàm phát âm thanh
  const playSound = async () => {
    try {
      if (soundObject === null) {
        soundObject = new Audio.Sound();
        await soundObject.loadAsync(require("./assets/Audio/button.mp3"));
      }
      await soundObject.replayAsync();
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };
  // console.log(isHoldPressed);
  // console.log(show);
  // console.log(sentData);

  // Bluetooth connection logic
  const requestBluetoothPermissions = async () => {
    const { PermissionsAndroid, Platform } = require("react-native");
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

  // Removed the scanForDevices function
  // const connectToDevice = async (macAddress) => {
  //   try {
  //     // console.log(macAddress);
  //     const connected = await RNBluetoothClassic.connectToDevice(macAddress);
  //     if (connected) {
  //       // Alert.alert(
  //       //   "Connected",
  //       //   `Connected to device with MAC address: ${macAddress}`
  //       // );
  //       setIsConnected(true); // Properly using setIsConnected
  //     } else {
  //       Alert.alert(
  //         "Connection failed",
  //         `Failed to connect to device with MAC address: ${macAddress}`
  //       );
  //     }
  //   } catch (error) {
  //     console.error("Connection Error:", error);
  //     Alert.alert("Error", "An error occurred while connecting to the device");
  //   }
  // };

  const connectToDevice = async (macAddress, parsedData) => {
    try {
      console.log(`$da ton tai${parsedData}`);
      const connected = await RNBluetoothClassic.connectToDevice(macAddress);
      if (connected) {
        setIsConnected(true);
        if (parsedData) {
          await saveLastDevice(parsedData); // Lưu thông tin thiết bị đã kết nối
        }
      } else {
        Alert.alert(
          "Connection failed",
          `Failed to connect to device with MAC address: ${macAddress}`
        );
      }
    } catch (error) {
      console.error("Connection Error:", error);
      Alert.alert("Error", "Turn on bluetooth and pair then try again");
    }
  };

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
      // console.log(data);
      const parsedData = JSON.parse(data);
      setIdDeviceAddPass(parsedData); // Save QR data
      setCameraEnabled(false); // Turn off camera after scan
      setMacAddress(parsedData.name); // Assuming QR data contains mac address
      connectToDevice(parsedData.name, data); // Connect directly using MAC address from QR code
      setButtonCount(parsedData.count);
      setShow(parsedData.show);
      // console.log(show);
    } catch (error) {
      Alert.alert("Error", "Invalid QR Code data");
    }
  };
  const handleToogle = () => {
    playSound();
    setIsHoldPressed((e) => !e);
  };

  const senDataToBluetooth = () => {
    RNBluetoothClassic.writeToDevice(macAddress, arrSentData)
      .then(() => {
        console.log(`Data sent successfully ${arrSentData}`);
        setSentData(arrSentData);
      })
      .catch((error) => {
        console.error("Send Error:", error);
        Alert.alert("Error", "Failed to send data");
      });
  };
  const handleButtonPress = (buttonNumber) => {
    playSound(); // Play sound when button is pressed
    if (isConnected) {
      const numberFloor = 7; //0 đến 7 là thành 8 tầng
      setCallBinary((prev) => {
        const newCallBinary = [...prev];
        newCallBinary[numberFloor - buttonNumber] = 1;
        return newCallBinary;
      });

      setTimeout(() => {
        setCallBinary((prevState) => {
          const newState = [...prevState];
          newState[numberFloor - buttonNumber] = 0; // Đặt lại giá trị về 0 sau 1 giây
          return newState;
        });
      }, 1000);
    } else {
      Alert.alert(
        "Bluetooth not connected",
        "Please connect to a Bluetooth device first."
      );
    }
  };
  //function button open and close
  const handleButtonFunctionPress = (buttonFunction) => {
    playSound(); // Play sound when button is pressed
    if (isConnected) {
      setFuncBinary((prev) => {
        const newCallBinary = [...prev];
        newCallBinary[buttonFunction] = 1;
        return newCallBinary;
      });

      setTimeout(() => {
        setFuncBinary((prevState) => {
          const newState = [...prevState];
          newState[buttonFunction] = 0; // Đặt lại giá trị về 0 sau 1 giây
          return newState;
        });
      }, 500);
    } else {
      Alert.alert(
        "Bluetooth not connected",
        "Please connect to a Bluetooth device first."
      );
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
            {idDeviceAddPass ? (
              <View style={styles.resultContainer}>
                {isConnected ? (
                  <View style={styles.container}>
                    <View style={styles.buttonContainer}>
                      {Array.from({ length: buttonCount }, (_, i) => (
                        <View style={styles.buttonCallContainer} key={i}>
                          <TouchableOpacity
                            style={styles.buttonCall}
                            key={i}
                            onPress={() => handleButtonPress(i)}
                          >
                            <Text style={styles.buttonText}>{show[i]}</Text>
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
                        onPress={() => handleToogle()}
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
