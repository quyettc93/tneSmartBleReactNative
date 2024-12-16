import React, { useState, useEffect } from "react";
import { Button, Text, View } from "react-native";
import { BleManager } from "react-native-ble-plx";

const bleManager = new BleManager(); // Tạo đối tượng BLE Manager

const App = () => {
  const [devices, setDevices] = useState([]); // Lưu danh sách các thiết bị tìm thấy
  const [connected, setConnected] = useState(false); // Theo dõi trạng thái kết nối
  const [button, setButton] = useState(false); // Biến theo dõi trạng thái button
  const [connectedDevice, setConnectedDevice] = useState(null); // Lưu thiết bị đã kết nối
  const serviceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const characteristicUUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
  const value = "SGVsbG87"; // Dữ liệu cần gửi (ở định dạng base64)

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
      setConnected(true);
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
      if (button && connected) {
        await writeDataToDevice(serviceUUID, characteristicUUID, value);
        // Reset trạng thái button sau khi gửi xong
        setButton(false);
      }
    };

    sendData(); // Gọi hàm sendData khi có sự thay đổi
  }, [button, connected]); // Theo dõi button và trạng thái kết nối

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Button title="Quét thiết bị BLE" onPress={scanForPeripherals} />

      {connected ? (
        <Text style={{ marginVertical: 20 }}>Đã kết nối với thiết bị BLE</Text>
      ) : (
        <Text style={{ marginVertical: 20 }}>Chưa kết nối thiết bị</Text>
      )}

      <Button
        title="Gửi dữ liệu"
        onPress={() => setButton(true)}
        disabled={!connected} // Chỉ gửi dữ liệu khi đã kết nối
      />
    </View>
  );
};

export default App;
