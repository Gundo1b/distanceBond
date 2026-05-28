import { Link, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase";

type ResetParams = {
  access_token?: string;
  code?: string;
  refresh_token?: string;
};

function readResetParams(url: string | null): ResetParams {
  if (!url) {
    return {};
  }

  const parsed = Linking.parse(url);
  const queryParams = parsed.queryParams ?? {};
  const params: ResetParams = {
    access_token:
      typeof queryParams.access_token === "string"
        ? queryParams.access_token
        : undefined,
    code: typeof queryParams.code === "string" ? queryParams.code : undefined,
    refresh_token:
      typeof queryParams.refresh_token === "string"
        ? queryParams.refresh_token
        : undefined,
  };

  const hash = url.split("#")[1];
  if (!hash) {
    return params;
  }

  const hashParams = new URLSearchParams(hash);
  return {
    access_token: params.access_token ?? hashParams.get("access_token") ?? undefined,
    code: params.code ?? hashParams.get("code") ?? undefined,
    refresh_token: params.refresh_token ?? hashParams.get("refresh_token") ?? undefined,
  };
}

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [preparingSession, setPreparingSession] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();
  const linkingUrl = Linking.useLinkingURL();

  const resetParams = useMemo(() => readResetParams(linkingUrl), [linkingUrl]);

  useEffect(() => {
    const prepareSession = async () => {
      setPreparingSession(true);

      if (resetParams.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(resetParams.code);
        if (error) {
          Alert.alert("Reset Link Error", error.message);
          setSessionReady(false);
        } else {
          setSessionReady(true);
        }
        setPreparingSession(false);
        return;
      }

      if (resetParams.access_token && resetParams.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: resetParams.access_token,
          refresh_token: resetParams.refresh_token,
        });
        if (error) {
          Alert.alert("Reset Link Error", error.message);
          setSessionReady(false);
        } else {
          setSessionReady(true);
        }
        setPreparingSession(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      setSessionReady(Boolean(data.session));
      setPreparingSession(false);
    };

    prepareSession();
  }, [resetParams.access_token, resetParams.code, resetParams.refresh_token]);

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill in both password fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login");
    Alert.alert("Password Updated", "You can now sign in with your new password.");
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topGlow} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Image
                source={require("./logog.png")}
                style={styles.logo}
                resizeMode="cover"
              />
              <Text style={styles.subtitle}>Create a new password</Text>
            </View>

            <View style={styles.form}>
              {preparingSession ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator color="#F24986" />
                  <Text style={styles.loadingText}>Preparing your reset link</Text>
                </View>
              ) : (
                <>
                  {!sessionReady && (
                    <Text style={styles.helperText}>
                      This reset link is missing or expired. Request a new link and try again.
                    </Text>
                  )}

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>New Password</Text>
                    <TextInput
                      placeholder="Enter your new password"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      style={styles.input}
                      editable={!loading && sessionReady}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                      placeholder="Confirm your new password"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      style={styles.input}
                      editable={!loading && sessionReady}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      (!sessionReady || loading) && styles.buttonDisabled,
                    ]}
                    onPress={handleUpdatePassword}
                    activeOpacity={0.8}
                    disabled={!sessionReady || loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonText}>Update Password</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View style={styles.footer}>
              <Link href="/login" asChild>
                <TouchableOpacity disabled={loading}>
                  <Text style={styles.footerLink}>Back to Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090F2F",
  },
  topGlow: {
    position: "absolute",
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#F24986",
    opacity: 0.12,
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 20,
  },
  logo: {
    width: 280,
    height: 220,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 8,
  },
  form: {
    width: "100%",
  },
  loadingState: {
    alignItems: "center",
    gap: 12,
    minHeight: 160,
    justifyContent: "center",
  },
  loadingText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
  },
  helperText: {
    color: "#FFB199",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#F24986",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#F24986",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
    minHeight: 56,
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
  },
  footerLink: {
    color: "#F24986",
    fontSize: 14,
    fontWeight: "700",
  },
});
