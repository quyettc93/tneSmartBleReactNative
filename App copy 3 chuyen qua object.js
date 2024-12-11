import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import { Button, StyleSheet, Text, View, Alert } from "react-native";

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false); // Trạng thái bật camera
  const [idDeviceAddPass, setIdDeviceAddPass] = useState(null); // Biến lưu đối tượng dữ liệu QR đã quét

  const handlePermissionRequest = () => {
    requestPermission().then(() => {
      if (permission.granted) {
        setCameraEnabled(true); // Nếu quyền được cấp, bật camera
      }
    });
  };

  const handleBarcodeScanned = ({ type, data }) => {
    setScanned(true);
    try {
      // Chuyển chuỗi JSON thành đối tượng JavaScript và lưu vào biến idDeviceAddPass
      const parsedData = JSON.parse(data);
      console.log(data);
      setIdDeviceAddPass(parsedData); // Lưu dữ liệu QR thành đối tượng
      setCameraEnabled(false); // Tắt camera sau khi quét xong
    } catch (error) {
      Alert.alert("Error", "Invalid QR Code data");
    }
  };

  if (!cameraEnabled) {
    return (
      <View style={styles.container}>
        {idDeviceAddPass ? (
          // Hiển thị kết quả quét QR ở đây
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
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  resultContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  resultText: {
    fontSize: 18,
    fontWeight: "bold",
    margin: 10,
  },
});
