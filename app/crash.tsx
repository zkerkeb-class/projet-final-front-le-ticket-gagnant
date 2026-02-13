import CrashScreen from "@/src/features/crash/screens/CrashScreen";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function CrashRoute() {
	const authChecked = useRequireAuth();

	if (!authChecked) {
		return null;
	}

	return <CrashScreen />;
}
