import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { View, ActivityIndicator } from "react-native";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [hasPartner, setHasPartner] = useState<boolean | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkPartnerStatus(session.user.id);
      } else {
        setHasPartner(false);
        setInitialized(true);
      }
    });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          checkPartnerStatus(session.user.id);
        } else {
          setHasPartner(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkPartnerStatus = async (userId: string) => {
    try {
      console.log("Checking partner status for:", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("partner_id")
        .eq("id", userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log("No profile found, user likely just registered.");
          setHasPartner(false);
        } else {
          console.error("Supabase profile error:", error);
          // If the table doesn't exist, we'll still let them in but they might get errors later
          setHasPartner(false);
        }
      } else {
        setHasPartner(!!data?.partner_id);
      }
    } catch (err) {
      console.error("Critical error in checkPartnerStatus:", err);
      setHasPartner(false);
    } finally {
      setInitialized(true);
    }
  };

  useEffect(() => {
    if (!initialized) return;

    const rootSegment = segments[0];
    const isAuthProtected = rootSegment === "home" || rootSegment === "connect";
    const isAuthScreen = rootSegment === "login" || rootSegment === "register" || rootSegment === "welcome" || rootSegment === undefined;

    if (!session && isAuthProtected) {
      router.replace("/welcome");
    } else if (session) {
      if (!hasPartner && rootSegment !== "connect") {
        router.replace("/connect");
      } else if (hasPartner && (rootSegment === "connect" || isAuthScreen)) {
        router.replace("/home");
      }
    }
  }, [session, segments, initialized, hasPartner]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090F2F' }}>
        <ActivityIndicator size="large" color="#F24986" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="connect" />
      <Stack.Screen name="home" />
    </Stack>
  );
}
