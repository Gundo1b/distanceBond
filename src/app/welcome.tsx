import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";

export default function Welcome() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isShortScreen = height < 700;
  const horizontalPadding = width < 380 ? 18 : 28;
  const contentWidth = Math.min(width - horizontalPadding * 2, 430);
  const illustrationWidth = Math.min(width * (width < 380 ? 1.34 : 1.22), 500);
  const illustrationHeight = illustrationWidth * 1.5;
  const illustrationTop = height * (isShortScreen ? 0.115 : 0.13);
  const logoWidth = Math.min(contentWidth * 1.25, 420);
  const logoHeight = logoWidth * 0.42;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.topColor} />
      <Image
        source={require("./couple.png")}
        style={[
          styles.couple,
          {
            width: illustrationWidth,
            height: illustrationHeight,
            top: illustrationTop,
            left: (width - illustrationWidth) / 2,
          },
        ]}
        resizeMode="contain"
      />
      <View style={styles.imageTint} />
      <View style={styles.bottomColor} />

      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.content,
            {
              width: contentWidth,
              paddingTop: isShortScreen ? 6 : 12,
              paddingBottom: isShortScreen ? 12 : 18,
            },
          ]}
        >
          <View style={styles.brand}>
            <Image
              source={require("./logog.png")}
              resizeMode="contain"
              style={[
                styles.logoImage,
                {
                  width: logoWidth,
                  height: isShortScreen ? logoHeight * 0.8 : logoHeight * 0.88,
                },
              ]}
            />
            <Text style={[styles.tagline, isShortScreen && styles.taglineCompact]}>
              Love is not about distance,{"\n"}
              <Text style={styles.taglineHighlight}>it's about connection.</Text>
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => router.push("/register")}
              style={styles.signUpButton}
            >
              <Text style={styles.signUpText}>Sign Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => router.push("/login")}
              style={styles.loginButton}
            >
              <Text style={styles.loginText}>Log In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.replace("/home")}
              style={styles.guestButton}
            >
              <Text style={styles.guestText}>Continue as guest</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#090F2F",
  },
  topColor: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "53%",
    backgroundColor: "#EC718F",
    opacity: 0.82,
  },
  couple: {
    position: "absolute",
  },
  imageTint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "70%",
    backgroundColor: "rgba(30, 24, 84, 0.16)",
  },
  bottomColor: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "29%",
    backgroundColor: "rgba(7, 13, 45, 0.97)",
  },
  safeArea: {
    flex: 1,
    alignItems: "center",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    alignSelf: "center",
  },
  brand: {
    width: "100%",
    alignItems: "center",
  },
  logoImage: {
    marginBottom: 4,
  },
  tagline: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 19,
    lineHeight: 28,
    marginTop: 12,
    textAlign: "center",
    fontWeight: "400",
    letterSpacing: 0.5,
  },
  taglineHighlight: {
    color: "#FFB199",
    fontWeight: "800",
    textShadowColor: "rgba(255, 177, 153, 0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  taglineCompact: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  actions: {
    gap: 12,
  },
  signUpButton: {
    height: 52,
    borderRadius: 17,
    backgroundColor: "#F24986",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F24986",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  loginButton: {
    height: 52,
    borderRadius: 17,
    backgroundColor: "rgba(49, 52, 105, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  guestButton: {
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  signUpText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  loginText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  guestText: {
    color: "rgba(255, 255, 255, 0.78)",
    fontSize: 12,
    fontWeight: "500",
  },
});
