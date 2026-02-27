// share.ts — utility to capture a View as a PNG and open the native share sheet.
// Uses react-native-view-shot for capture and expo-sharing for the share sheet.
// No default exports. TypeScript strict mode.

import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import type ViewShot from "react-native-view-shot";
import { captureRef } from "react-native-view-shot";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShareResult {
	/** true if the share sheet was opened; false if sharing was unavailable or errored. */
	success: boolean;
	/** Human-readable error message, undefined on success. */
	error?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Captures the View referenced by `viewRef` as a PNG image and opens the
 * native share sheet.
 *
 * The caller is responsible for ensuring `viewRef.current` is mounted before
 * calling this function.
 *
 * @param viewRef - Ref attached to the View (or ViewShot wrapper) to capture.
 * @returns ShareResult indicating success or failure.
 */
export async function shareStreakCard(
	viewRef: RefObject<ViewShot | null>,
): Promise<ShareResult> {
	// Check sharing availability (unavailable on some simulators/web).
	const available = await Sharing.isAvailableAsync();
	if (!available) {
		return {
			success: false,
			error: "Sharing is not available on this device.",
		};
	}

	let uri: string;
	try {
		uri = await captureRef(viewRef, {
			format: "png",
			quality: 1,
			// Use a fixed width so the card renders at a predictable resolution
			// regardless of device pixel density.
			result: "tmpfile",
		});
	} catch (captureError) {
		const message =
			captureError instanceof Error
				? captureError.message
				: "Failed to capture image.";
		return { success: false, error: message };
	}

	try {
		await Sharing.shareAsync(uri, {
			mimeType: "image/png",
			dialogTitle: "Share your streak",
			UTI: "public.png",
		});
		return { success: true };
	} catch (shareError) {
		// User dismissed the share sheet — not an error from UX perspective.
		// expo-sharing throws when the user cancels on Android; treat as success.
		const message =
			shareError instanceof Error ? shareError.message : String(shareError);
		// "The user did not share" / cancelled — ignore gracefully.
		if (
			message.toLowerCase().includes("cancel") ||
			message.toLowerCase().includes("dismiss") ||
			message.toLowerCase().includes("did not share")
		) {
			return { success: true };
		}
		return { success: false, error: message };
	}
}
