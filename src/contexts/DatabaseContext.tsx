// DatabaseContext — initializes SQLite on mount and exposes the db instance.
// No default exports. TypeScript strict mode.

import { initDatabase } from "@/src/data/database";
import type { SQLiteDatabase } from "expo-sqlite";
import type React from "react";
import {
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useState,
} from "react";

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

interface DatabaseContextValue {
	db: SQLiteDatabase;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface DatabaseProviderProps {
	children: ReactNode;
}

export function DatabaseProvider({
	children,
}: DatabaseProviderProps): React.ReactElement | null {
	const [db, setDb] = useState<SQLiteDatabase | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function init(): Promise<void> {
			const database = await initDatabase();

			if (!cancelled) {
				setDb(database);
			}
		}

		void init();

		return () => {
			cancelled = true;
		};
	}, []);

	if (db === null) {
		// Render nothing while the database is initializing.
		return null;
	}

	return (
		<DatabaseContext.Provider value={{ db }}>
			{children}
		</DatabaseContext.Provider>
	);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the initialized SQLiteDatabase instance.
 * Must be used inside a DatabaseProvider; throws otherwise.
 */
export function useDatabaseContext(): DatabaseContextValue {
	const value = useContext(DatabaseContext);
	if (value === null) {
		throw new Error("useDatabaseContext must be used inside DatabaseProvider.");
	}
	return value;
}
