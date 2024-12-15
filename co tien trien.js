import React, { useState, useEffect } from "react";
import { Button, Text, View, FlatList, TouchableOpacity } from "react-native";
import { BleManager } from "react-native-ble-plx";

const bleManager = new BleManager(); // Tạo đối tượng BLE Manager
let connectedDevice = null; // Lưu thiết bị đã kết nối

const App = () => {
  const [devices, setDevices] = useState([]); // Lưu danh sách các thiết bị tìm thấy
  const [connected, setConnected] = useState(false); // Theo dõi trạng thái kết nối
  const [button, setButton] = useState(false); // Biến theo dõi trạng thái button
  const [connectedDevice, setConnectedDevice] = useState(null); // Lưu thiết bị đã kết nối
  const serviceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"; // Thay bằng UUID của dịch vụ
  const characteristicUUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"; // Thay bằng UUID của đặc điểm
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

      if (device && device.localName) {
        console.log("Tìm thấy thiết bị:", device.localName);

        setDevices((prevDevices) => {
          if (!prevDevices.find((d) => d.id === device.id)) {
            return [...prevDevices, device]; // Thêm thiết bị mới nếu chưa có trong danh sách
          }
          return prevDevices;
        });
      }
    });

    // Dừng quét sau 10 giây
    setTimeout(() => {
      bleManager.stopDeviceScan();
      console.log("Dừng quét thiết bị.");
    }, 2000);
  };

  // Hàm kết nối với thiết bị
  const connectToPeripheral = (device) => {
    console.log(
      `Đang kết nối với thiết bị: ${device.localName} (${device.id})`
    );
    bleManager
      .connectToDevice(device.id)
      .then((connectedDevice) => {
        console.log("Đã kết nối thành công:", connectedDevice);
        setConnectedDevice(connectedDevice); // Lưu lại thiết bị đã kết nối
        setConnected(true);
        return connectedDevice.discoverAllServicesAndCharacteristics(); // Khám phá các dịch vụ
      })
      .catch((error) => {
        console.error("Lỗi khi kết nối với thiết bị:", error);
      });
  };

  // Hàm gửi dữ liệu
  const writeDataToDevice = (serviceUUID, characteristicUUID, value) => {
    if (!connectedDevice) {
      console.log("Chưa kết nối với thiết bị.");
      return;
    }

    connectedDevice
      .writeCharacteristicWithResponseForService(
        serviceUUID,
        characteristicUUID,
        value
      )
      .then(() => {
        console.log("Gửi dữ liệu thành công.");
      })
      .catch((error) => {
        console.error("Lỗi khi gửi dữ liệu:", error);
      });
  };

  // useEffect theo dõi biến button
  useEffect(() => {
    if (button && connected) {
      writeDataToDevice(serviceUUID, characteristicUUID, value);

      // Reset trạng thái button sau khi gửi xong
      setButton(false);
    }
  }, [button, connected]); // Theo dõi button và trạng thái kết nối

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Button title="Quét thiết bị BLE" onPress={scanForPeripherals} />

      {connected ? (
        <Text style={{ marginVertical: 20 }}>Đã kết nối với thiết bị BLE</Text>
      ) : (
        <Text style={{ marginVertical: 20 }}>Chưa kết nối thiết bị</Text>
      )}

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => connectToPeripheral(item)}
            style={{ padding: 10, backgroundColor: "#ddd", marginVertical: 5 }}
          >
            <Text>{item.localName || "Không rõ tên"}</Text>
            <Text>ID: {item.id}</Text>
          </TouchableOpacity>
        )}
      />

      <Button
        title="Gửi dữ liệu"
        onPress={() => setButton(true)}
        disabled={!connected} // Chỉ gửi dữ liệu khi đã kết nối
      />
    </View>
  );
};

export default App;
