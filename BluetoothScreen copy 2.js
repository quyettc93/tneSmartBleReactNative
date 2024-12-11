import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import { Button, StyleSheet, Text, View, Alert } from "react-native";

export default function Appf() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false); // Trạng thái bật camera

  const handlePermissionRequest = () => {
    requestPermission().then(() => {
      if (permission.granted) {
        setCameraEnabled(true); // Nếu quyền được cấp, bật camera
      }
    });
  };

  const handleBarcodeScanned = ({ type, data }) => {
    setScanned(true);
    Alert.alert("Scanned!", `Type: ${type}\nData: ${data}`);
  };

  if (!cameraEnabled) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          We need your permission to show the camera
        </Text>
        <Button
          onPress={handlePermissionRequest}
          title="Grant Camera Permission"
        />
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
  container: {
    flex: 1,
    justifyContent: "center",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
});
