import RouletteGame from "@/src/games/roulette";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function RouletteScreen() {
  const authChecked = useRequireAuth();

  if (!authChecked) {
    return null;
  }

  return <RouletteGame />;
}
