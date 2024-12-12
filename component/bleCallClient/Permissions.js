import { Text, TouchableOpacity, StyleSheet } from "react-native";
function Permissions({ requestPermissions }) {
  return (
    <TouchableOpacity onPress={() => requestPermissions()}>
      <Text>Request Permissions</Text>
    </TouchableOpacity>
  );
}
export default Permissions;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
