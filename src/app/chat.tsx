import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import * as ImagePicker from "expo-image-picker";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

type ChatMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_type: "text" | "image" | "video" | "audio";
  body: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
};

export default function Chat() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mediaViewer, setMediaViewer] = useState<{
    type: "image" | "video";
    url: string;
  } | null>(null);
  const recordingSeconds = Math.max(
    0,
    Math.floor(recorderState.durationMillis / 1000)
  );

  const loadMessages = async (userId: string, nextPartnerId: string) => {
    const { data, error } = await supabase
      .from("couple_messages")
      .select(
        "id, sender_id, receiver_id, message_type, body, media_url, media_type, created_at"
      )
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${nextPartnerId}),and(sender_id.eq.${nextPartnerId},receiver_id.eq.${userId})`
      )
      .order("created_at", { ascending: true });

    if (error) throw error;
    setMessages(data ?? []);
  };

  const loadChat = async () => {
    setLoading(true);
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

      if (!profile?.partner_id) {
        setPartnerId(null);
        setMessages([]);
        return;
      }

      setPartnerId(profile.partner_id);

      const { data: partner, error: partnerError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", profile.partner_id)
        .single();

      if (partnerError) throw partnerError;

      setPartnerName(partner.full_name);
      await loadMessages(user.id, profile.partner_id);
    } catch (error: any) {
      console.error("Chat load error:", error);
      Alert.alert(
        "Chat Setup Needed",
        "Please run the latest Supabase SQL setup so couple chat can sync."
      );
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    const trimmedText = messageText.trim();
    if (!currentUserId || !partnerId || !trimmedText) return;

    setSending(true);
    try {
      const { error } = await supabase.from("couple_messages").insert({
        sender_id: currentUserId,
        receiver_id: partnerId,
        message_type: "text",
        body: trimmedText,
      });

      if (error) throw error;

      setMessageText("");
      await loadMessages(currentUserId, partnerId);
    } catch (error: any) {
      console.error("Chat send error:", error);
      Alert.alert("Error", "Could not send your message.");
    } finally {
      setSending(false);
    }
  };

  const uploadChatMedia = async (
    uri: string,
    messageType: "image" | "video" | "audio",
    mimeType?: string | null,
    fileName?: string | null
  ) => {
    if (!currentUserId || !partnerId) return;

    const extension =
      fileName?.split(".").pop() ??
      uri.split(".").pop()?.split("?")[0] ??
      (messageType === "audio" ? "m4a" : messageType === "video" ? "mp4" : "jpg");
    const storagePath = `${currentUserId}/${Date.now()}.${extension}`;

    setSending(true);
    try {
      const mediaResponse = await fetch(uri);
      const mediaBlob = await mediaResponse.blob();
      const { error: uploadError } = await supabase.storage
        .from("couple-chat-media")
        .upload(storagePath, mediaBlob, {
          contentType:
            mimeType ??
            (messageType === "audio"
              ? "audio/m4a"
              : messageType === "video"
                ? "video/mp4"
                : "image/jpeg"),
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("couple-chat-media")
        .getPublicUrl(storagePath);

      const { error: insertError } = await supabase.from("couple_messages").insert({
        sender_id: currentUserId,
        receiver_id: partnerId,
        message_type: messageType,
        media_url: publicUrlData.publicUrl,
        media_type: mimeType ?? messageType,
      });

      if (insertError) throw insertError;

      await loadMessages(currentUserId, partnerId);
    } catch (error: any) {
      console.error("Chat media send error:", error);
      const isMissingBucket =
        error?.message?.toLowerCase().includes("bucket not found") ||
        error?.error?.toLowerCase?.().includes("bucket not found");

      Alert.alert(
        isMissingBucket ? "Storage Bucket Missing" : "Upload Error",
        isMissingBucket
          ? "Run the chat media bucket SQL in Supabase, then try sending again."
          : "Could not send this file. Make sure the latest Supabase SQL has been run."
      );
    } finally {
      setSending(false);
    }
  };

  const sendPhotoOrVideo = async () => {
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
    await uploadChatMedia(
      asset.uri,
      asset.type === "video" ? "video" : "image",
      asset.mimeType,
      asset.fileName
    );
  };

  const startVoiceNote = async () => {
    const permissionResult = await requestRecordingPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission required",
        "Please allow microphone access to send voice notes."
      );
      return;
    }

    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
    });
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  };

  const stopVoiceNote = async () => {
    await audioRecorder.stop();
    const recordingUri = audioRecorder.uri;

    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
    });

    if (recordingUri) {
      await uploadChatMedia(recordingUri, "audio", "audio/m4a");
    }
  };

  useEffect(() => {
    loadChat();
  }, []);

  useEffect(() => {
    if (!currentUserId || !partnerId) return;

    const handleMessage = (newMessage: ChatMessage) => {
      setMessages((currentMessages) =>
        currentMessages.some((message) => message.id === newMessage.id)
          ? currentMessages
          : [...currentMessages, newMessage]
      );
    };

    const sentChannel = supabase
      .channel(`couple-chat-sent:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "couple_messages",
          filter: `sender_id=eq.${currentUserId}`,
        },
        (payload) => handleMessage(payload.new as ChatMessage)
      )
      .subscribe();

    const receivedChannel = supabase
      .channel(`couple-chat-received:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "couple_messages",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => handleMessage(payload.new as ChatMessage)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sentChannel);
      supabase.removeChannel(receivedChannel);
    };
  }, [currentUserId, partnerId]);

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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
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
                <Text style={styles.title}>{partnerName ?? "Couple Chat"}</Text>
                <Text style={styles.subtitle}>Messages between you two</Text>
              </View>
              <View style={styles.headerSpacer} />
            </View>

            {!partnerId ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Connect first</Text>
                <Text style={styles.emptyText}>
                  Invite your partner before starting a chat.
                </Text>
                <TouchableOpacity
                  style={styles.connectButton}
                  activeOpacity={0.86}
                  onPress={() => router.push("/connect")}
                >
                  <Text style={styles.connectButtonText}>Invite Your Partner</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <ScrollView
                  ref={scrollViewRef}
                  style={styles.messageList}
                  contentContainerStyle={styles.messageListContent}
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={() =>
                    scrollViewRef.current?.scrollToEnd({ animated: true })
                  }
                >
                  {messages.length ? (
                    messages.map((message) => {
                      const isMine = message.sender_id === currentUserId;

                      return (
                        <View
                          key={message.id}
                          style={[styles.messageBubble, isMine && styles.myMessageBubble]}
                        >
                          <Text style={styles.messageSender}>
                            {isMine ? "You" : partnerName ?? "Partner"}
                          </Text>
                          {message.message_type === "text" ? (
                            <Text style={styles.messageText}>{message.body}</Text>
                          ) : message.message_type === "image" && message.media_url ? (
                            <TouchableOpacity
                              activeOpacity={0.9}
                              onPress={() =>
                                setMediaViewer({
                                  type: "image",
                                  url: message.media_url!,
                                })
                              }
                            >
                              <Image
                                source={{ uri: message.media_url }}
                                style={styles.messageImage}
                                resizeMode="cover"
                              />
                            </TouchableOpacity>
                          ) : message.media_url ? (
                            <TouchableOpacity
                              style={styles.mediaOpenButton}
                              activeOpacity={0.86}
                              onPress={() => {
                                if (message.message_type === "video") {
                                  setMediaViewer({
                                    type: "video",
                                    url: message.media_url!,
                                  });
                                  return;
                                }

                                Linking.openURL(message.media_url!);
                              }}
                            >
                              <SymbolView
                                name={
                                  message.message_type === "audio"
                                    ? { ios: "waveform", android: "graphic_eq", web: "graphic_eq" }
                                    : { ios: "play.fill", android: "play_arrow", web: "play_arrow" }
                                }
                                size={16}
                                tintColor="#FFFFFF"
                                fallback={
                                  <Text style={styles.mediaOpenText}>
                                    {message.message_type === "audio" ? "A" : "V"}
                                  </Text>
                                }
                              />
                              <Text style={styles.mediaOpenText}>
                                {message.message_type === "audio"
                                  ? "Open voice note"
                                  : "Open video"}
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.messageText}>Attachment sent</Text>
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyMessages}>
                      <Text style={styles.emptyText}>No messages yet.</Text>
                    </View>
                  )}
                </ScrollView>

                {recorderState.isRecording ? (
                  <View style={styles.recordingStatus}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingStatusText}>
                      Recording voice note
                    </Text>
                    <Text style={styles.recordingTimer}>
                      {recordingSeconds}s
                    </Text>
                  </View>
                ) : null}

                <View style={styles.inputRow}>
                  <TouchableOpacity
                    style={[styles.iconButton, sending && styles.sendButtonDisabled]}
                    activeOpacity={0.86}
                    onPress={sendPhotoOrVideo}
                    disabled={sending || recorderState.isRecording}
                  >
                    <SymbolView
                      name={{ ios: "photo.fill", android: "photo_library", web: "photo_library" }}
                      size={18}
                      tintColor="#FFFFFF"
                      fallback={<Text style={styles.sendFallback}>+</Text>}
                    />
                  </TouchableOpacity>
                  <TextInput
                    value={messageText}
                    onChangeText={setMessageText}
                    placeholder="Type a message..."
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    style={styles.input}
                    editable={!sending}
                    multiline
                  />
                  <TouchableOpacity
                    style={[
                      styles.iconButton,
                      recorderState.isRecording && styles.recordingButton,
                      sending && styles.sendButtonDisabled,
                    ]}
                    activeOpacity={0.86}
                    onPress={recorderState.isRecording ? stopVoiceNote : startVoiceNote}
                    disabled={sending}
                  >
                    <SymbolView
                      name={{ ios: "mic.fill", android: "mic", web: "mic" }}
                      size={18}
                      tintColor="#FFFFFF"
                      fallback={<Text style={styles.sendFallback}>M</Text>}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (!messageText.trim() || sending) && styles.sendButtonDisabled,
                    ]}
                    activeOpacity={0.86}
                    onPress={sendMessage}
                    disabled={!messageText.trim() || sending}
                  >
                    {sending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <SymbolView
                        name={{ ios: "paperplane.fill", android: "send", web: "send" }}
                        size={18}
                        tintColor="#FFFFFF"
                        fallback={<Text style={styles.sendFallback}>{">"}</Text>}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal
        visible={Boolean(mediaViewer)}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setMediaViewer(null)}
      >
        <View style={styles.mediaViewer}>
          <TouchableOpacity
            style={styles.mediaViewerClose}
            activeOpacity={0.86}
            onPress={() => setMediaViewer(null)}
          >
            <Text style={styles.mediaViewerCloseText}>Close</Text>
          </TouchableOpacity>

          {mediaViewer?.type === "image" ? (
            <Image
              source={{ uri: mediaViewer.url }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          ) : mediaViewer?.type === "video" ? (
            <View style={styles.fullscreenVideoFallback}>
              <SymbolView
                name={{ ios: "play.circle.fill", android: "play_circle", web: "play_circle" }}
                size={54}
                tintColor="#FFFFFF"
                fallback={<Text style={styles.fullscreenVideoIcon}>▶</Text>}
              />
              <Text style={styles.fullscreenVideoText}>Video preview</Text>
              <TouchableOpacity
                style={styles.fullscreenOpenButton}
                activeOpacity={0.86}
                onPress={() => Linking.openURL(mediaViewer.url)}
              >
                <Text style={styles.fullscreenOpenText}>Open Full Screen</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
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
    opacity: 0.12,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
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
    fontWeight: "900",
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.62)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    flexGrow: 1,
    gap: 10,
    paddingVertical: 10,
  },
  messageBubble: {
    alignSelf: "flex-start",
    maxWidth: "82%",
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  myMessageBubble: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(242, 73, 134, 0.32)",
    borderColor: "rgba(242, 73, 134, 0.45)",
  },
  messageSender: {
    color: "rgba(255, 255, 255, 0.58)",
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  messageText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  messageImage: {
    width: 190,
    height: 140,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  mediaOpenButton: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  mediaOpenText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  emptyMessages: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.62)",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
  connectButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#F24986",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginTop: 18,
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 8,
  },
  recordingStatus: {
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: "rgba(242, 73, 134, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(242, 73, 134, 0.38)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  recordingDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#F24986",
  },
  recordingStatusText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  recordingTimer: {
    color: "#FFB199",
    fontSize: 13,
    fontWeight: "900",
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  recordingButton: {
    backgroundColor: "#F24986",
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F24986",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendFallback: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  mediaViewer: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaViewerClose: {
    position: "absolute",
    top: 44,
    right: 18,
    zIndex: 2,
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  mediaViewerCloseText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  fullscreenImage: {
    width: "100%",
    height: "100%",
  },
  fullscreenVideoFallback: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  fullscreenVideoIcon: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "900",
  },
  fullscreenVideoText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 14,
  },
  fullscreenOpenButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#F24986",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginTop: 18,
  },
  fullscreenOpenText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});
