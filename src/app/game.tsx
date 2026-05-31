import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import {
  darePrompts,
  truthPrompts,
  type TruthOrDarePromptType,
} from "./truth-or-dare-prompts";

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
    action: undefined,
  },
  {
    title: "Couple Trivia\nBattle",
    subtitle: "",
    icon: { ios: "trophy.fill", android: "trophy", web: "trophy" },
    iconText: "VS",
    cardStyle: "coral",
    route: undefined,
    action: undefined,
  },
  {
    title: "Reaction\nChallenge",
    subtitle: "",
    icon: { ios: "bolt.fill", android: "bolt", web: "bolt" },
    iconText: "!",
    cardStyle: "violet",
    route: undefined,
    action: undefined,
  },
  {
    title: "Truth or\nDare",
    subtitle: "",
    icon: { ios: "heart.fill", android: "favorite", web: "favorite" },
    iconText: "?",
    cardStyle: "pink",
    route: undefined,
    action: "truth-or-dare",
  },
] as const;

type TruthOrDarePrompt = {
  type: TruthOrDarePromptType;
  prompt: string;
};

type TruthOrDareGame = {
  id: string;
  player_one_id: string;
  player_two_id: string;
  current_turn_user_id: string;
  current_type: "Truth" | "Dare" | null;
  current_prompt: string | null;
};

type TruthOrDareMessage = {
  id: string;
  game_id: string;
  sender_id: string;
  message_type: "text" | "image" | "video";
  body: string | null;
  media_url: string | null;
  media_type: string | null;
  prompt_type: "Truth" | "Dare" | null;
  created_at: string;
};

export default function Game() {
  const router = useRouter();
  const [activeGame, setActiveGame] = useState<"truth-or-dare" | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [sharedGame, setSharedGame] = useState<TruthOrDareGame | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [submittingTurn, setSubmittingTurn] = useState(false);
  const [messages, setMessages] = useState<TruthOrDareMessage[]>([]);
  const [responseText, setResponseText] = useState("");
  const [sendingResponse, setSendingResponse] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [truthOrDareResult, setTruthOrDareResult] =
    useState<TruthOrDarePrompt | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const isMyTurn = Boolean(
    currentUserId &&
      partnerId &&
      (!sharedGame || sharedGame.current_turn_user_id === currentUserId)
  );

  const pickTruthOrDare = (
    selectedType?: TruthOrDarePrompt["type"]
  ): TruthOrDarePrompt => {
    const type: TruthOrDarePrompt["type"] =
      selectedType ?? (Math.random() < 0.5 ? "Truth" : "Dare");
    const prompts = type === "Truth" ? truthPrompts : darePrompts;
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];

    return { type, prompt };
  };

  const loadMessages = async (gameId: string) => {
    const { data, error } = await supabase
      .from("truth_or_dare_messages")
      .select(
        "id, game_id, sender_id, message_type, body, media_url, media_type, prompt_type, created_at"
      )
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    setMessages(data ?? []);
  };

  const loadTruthOrDareGame = async () => {
    setGameLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setCurrentUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("partner_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const nextPartnerId = profile?.partner_id ?? null;
      setPartnerId(nextPartnerId);

      if (!nextPartnerId) {
        setSharedGame(null);
        setTruthOrDareResult(null);
        return;
      }

      const { data: game, error: gameError } = await supabase
        .from("truth_or_dare_games")
        .select(
          "id, player_one_id, player_two_id, current_turn_user_id, current_type, current_prompt"
        )
        .or(
          `and(player_one_id.eq.${user.id},player_two_id.eq.${nextPartnerId}),and(player_one_id.eq.${nextPartnerId},player_two_id.eq.${user.id})`
        )
        .maybeSingle();

      if (gameError) throw gameError;

      setSharedGame(game);
      setTruthOrDareResult(
        game?.current_type && game.current_prompt
          ? { type: game.current_type, prompt: game.current_prompt }
          : null
      );

      if (game?.id) {
        await loadMessages(game.id);
      } else {
        setMessages([]);
      }
    } catch (error: any) {
      console.error("Truth or Dare load error:", error);
      Alert.alert(
        "Game Setup Needed",
        "Please run the latest Supabase SQL setup so partner turns can sync."
      );
    } finally {
      setGameLoading(false);
    }
  };

  const generateTruthOrDare = async (selectedType?: TruthOrDarePrompt["type"]) => {
    if (!currentUserId || !partnerId || !isMyTurn) return;

    const result = pickTruthOrDare(selectedType);
    setSubmittingTurn(true);

    try {
      const payload = {
        current_type: result.type,
        current_prompt: result.prompt,
        current_turn_user_id: partnerId,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = sharedGame
        ? await supabase
            .from("truth_or_dare_games")
            .update(payload)
            .eq("id", sharedGame.id)
            .select(
              "id, player_one_id, player_two_id, current_turn_user_id, current_type, current_prompt"
            )
            .single()
        : await supabase
            .from("truth_or_dare_games")
            .insert({
              player_one_id: currentUserId,
              player_two_id: partnerId,
              ...payload,
            })
            .select(
              "id, player_one_id, player_two_id, current_turn_user_id, current_type, current_prompt"
            )
            .single();

      if (error) throw error;

      setSharedGame(data);
      setTruthOrDareResult(result);
      await loadMessages(data.id);
    } catch (error: any) {
      console.error("Truth or Dare turn error:", error);
      Alert.alert("Error", "Could not send this turn to your partner.");
    } finally {
      setSubmittingTurn(false);
    }
  };

  const sendTextResponse = async () => {
    const trimmedText = responseText.trim();
    if (!currentUserId || !sharedGame?.id || !trimmedText) return;

    setSendingResponse(true);
    try {
      const { error } = await supabase.from("truth_or_dare_messages").insert({
        game_id: sharedGame.id,
        sender_id: currentUserId,
        message_type: "text",
        body: trimmedText,
        prompt_type: truthOrDareResult?.type ?? null,
        prompt_text: truthOrDareResult?.prompt ?? null,
      });

      if (error) throw error;

      setResponseText("");
      await loadMessages(sharedGame.id);
    } catch (error: any) {
      console.error("Truth or Dare text response error:", error);
      Alert.alert("Error", "Could not send your response.");
    } finally {
      setSendingResponse(false);
    }
  };

  const sendMediaResponse = async () => {
    if (!currentUserId || !sharedGame?.id) return;

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission required",
        "Please allow photo library access to send pictures or videos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const messageType = asset.type === "video" ? "video" : "image";
    const extension =
      asset.fileName?.split(".").pop() ??
      asset.uri.split(".").pop()?.split("?")[0] ??
      (messageType === "video" ? "mp4" : "jpg");
    const storagePath = `${sharedGame.id}/${Date.now()}-${currentUserId}.${extension}`;

    setSendingResponse(true);
    setMediaUploading(true);
    try {
      const mediaResponse = await fetch(asset.uri);
      const mediaBlob = await mediaResponse.blob();
      const { error: uploadError } = await supabase.storage
        .from("truth-or-dare-media")
        .upload(storagePath, mediaBlob, {
          contentType:
            asset.mimeType ?? (messageType === "video" ? "video/mp4" : "image/jpeg"),
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("truth-or-dare-media")
        .getPublicUrl(storagePath);

      const { error: insertError } = await supabase
        .from("truth_or_dare_messages")
        .insert({
          game_id: sharedGame.id,
          sender_id: currentUserId,
          message_type: messageType,
          media_url: publicUrlData.publicUrl,
          media_type: asset.mimeType ?? messageType,
          prompt_type: truthOrDareResult?.type ?? null,
          prompt_text: truthOrDareResult?.prompt ?? null,
        });

      if (insertError) throw insertError;

      await loadMessages(sharedGame.id);
    } catch (error: any) {
      console.error("Truth or Dare media response error:", error);
      Alert.alert(
        "Upload Error",
        "Could not send this media. Make sure the Supabase media bucket SQL has been run."
      );
    } finally {
      setSendingResponse(false);
      setMediaUploading(false);
    }
  };

  useEffect(() => {
    if (activeGame !== "truth-or-dare") return;

    loadTruthOrDareGame();
  }, [activeGame]);

  useEffect(() => {
    if (activeGame !== "truth-or-dare" || !currentUserId) return;

    const handleRealtimeGame = (payload: any) => {
      if (payload.eventType === "DELETE") {
        setSharedGame(null);
        setTruthOrDareResult(null);
        setMessages([]);
        return;
      }

      const nextGame = payload.new as TruthOrDareGame;
      setSharedGame(nextGame);
      setTruthOrDareResult(
        nextGame.current_type && nextGame.current_prompt
          ? { type: nextGame.current_type, prompt: nextGame.current_prompt }
          : null
      );
      loadMessages(nextGame.id).catch((error) => {
        console.error("Truth or Dare message refresh error:", error);
      });
    };

    const playerOneChannel = supabase
      .channel(`truth-or-dare-player-one:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "truth_or_dare_games",
          filter: `player_one_id=eq.${currentUserId}`,
        },
        (payload) => handleRealtimeGame(payload)
      )
      .subscribe();

    const playerTwoChannel = supabase
      .channel(`truth-or-dare-player-two:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "truth_or_dare_games",
          filter: `player_two_id=eq.${currentUserId}`,
        },
        (payload) => handleRealtimeGame(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playerOneChannel);
      supabase.removeChannel(playerTwoChannel);
    };
  }, [activeGame, currentUserId]);

  useEffect(() => {
    if (activeGame !== "truth-or-dare" || !sharedGame?.id) return;

    const channel = supabase
      .channel(`truth-or-dare-messages:${sharedGame.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "truth_or_dare_messages",
          filter: `game_id=eq.${sharedGame.id}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setMessages((current) => current.filter((m) => m.id !== payload.old.id));
            return;
          }

          const newMessage = payload.new as TruthOrDareMessage;
          setMessages((currentMessages) =>
            currentMessages.some((message) => message.id === newMessage.id)
              ? currentMessages
              : [...currentMessages, newMessage]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeGame, sharedGame?.id]);

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
              onPress={() => {
                if (activeGame) {
                  setActiveGame(null);
                  setTruthOrDareResult(null);
                  return;
                }

                router.push("/home");
              }}
            >
              <SymbolView
                name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
                size={20}
                tintColor="#FFFFFF"
                fallback={<Text style={styles.headerFallback}>{"<"}</Text>}
              />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.title}>
                {activeGame === "truth-or-dare" ? "Truth or Dare" : "Games"}
              </Text>
              <Text style={styles.subtitle}>
                {activeGame === "truth-or-dare"
                  ? "Let fate pick your next move"
                  : "Play fun games together"}
              </Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.main}>
            {activeGame === "truth-or-dare" ? (
              <View style={styles.truthOrDareGame}>
                {gameLoading ? (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator size="large" color="#F24986" />
                  </View>
                ) : !partnerId ? (
                  <>
                    <View style={[styles.truthOrDareResultCard, styles.readyCard]}>
                      <Text style={styles.truthOrDareLabel}>Connection needed</Text>
                      <Text style={styles.truthOrDareResult}>Invite Partner</Text>
                      <Text style={styles.truthOrDarePrompt}>
                        Connect with your partner to start playing Truth or Dare together.
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.generateButton}
                      activeOpacity={0.86}
                      onPress={() => router.push("/connect")}
                    >
                      <Text style={styles.generateButtonText}>Go to Connect</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View
                      style={[
                        styles.truthOrDareResultCard,
                        truthOrDareResult?.type === "Truth"
                          ? styles.truthCard
                          : truthOrDareResult?.type === "Dare"
                            ? styles.dareCard
                            : styles.readyCard,
                      ]}
                    >
                      <Text
                        style={styles.truthOrDareLabel}
                      >
                        {isMyTurn ? "Your turn" : "Partner's turn"}
                      </Text>
                      <Text style={styles.truthOrDareResult}>
                        {truthOrDareResult?.type ?? "Ready?"}
                      </Text>
                      <Text style={styles.truthOrDarePrompt}>
                        {truthOrDareResult?.prompt ??
                          "Tap the button below to start the game."}
                      </Text>
                    </View>

                    {sharedGame ? (
                      <View style={styles.responsePanel}>
                        <View style={styles.responseHeader}>
                          <Text style={styles.responseTitle}>Activity</Text>
                          <Text style={styles.messageCount}>{messages.length} messages</Text>
                        </View>
                        <ScrollView
                          ref={scrollViewRef}
                          style={styles.messageList}
                          contentContainerStyle={styles.messageListContent}
                          showsVerticalScrollIndicator={false}
                          onContentSizeChange={() =>
                            scrollViewRef.current?.scrollToEnd({ animated: true })
                          }
                        >
                          {messages.length || mediaUploading ? (
                            <>
                              {messages.map((message) => {
                                const isMine = message.sender_id === currentUserId;

                                return (
                                  <View
                                    key={message.id}
                                    style={[
                                      styles.messageBubble,
                                      isMine && styles.myMessageBubble,
                                    ]}
                                  >
                                    {!isMine && (
                                      <Text style={styles.messageSender}>Partner</Text>
                                    )}
                                    {message.message_type === "text" ? (
                                      <Text style={styles.messageText}>{message.body}</Text>
                                    ) : message.message_type === "image" &&
                                      message.media_url ? (
                                      <Image
                                        source={{ uri: message.media_url }}
                                        style={styles.messageImage}
                                        resizeMode="cover"
                                      />
                                    ) : message.media_url ? (
                                      <TouchableOpacity
                                        style={styles.videoOpenButton}
                                        activeOpacity={0.86}
                                        onPress={() => Linking.openURL(message.media_url!)}
                                      >
                                        <SymbolView 
                                          name={{ ios: "play.fill", android: "play_arrow", web: "play_arrow" }} 
                                          size={18} 
                                          tintColor="#FFFFFF" 
                                        />
                                        <Text style={styles.videoOpenText}>
                                          Play Video
                                        </Text>
                                      </TouchableOpacity>
                                    ) : (
                                      <Text style={styles.messageText}>Video sent</Text>
                                    )}
                                  </View>
                                );
                              })}
                              
                              {mediaUploading && (
                                <View style={[styles.messageBubble, styles.myMessageBubble, styles.uploadingBubble]}>
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                  <Text style={[styles.messageText, { marginLeft: 8, fontSize: 13 }]}>
                                    Uploading media...
                                  </Text>
                                </View>
                              )}
                            </>
                          ) : (
                            <View style={styles.emptyMessagesContainer}>
                              <Text style={styles.emptyMessages}>
                                No responses yet.
                              </Text>
                            </View>
                          )}
                        </ScrollView>

                        <View style={styles.inputRow}>
                          <TouchableOpacity
                            style={styles.attachButton}
                            activeOpacity={0.86}
                            onPress={sendMediaResponse}
                            disabled={sendingResponse}
                          >
                            <SymbolView 
                              name={{ ios: "camera.fill", android: "photo_camera", web: "photo_camera" }} 
                              size={20} 
                              tintColor="rgba(255, 255, 255, 0.6)" 
                            />
                          </TouchableOpacity>
                          
                          <TextInput
                            value={responseText}
                            onChangeText={setResponseText}
                            placeholder="Type a response..."
                            placeholderTextColor="rgba(255, 255, 255, 0.4)"
                            style={styles.responseInput}
                            editable={!sendingResponse}
                          />

                          <TouchableOpacity
                            style={[
                              styles.sendButton,
                              (!responseText.trim() || sendingResponse) && styles.sendButtonDisabled,
                            ]}
                            activeOpacity={0.86}
                            onPress={sendTextResponse}
                            disabled={sendingResponse || !responseText.trim()}
                          >
                            <SymbolView 
                              name={{ ios: "paperplane.fill", android: "send", web: "send" }} 
                              size={18} 
                              tintColor="#FFFFFF" 
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}

                    {isMyTurn ? (
                      <View style={styles.choiceRow}>
                        <TouchableOpacity
                          style={[styles.choiceButton, styles.truthChoice]}
                          activeOpacity={0.8}
                          onPress={() => generateTruthOrDare("Truth")}
                          disabled={submittingTurn}
                        >
                          <SymbolView
                            name={{ ios: "heart.fill", android: "favorite", web: "favorite" }}
                            size={22}
                            tintColor="#FF75A0"
                          />
                          <Text style={styles.choiceText}>Truth</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.choiceButton, styles.dareChoice]}
                          activeOpacity={0.8}
                          onPress={() => generateTruthOrDare("Dare")}
                          disabled={submittingTurn}
                        >
                          <SymbolView
                            name={{ ios: "bolt.fill", android: "bolt", web: "bolt" }}
                            size={22}
                            tintColor="#8B5CF6"
                          />
                          <Text style={styles.choiceText}>Dare</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.waitingCard}>
                        <ActivityIndicator
                          size="small"
                          color="rgba(255, 255, 255, 0.4)"
                          style={{ marginRight: 12 }}
                        />
                        <Text style={styles.waitingText}>Waiting for partner...</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            ) : (
              <>
            {games.map((game) => (
              <TouchableOpacity
                key={game.title}
                style={[styles.gameCard, styles[game.cardStyle]]}
                activeOpacity={0.86}
                onPress={
                  game.route
                    ? () => router.push(game.route)
                    : game.action === "truth-or-dare"
                      ? () => setActiveGame("truth-or-dare")
                      : undefined
                }
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
              </>
            )}
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
    gap: 12,
  },
  truthOrDareGame: {
    flex: 1,
    justifyContent: "flex-start",
    gap: 16,
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  truthOrDareResultCard: {
    minHeight: 118,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  truthCard: {
    backgroundColor: "rgba(242, 73, 134, 0.25)",
    borderColor: "rgba(242, 73, 134, 0.5)",
  },
  dareCard: {
    backgroundColor: "rgba(90, 38, 166, 0.3)",
    borderColor: "rgba(90, 38, 166, 0.6)",
  },
  readyCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  truthOrDareLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  truthOrDareResult: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
    textAlign: "center",
  },
  truthOrDarePrompt: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 6,
    textAlign: "center",
  },
  cardIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  choiceRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  choiceButton: {
    flex: 1,
    height: 64,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
  },
  truthChoice: {
    backgroundColor: "rgba(255, 117, 160, 0.2)",
    borderColor: "rgba(255, 117, 160, 0.4)",
  },
  dareChoice: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    borderColor: "rgba(139, 92, 246, 0.4)",
  },
  choiceText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  generateButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "#F24986",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  waitingCard: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  waitingText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  responsePanel: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    gap: 16,
  },
  responseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  responseTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  messageListContent: {
    gap: 12,
    paddingBottom: 10,
  },
  messageList: {
    flex: 1,
  },
  messageBubble: {
    alignSelf: "flex-start",
    maxWidth: "82%",
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  myMessageBubble: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255, 117, 160, 0.2)",
    borderColor: "rgba(255, 117, 160, 0.4)",
    borderWidth: 1,
  },
  uploadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    opacity: 0.8,
  },
  messageSender: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  messageText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  messageCount: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 13,
    fontWeight: "700",
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  videoOpenButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  videoOpenText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  emptyMessagesContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyMessages: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  responseInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F24986",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    opacity: 0.5,
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
