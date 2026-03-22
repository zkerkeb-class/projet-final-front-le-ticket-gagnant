import MinesScreen from "@/src/features/mines/screens/MinesScreen";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function MinesRoute() {
	const authChecked = useRequireAuth();

	if (!authChecked) {
		return null;
	}

	return <MinesScreen />;
}
