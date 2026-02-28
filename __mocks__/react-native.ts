// Minimal mock for react-native in Jest Node environment.
// Only stubs the APIs used by non-UI service modules.

export const Platform = {
	OS: "ios" as "ios" | "android",
	select: <T>(specifics: { ios: T; android: T }): T => specifics.ios,
};
