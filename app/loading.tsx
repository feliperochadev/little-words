import { View, Image, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/theme';

export default function LoadingScreen() {
  return (
    <View style={styles.splash}>
      <StatusBar style="dark" />
      <Image source={require('@/assets/icon.png')} style={styles.icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 100,
    height: 100,
    borderRadius: 24,
  },
});
