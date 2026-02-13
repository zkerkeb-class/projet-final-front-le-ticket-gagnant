import BaccaratScreen from "@/src/features/baccarat/screens/BaccaratScreen";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function BaccaratRoute() {
  const authChecked = useRequireAuth();

  if (!authChecked) {
    return null;
  }

  return <BaccaratScreen />;
}
