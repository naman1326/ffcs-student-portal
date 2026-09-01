import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:application/pdf;base64," prefix.
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Extracts a friendly message out of a Firebase Functions / Auth error. */
export function friendlyError(err: unknown): string {
  const e = err as { message?: string; code?: string };
  return e?.message || "Something went wrong. Please try again.";
}

