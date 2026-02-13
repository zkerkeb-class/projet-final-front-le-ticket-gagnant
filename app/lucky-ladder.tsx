import LuckyLadderScreen from "@/src/features/lucky-ladder/screens/LuckyLadderScreen";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function LuckyLadderRoute() {
	const authChecked = useRequireAuth();

	if (!authChecked) {
		return null;
	}

	return <LuckyLadderScreen />;
}
