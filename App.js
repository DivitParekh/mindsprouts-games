import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  PermissionsAndroid,
  Alert,
  Linking,
  Platform,
} from "react-native";
import RNFS from "react-native-fs";
import DeviceInfo from "react-native-device-info";
import IntentLauncher from "react-native-intent-launcher";
import { games } from "./games";

export default function App() {
  const [installedGames, setInstalledGames] = useState({});

  useEffect(() => {
    checkInstalled();
  }, []);

  // ✅ Check if game is installed
  const checkInstalled = async () => {
    const result = {};
    for (const game of games) {
      const installed = await DeviceInfo.isAppInstalled(game.packageName);
      result[game.packageName] = installed;
    }
    setInstalledGames(result);
  };

  // ✅ Request proper storage permission (for Android 11+)
  const requestStoragePermission = async () => {
    if (Platform.Version >= 30) {
      // Android 11+
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.MANAGE_EXTERNAL_STORAGE
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            "Permission Needed",
            "Please allow 'All files access' for MindSprouts Hub to install games.",
            [
              {
                text: "Open Settings",
                onPress: () =>
                  Linking.openSettings().catch(() =>
                    Alert.alert("Error", "Cannot open settings")
                  ),
              },
              { text: "Cancel", style: "cancel" },
            ]
          );
          return false;
        }
        return true;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      // Android 10 or lower
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  };

  // ✅ Local APK installation logic (no internet required)
  const installGame = async (game) => {
    try {
      const ok = await requestStoragePermission();
      if (!ok) return;

      const src = `games/${game.fileName}`;
      const dest = `${RNFS.DownloadDirectoryPath}/${game.fileName}`;

      await RNFS.copyFileAssets(src, dest);

      const apkUri = `file://${dest}`;
      IntentLauncher.startActivity({
        action: "android.intent.action.VIEW",
        data: apkUri,
        type: "application/vnd.android.package-archive",
        flags: 1 << 1,
      });
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to install the APK");
    }
  };

  const playGame = (pkg) => {
    try {
      IntentLauncher.startAppByPackageName(pkg);
    } catch (e) {
      Alert.alert("Error", "Unable to launch game.");
    }
  };

  const renderGame = ({ item }) => {
    const isInstalled = installedGames[item.packageName];
    return (
      <View style={styles.card}>
        <Image source={item.image} style={styles.image} />
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.desc}>{item.desc}</Text>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: isInstalled ? "#00C853" : "#FF4081" },
          ]}
          onPress={() =>
            isInstalled ? playGame(item.packageName) : installGame(item)
          }
        >
          <Text style={styles.buttonText}>
            {isInstalled ? "▶ Play" : "⬇ Install"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🎮 MindSprouts Hub</Text>
      <FlatList
        data={games}
        renderItem={renderGame}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ff0099",
    paddingTop: 50,
  },
  header: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  row: {
    justifyContent: "space-around",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    padding: 15,
    width: "45%",
    alignItems: "center",
    marginVertical: 10,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 10,
  },
  title: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  desc: {
    color: "#fefefe",
    fontSize: 12,
    textAlign: "center",
    marginVertical: 5,
  },
  button: {
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
