import BlackjackScreen from "@/src/features/blackjack/screens/BlackjackScreen";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function BlackjackRoute() {
	const authChecked = useRequireAuth();

	if (!authChecked) {
		return null;
	}

	return <BlackjackScreen />;
}
