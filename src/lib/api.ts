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

/** Extracts a friendly message out of a Firebase Functions HttpsError. */
export function friendlyError(err: unknown): string {
  const e = err as { message?: string; code?: string };
  return e?.message || "Something went wrong. Please try again.";
}

export const api = {
  checkRegistrationAvailability: httpsCallable<
    { eventId: string; studentRegistrationNumber: string },
    { valid: boolean; available: boolean; isClubMember: boolean }
  >(functions, "checkRegistrationAvailability"),

  submitExternalRegistration: httpsCallable<
    { eventId: string; studentRegistrationNumber: string; fileBase64: string },
    { registrationId: string; fileName: string }
  >(functions, "submitExternalRegistration"),

  submitOwnRegistration: httpsCallable<
    { eventId: string; fileBase64: string },
    { registrationId: string; fileName: string }
  >(functions, "submitOwnRegistration"),
};
