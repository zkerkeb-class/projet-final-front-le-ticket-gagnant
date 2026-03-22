import PokerScreen from "@/src/features/poker/screens/PokerScreen";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function PokerRoute() {
	const authChecked = useRequireAuth();

	if (!authChecked) {
		return null;
	}

	return <PokerScreen />;
}
