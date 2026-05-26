import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current user's profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, partner_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setUserName(profile.full_name);

      if (profile.partner_id) {
        // Get partner's profile
        const { data: partner, error: partnerError } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", profile.partner_id)
          .single();

        if (partnerError) throw partnerError;
        setPartnerName(partner.full_name);
      }
    } catch (error: any) {
      console.error("Home fetchData error:", error);
    } finally {
      setLoading(false);
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
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerLabel}>My partner is</Text>
              <Text style={styles.partnerName}>{partnerName || "Syncing..."}</Text>
            </View>
            <Image
              source={require("./logog.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.main}>
            {/* Main content is now intentionally empty as per request */}
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
    right: -150,
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
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 40,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerLabel: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  partnerName: {
    color: "#FFB199",
    fontSize: 24,
    fontWeight: "800",
    textShadowColor: "rgba(255, 177, 153, 0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginTop: 4,
  },
  logo: {
    width: 120,
    height: 40,
  },
  main: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutButton: {
    alignSelf: "center",
    marginBottom: 20,
    padding: 10,
  },
  logoutText: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 14,
    fontWeight: "600",
  },
});
