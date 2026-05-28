import { Stack } from "expo-router";

export default function RootLayout() {
  return(
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen  name="index"/>
      <Stack.Screen  name="login"/>
      <Stack.Screen name="forgot-password"/>
      <Stack.Screen name="reset-password"/>
      <Stack.Screen name="register"/>
      <Stack.Screen name="home"/>
      <Stack.Screen name="game"/>
      <Stack.Screen name="how-well-know-me"/>
      <Stack.Screen name="welcome"/>
    </Stack>
  );
}
