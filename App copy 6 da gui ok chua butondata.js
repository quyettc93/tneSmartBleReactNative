import React, { useState, useEffect } from "react";
import { Button, View, Text, Alert, TextInput, StyleSheet } from "react-native";
import RNBluetoothClassic from "react-native-bluetooth-classic";
import { CameraView, useCameraPermissions } from "expo-camera";

// QR scanner and Bluetooth handler
export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [idDeviceAddPass, setIdDeviceAddPass] = useState(null);
  const [isConnected, setIsConnected] = useState(false); // Correctly managing connection state
  const [buttonCount, setButtonCount] = useState(0);
  const [macAddress, setMacAddress] = useState(""); // MAC address of the Bluetooth device

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

  const scanForDevices = async (deviceNameToConnect) => {
    try {
      const initialized = await initializeBluetooth();
      if (!initialized) return;

      // Cancel discovery if already scanning
      await RNBluetoothClassic.cancelDiscovery();

      // Start discovery for Bluetooth devices
      const discoveredDevices = await RNBluetoothClassic.startDiscovery();
      console.log("Devices:", discoveredDevices);

      // Find the device with the name or address
      const targetDevice = discoveredDevices.find(
        (device) =>
          device.name === deviceNameToConnect ||
          device.address === deviceNameToConnect
      );

      if (targetDevice) {
        setMacAddress(targetDevice.address); // Save MAC address for later use
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
        setIsConnected(true); // Properly using setIsConnected
      } else {
        Alert.alert("Connection failed", `Failed to connect to ${device.name}`);
      }
    } catch (error) {
      console.error("Connection Error:", error);
      Alert.alert("Error", "An error occurred while connecting to the device");
    }
  };
  //////////
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
      setIdDeviceAddPass(parsedData); // Save QR data
      setCameraEnabled(false); // Turn off camera after scan
      scanForDevices(parsedData.name); // Start scanning for devices after scanning QR code
    } catch (error) {
      Alert.alert("Error", "Invalid QR Code data");
    }
  };

  const handleButtonPress = (buttonNumber) => {
    if (isConnected) {
      // Send data to the device via MAC address using writeToDevice
      RNBluetoothClassic.writeToDevice(
        macAddress,
        `Button ${buttonNumber} pressed`
      )
        .then(() => {
          Alert.alert(`Sent: Button ${buttonNumber}`);
        })
        .catch((error) => {
          console.error("Send Error:", error);
          Alert.alert("Error", "Failed to send data");
        });
    } else {
      Alert.alert(
        "Bluetooth not connected",
        "Please connect to a Bluetooth device first."
      );
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
            {isConnected && (
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Enter number of buttons"
                  keyboardType="numeric"
                  onChangeText={(text) => setButtonCount(Number(text))}
                  value={buttonCount > 0 ? buttonCount.toString() : ""}
                />
                {Array.from({ length: buttonCount }, (_, i) => (
                  <Button
                    key={i}
                    title={`Button ${i + 1}`}
                    onPress={() => handleButtonPress(i + 1)}
                  />
                ))}
              </View>
            )}
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
  input: {
    width: 200,
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 20,
    textAlign: "center",
  },
});
