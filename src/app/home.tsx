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
import { SymbolView } from "expo-symbols";
import { supabase } from "../lib/supabase";

const tabs = [
  {
    label: "Home",
    icon: { ios: "house.fill", android: "home_filled", web: "home" },
    fallback: "H",
  },
  {
    label: "Challenges",
    icon: { ios: "trophy.fill", android: "trophy", web: "trophy" },
    fallback: "C",
  },
  {
    label: "Games",
    icon: {
      ios: "gamecontroller.fill",
      android: "sports_esports",
      web: "sports_esports",
    },
    fallback: "G",
  },
  {
    label: "Pet",
    icon: { ios: "pawprint.fill", android: "pets", web: "pets" },
    fallback: "P",
  },
  {
    label: "Profile",
    icon: {
      ios: "person.crop.circle.fill",
      android: "person",
      web: "person",
    },
    fallback: "P",
  },
] as const;

const quickTabs = [
  {
    label: "Game",
    icon: {
      ios: "gamecontroller.fill",
      android: "sports_esports",
      web: "sports_esports",
    },
    fallback: "G",
  },
  {
    label: "Chat",
    icon: { ios: "bubble.left.and.bubble.right.fill", android: "chat", web: "chat" },
    fallback: "C",
  },
  {
    label: "Call",
    icon: { ios: "phone.fill", android: "call", web: "call" },
    fallback: "C",
  },
  {
    label: "Date",
    icon: { ios: "calendar", android: "calendar_month", web: "calendar_month" },
    fallback: "D",
  },
] as const;

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

          <View style={styles.quickTabBar}>
            {quickTabs.map((tab) => (
              <TouchableOpacity
                key={tab.label}
                style={styles.quickTabItem}
                activeOpacity={0.8}
                onPress={tab.label === "Game" ? () => router.push("/game") : undefined}
              >
                <View style={styles.quickIconCircle}>
                  <SymbolView
                    name={tab.icon}
                    size={14}
                    tintColor="#FFB199"
                    fallback={<Text style={styles.quickFallbackIcon}>{tab.fallback}</Text>}
                  />
                </View>
                <Text style={styles.quickTabText}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.tabBar}>
            {tabs.map((tab) => {
              const isActive = tab.label === "Home";

              return (
                <TouchableOpacity
                  key={tab.label}
                  style={[styles.tabItem, isActive && styles.activeTabItem]}
                  activeOpacity={0.8}
                  onPress={tab.label === "Games" ? () => router.push("/game") : undefined}
                >
                  <SymbolView
                    name={tab.icon}
                    size={21}
                    tintColor={isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.55)"}
                    fallback={
                      <Text
                        style={[styles.fallbackIcon, isActive && styles.activeTabText]}
                      >
                        {tab.fallback}
                      </Text>
                    }
                  />
                  <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 18,
    marginBottom: 18,
    padding: 6,
  },
  quickTabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 6,
  },
  quickTabItem: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 3,
  },
  quickIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 177, 153, 0.1)",
  },
  quickTabText: {
    color: "rgba(255, 255, 255, 0.78)",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  quickFallbackIcon: {
    color: "#FFB199",
    fontSize: 12,
    fontWeight: "800",
  },
  tabItem: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingHorizontal: 4,
    gap: 3,
  },
  activeTabItem: {
    backgroundColor: "#F24986",
    shadowColor: "#F24986",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  fallbackIcon: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 14,
    fontWeight: "800",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
});
