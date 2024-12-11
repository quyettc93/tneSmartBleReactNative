import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import { Button, StyleSheet, Text, View, Alert } from "react-native";

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false); // Trạng thái bật camera
  const [qrData, setQrData] = useState(null); // Dữ liệu QR đã quét

  const handlePermissionRequest = () => {
    requestPermission().then(() => {
      if (permission.granted) {
        setCameraEnabled(true); // Nếu quyền được cấp, bật camera
      }
    });
  };

  const handleBarcodeScanned = ({ type, data }) => {
    setScanned(true);
    setQrData(data); // Lưu dữ liệu QR quét được
    setCameraEnabled(false); // Tắt camera sau khi quét xong
  };

  if (!cameraEnabled) {
    return (
      <View style={styles.container}>
        {qrData ? (
          // Hiển thị kết quả quét QR ở đây
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>QR Data: {qrData}</Text>
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
