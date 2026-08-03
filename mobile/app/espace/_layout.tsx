import { Stack } from "expo-router";

import { couleurs } from "../../src/theme/tokens";

export default function DispositionEspace() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: couleurs.bg },
      }}
    />
  );
}
