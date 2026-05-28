import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const questions = [
  {
    prompt: "What would your partner pick for a perfect night together?",
    options: ["Movie night", "Dinner date", "Long walk", "Game night"],
    answer: "Movie night",
  },
  {
    prompt: "Which little thing makes your partner feel most loved?",
    options: ["Sweet texts", "Surprises", "Quality time", "Help with tasks"],
    answer: "Quality time",
  },
  {
    prompt: "What snack would your partner choose first?",
    options: ["Chocolate", "Chips", "Fruit", "Ice cream"],
    answer: "Ice cream",
  },
  {
    prompt: "How does your partner usually recharge?",
    options: ["Music", "Sleep", "Talking", "Being outside"],
    answer: "Music",
  },
] as const;

type QuizMode = "choose" | "answer" | "create";

export default function HowWellKnowMe() {
  const router = useRouter();
  const [mode, setMode] = useState<QuizMode>("choose");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [quizSent, setQuizSent] = useState(false);

  const currentQuestion = questions[questionIndex];
  const progress = ((questionIndex + 1) / questions.length) * 100;

  const handleSelect = (option: string) => {
    if (selected) return;

    setSelected(option);
    if (option === currentQuestion.answer) {
      setScore((currentScore) => currentScore + 1);
    }
  };

  const handleNext = () => {
    if (questionIndex === questions.length - 1) {
      setFinished(true);
      return;
    }

    setQuestionIndex((index) => index + 1);
    setSelected(null);
  };

  const handleRestart = () => {
    setQuestionIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setMode("answer");
  };

  const handleBack = () => {
    if (mode === "choose") {
      router.push("/game");
      return;
    }

    setMode("choose");
    setSelected(null);
    setQuestionIndex(0);
    setScore(0);
    setFinished(false);
    setQuizSent(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.headerBar}>
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.8}
              onPress={handleBack}
            >
              <SymbolView
                name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
                size={20}
                tintColor="#FFFFFF"
                fallback={<Text style={styles.iconFallback}>{"<"}</Text>}
              />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.title}>How Well Do You Know Me?</Text>
              <Text style={styles.subtitle}>Quiz Game</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          {mode === "choose" ? (
            <View style={styles.choicePanel}>
              <View style={styles.choiceHero}>
                <SymbolView
                  name={{
                    ios: "questionmark.bubble.fill",
                    android: "quiz",
                    web: "quiz",
                  }}
                  size={48}
                  tintColor="#FFFFFF"
                  fallback={<Text style={styles.choiceFallback}>?</Text>}
                />
              </View>
              <Text style={styles.choiceTitle}>What do you want to do?</Text>
              <Text style={styles.choiceSubtitle}>
                Answer your partner's quiz or create one for them to answer.
              </Text>

              <TouchableOpacity
                style={styles.choiceButton}
                activeOpacity={0.86}
                onPress={() => setMode("answer")}
              >
                <View style={styles.choiceButtonIcon}>
                  <SymbolView
                    name={{ ios: "pencil.and.list.clipboard", android: "edit_note", web: "edit_note" }}
                    size={24}
                    tintColor="#FFB199"
                    fallback={<Text style={styles.choiceButtonFallback}>A</Text>}
                  />
                </View>
                <View style={styles.choiceButtonTextWrap}>
                  <Text style={styles.choiceButtonTitle}>Answer Partner Quiz</Text>
                  <Text style={styles.choiceButtonSubtitle}>Play the questions they made.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.choiceButton}
                activeOpacity={0.86}
                onPress={() => setMode("create")}
              >
                <View style={styles.choiceButtonIcon}>
                  <SymbolView
                    name={{ ios: "plus.bubble.fill", android: "add_comment", web: "add_comment" }}
                    size={24}
                    tintColor="#FFB199"
                    fallback={<Text style={styles.choiceButtonFallback}>+</Text>}
                  />
                </View>
                <View style={styles.choiceButtonTextWrap}>
                  <Text style={styles.choiceButtonTitle}>Create Quiz</Text>
                  <Text style={styles.choiceButtonSubtitle}>Make questions for your partner.</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : mode === "create" ? (
            <View style={styles.createPanel}>
              <Text style={styles.createTitle}>Create a quiz for your partner</Text>
              <Text style={styles.createText}>
                Pick questions they should answer about you. We'll start with these prompts.
              </Text>

              {questions.slice(0, 3).map((question, index) => (
                <View key={question.prompt} style={styles.promptRow}>
                  <Text style={styles.promptNumber}>{index + 1}</Text>
                  <Text style={styles.promptText}>{question.prompt}</Text>
                </View>
              ))}

              {quizSent ? (
                <Text style={styles.sentText}>Quiz ready. Ask your partner to answer it.</Text>
              ) : null}

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.85}
                onPress={() => setQuizSent(true)}
              >
                <Text style={styles.primaryButtonText}>
                  {quizSent ? "Quiz Created" : "Create Quiz"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : finished ? (
            <View style={styles.resultPanel}>
              <View style={styles.resultIcon}>
                <SymbolView
                  name={{ ios: "heart.fill", android: "favorite", web: "favorite" }}
                  size={42}
                  tintColor="#FFFFFF"
                  fallback={<Text style={styles.resultFallback}>H</Text>}
                />
              </View>
              <Text style={styles.resultTitle}>
                You scored {score}/{questions.length}
              </Text>
              <Text style={styles.resultText}>
                Compare answers with your partner and see what surprised you.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.85}
                onPress={handleRestart}
              >
                <Text style={styles.primaryButtonText}>Play Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.85}
                onPress={() => router.push("/game")}
              >
                <Text style={styles.secondaryButtonText}>Back to Games</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  {questionIndex + 1}/{questions.length}
                </Text>
              </View>

              <View style={styles.questionCard}>
                <View style={styles.questionIcon}>
                  <SymbolView
                    name={{
                      ios: "questionmark",
                      android: "question_mark",
                      web: "question_mark",
                    }}
                    size={38}
                    tintColor="#FFFFFF"
                    fallback={<Text style={styles.questionFallback}>?</Text>}
                  />
                </View>
                <Text style={styles.questionText}>{currentQuestion.prompt}</Text>
              </View>

              <View style={styles.options}>
                {currentQuestion.options.map((option) => {
                  const isSelected = selected === option;
                  const isAnswer = Boolean(selected) && option === currentQuestion.answer;
                  const isWrong = isSelected && option !== currentQuestion.answer;

                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionButton,
                        isSelected && styles.selectedOption,
                        isAnswer && styles.correctOption,
                        isWrong && styles.wrongOption,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => handleSelect(option)}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, !selected && styles.disabledButton]}
                activeOpacity={0.85}
                disabled={!selected}
                onPress={handleNext}
              >
                <Text style={styles.primaryButtonText}>
                  {questionIndex === questions.length - 1 ? "Finish" : "Next"}
                </Text>
              </TouchableOpacity>
            </>
          )}
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
    opacity: 0.12,
  },
  bottomGlow: {
    position: "absolute",
    bottom: -160,
    left: -150,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "#6D44D9",
    opacity: 0.16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconFallback: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  headerTitleWrap: {
    alignItems: "center",
    flex: 1,
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.68)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#F24986",
  },
  progressText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    fontWeight: "800",
  },
  choicePanel: {
    flex: 1,
    justifyContent: "center",
    gap: 12,
  },
  choiceHero: {
    width: 92,
    height: 92,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    backgroundColor: "#4A2D95",
    marginBottom: 8,
    transform: [{ rotate: "-8deg" }],
  },
  choiceFallback: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
  },
  choiceTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
  },
  choiceSubtitle: {
    color: "rgba(255, 255, 255, 0.68)",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 8,
  },
  choiceButton: {
    minHeight: 82,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  choiceButtonIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 177, 153, 0.12)",
  },
  choiceButtonFallback: {
    color: "#FFB199",
    fontSize: 16,
    fontWeight: "900",
  },
  choiceButtonTextWrap: {
    flex: 1,
  },
  choiceButtonTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  choiceButtonSubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  createPanel: {
    flex: 1,
    justifyContent: "center",
  },
  createTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
  },
  createText: {
    color: "rgba(255, 255, 255, 0.68)",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 18,
  },
  promptRow: {
    minHeight: 74,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  promptNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F24986",
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 30,
  },
  promptText: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  sentText: {
    color: "#FFB199",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },
  questionCard: {
    minHeight: 190,
    borderRadius: 20,
    backgroundColor: "#4A2D95",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  questionIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    marginBottom: 18,
    transform: [{ rotate: "-8deg" }],
  },
  questionFallback: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
  },
  questionText: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 28,
    textAlign: "center",
  },
  options: {
    gap: 10,
    flex: 1,
  },
  optionButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  selectedOption: {
    borderColor: "#FFB199",
  },
  correctOption: {
    backgroundColor: "rgba(34, 197, 94, 0.22)",
    borderColor: "#22C55E",
  },
  wrongOption: {
    backgroundColor: "rgba(242, 73, 134, 0.22)",
    borderColor: "#F24986",
  },
  optionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 17,
    backgroundColor: "#F24986",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: "#F24986",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  resultPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resultIcon: {
    width: 92,
    height: 92,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F24986",
    marginBottom: 22,
  },
  resultFallback: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
  },
  resultTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  resultText: {
    color: "rgba(255, 255, 255, 0.68)",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 10,
  },
});
