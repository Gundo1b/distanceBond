import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const tabs = [
  {
    label: "Home",
    icon: { ios: "house.fill", android: "home_filled", web: "home" },
    fallback: "H",
    route: "/home",
  },
  {
    label: "Challenges",
    icon: { ios: "trophy.fill", android: "trophy", web: "trophy" },
    fallback: "C",
    route: undefined,
  },
  {
    label: "Games",
    icon: {
      ios: "gamecontroller.fill",
      android: "sports_esports",
      web: "sports_esports",
    },
    fallback: "G",
    route: "/game",
  },
  {
    label: "Pet",
    icon: { ios: "pawprint.fill", android: "pets", web: "pets" },
    fallback: "P",
    route: undefined,
  },
  {
    label: "Profile",
    icon: {
      ios: "person.crop.circle.fill",
      android: "person",
      web: "person",
    },
    fallback: "P",
    route: undefined,
  },
] as const;

const games = [
  {
    title: "How Well Do\nYou Know Me?",
    subtitle: "Quiz Game",
    icon: { ios: "questionmark", android: "question_mark", web: "question_mark" },
    iconText: "?",
    cardStyle: "purple",
    route: "/how-well-know-me",
  },
  {
    title: "Couple Trivia\nBattle",
    subtitle: "",
    icon: { ios: "trophy.fill", android: "trophy", web: "trophy" },
    iconText: "VS",
    cardStyle: "coral",
    route: undefined,
  },
  {
    title: "Reaction\nChallenge",
    subtitle: "",
    icon: { ios: "bolt.fill", android: "bolt", web: "bolt" },
    iconText: "!",
    cardStyle: "violet",
    route: undefined,
  },
  {
    title: "Truth or\nDistance",
    subtitle: "",
    icon: { ios: "heart.fill", android: "favorite", web: "favorite" },
    iconText: "?",
    cardStyle: "pink",
    route: undefined,
  },
] as const;

export default function Game() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topGlow} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.headerBar}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.8}
              onPress={() => router.push("/home")}
            >
              <SymbolView
                name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
                size={20}
                tintColor="#FFFFFF"
                fallback={<Text style={styles.headerFallback}>{"<"}</Text>}
              />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.title}>Games</Text>
              <Text style={styles.subtitle}>Play fun games together</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.main}>
            {games.map((game) => (
              <TouchableOpacity
                key={game.title}
                style={[styles.gameCard, styles[game.cardStyle]]}
                activeOpacity={0.86}
                onPress={game.route ? () => router.push(game.route) : undefined}
              >
                <View style={styles.gameCopy}>
                  <Text style={styles.gameTitle}>{game.title}</Text>
                  {game.subtitle ? (
                    <Text style={styles.gameSubtitle}>{game.subtitle}</Text>
                  ) : null}
                </View>
                <View style={styles.gameArt}>
                  <View style={styles.artBubbleLarge}>
                    <SymbolView
                      name={game.icon}
                      size={42}
                      tintColor="#FFFFFF"
                      fallback={<Text style={styles.artFallback}>{game.iconText}</Text>}
                    />
                  </View>
                  <View style={styles.artBubbleSmall}>
                    <Text style={styles.smallHeart}>♥</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.moreCard} activeOpacity={0.86}>
              <View style={styles.moreIcon}>
                <SymbolView
                  name={{
                    ios: "gamecontroller.fill",
                    android: "sports_esports",
                    web: "sports_esports",
                  }}
                  size={24}
                  tintColor="#FFB199"
                  fallback={<Text style={styles.moreFallback}>G</Text>}
                />
              </View>
              <View style={styles.moreCopy}>
                <Text style={styles.moreTitle}>More games</Text>
                <Text style={styles.moreSubtitle}>Coming soon...</Text>
              </View>
              <SymbolView
                name={{
                  ios: "chevron.right",
                  android: "chevron_right",
                  web: "chevron_right",
                }}
                size={20}
                tintColor="#FFFFFF"
                fallback={<Text style={styles.headerFallback}>{">"}</Text>}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.tabBar}>
            {tabs.map((tab) => {
              const isActive = tab.label === "Games";

              return (
                <TouchableOpacity
                  key={tab.label}
                  style={[styles.tabItem, isActive && styles.activeTabItem]}
                  activeOpacity={0.8}
                  onPress={
                    tab.route && !isActive ? () => router.push(tab.route) : undefined
                  }
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
  safeArea: {
    flex: 1,
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
  content: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 12,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    alignItems: "center",
    flex: 1,
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  headerFallback: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.68)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  main: {
    flex: 1,
    gap: 8,
  },
  gameCard: {
    minHeight: 84,
    borderRadius: 9,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  purple: {
    backgroundColor: "#4A2D95",
  },
  coral: {
    backgroundColor: "#C9535C",
  },
  violet: {
    backgroundColor: "#5A26A6",
  },
  pink: {
    backgroundColor: "#8F2A8C",
  },
  gameCopy: {
    flex: 1,
    zIndex: 1,
  },
  gameTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
  },
  gameSubtitle: {
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 5,
  },
  gameArt: {
    width: 92,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  artBubbleLarge: {
    width: 74,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    transform: [{ rotate: "-8deg" }],
  },
  artBubbleSmall: {
    position: "absolute",
    left: 3,
    bottom: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F24986",
  },
  smallHeart: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  artFallback: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
  },
  moreCard: {
    minHeight: 62,
    borderRadius: 9,
    backgroundColor: "#4A2D95",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  moreIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.13)",
  },
  moreCopy: {
    flex: 1,
  },
  moreTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  moreSubtitle: {
    color: "rgba(255, 255, 255, 0.68)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  moreFallback: {
    color: "#FFB199",
    fontSize: 14,
    fontWeight: "900",
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 18,
    marginBottom: 10,
    marginTop: 10,
    padding: 6,
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
