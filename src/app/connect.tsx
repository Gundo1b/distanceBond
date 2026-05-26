import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Share,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase";

export default function Connect() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [myCode, setMyCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchProfile();

    // Set up real-time listener for partner connection
    let subscription: any;
    
    const setupListener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      subscription = supabase
        .channel('public:profiles')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles',
          filter: `id=eq.${user.id}`
        }, (payload) => {
          console.log('Profile update detected:', payload.new);
          if (payload.new.partner_id) {
            Alert.alert("Hearts Synced!", "Your partner has connected with you!");
            router.replace("/home");
          }
        })
        .subscribe();
    };

    setupListener();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("couple_code, partner_id")
        .eq("id", user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.partner_id) {
        router.replace("/home");
        return;
      }

      if (data?.couple_code) {
        setMyCode(data.couple_code);
      } else {
        await generateNewCode(user.id);
      }
    } catch (error: any) {
      console.error("Fetch profile error:", error);
      Alert.alert("Connection Error", "Could not load your connection details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateNewCode = async (userId: string) => {
    try {
      const { data: newCode, error: genError } = await supabase.rpc("generate_couple_code");
      if (genError) throw genError;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ couple_code: newCode })
        .eq("id", userId);
      
      if (updateError) throw updateError;
      
      setMyCode(newCode);
    } catch (error: any) {
      console.error("Generate code error:", error);
      Alert.alert("Error", "Failed to generate your connection code. Ensure you have run the SQL schema in Supabase.");
    }
  };

  const handleConnect = async () => {
    if (!inputCode || inputCode.length < 6) {
      Alert.alert("Invalid Code", "Please enter a valid 6-character partner code.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("connect_couple", {
        target_code: inputCode.toUpperCase(),
      });

      if (error) throw error;

      if (data.error) {
        Alert.alert("Error", data.error);
      } else {
        Alert.alert("Connected!", `You are now synced with ${data.partner_name}!`);
        router.replace("/home");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!myCode) return;
    try {
      await Share.share({
        message: `Connect with me on HeartSync! My connection code is: ${myCode}`,
      });
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/welcome");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F24986" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topGlow} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={require("./logog.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Sync Your Hearts</Text>
            <Text style={styles.subtitle}>Connect with your partner to start your journey.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Connection Code</Text>
            <View style={styles.codeCard}>
              <Text style={styles.myCodeText}>{myCode}</Text>
              <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                <Text style={styles.shareButtonText}>Share with Partner</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.infoText}>Send this code to your partner so they can connect with you.</Text>
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enter Partner's Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Paste code here"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={inputCode}
              onChangeText={(text) => setInputCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
            />
            <TouchableOpacity 
              style={[styles.connectButton, submitting && styles.buttonDisabled]} 
              onPress={handleConnect}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.connectButtonText}>Connect Now</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090F2F",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#090F2F",
    justifyContent: "center",
    alignItems: "center",
  },
  topGlow: {
    position: "absolute",
    top: -150,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "#F24986",
    opacity: 0.1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 280,
    height: 100,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginTop: 8,
  },
  section: {
    width: "100%",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  codeCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  myCodeText: {
    color: "#FFB199",
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: 4,
    marginBottom: 16,
    textShadowColor: "rgba(255, 177, 153, 0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  shareButton: {
    backgroundColor: "#F24986",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 50,
  },
  shareButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  infoText: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 40,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dividerText: {
    color: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: "#FFFFFF",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "700",
    letterSpacing: 2,
  },
  connectButton: {
    backgroundColor: "#F24986",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#F24986",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  logoutButton: {
    alignSelf: "center",
    marginTop: 40,
    padding: 10,
  },
  logoutText: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 14,
    fontWeight: "600",
  },
});
