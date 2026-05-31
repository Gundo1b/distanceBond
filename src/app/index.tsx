import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function Index() {
  const [initialRoute, setInitialRoute] = useState<"/home" | "/welcome" | null>(
    null
  );

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setInitialRoute(session ? "/home" : "/welcome");
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F24986" />
      </View>
    );
  }

  return <Redirect href={initialRoute} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#090F2F",
    alignItems: "center",
    justifyContent: "center",
  },
});
