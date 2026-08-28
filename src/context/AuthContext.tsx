import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Member } from "../types";

interface AuthContextValue {
  user: User | null;
  member: Member | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [memberLoading, setMemberLoading] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        setMemberLoading(true);
      } else {
        setMember(null);
        setMemberLoading(false);
      }
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!user) {
      setMember(null);
      setMemberLoading(false);
      return;
    }

    setMemberLoading(true);
    const unsubMember = onSnapshot(
      doc(db, "members", user.uid),
      (snap) => {
        setMember(snap.exists() ? (snap.data() as Member) : null);
        setMemberLoading(false);
      },
      (err) => {
        console.error("Firestore member listener error:", err);
        setMember(null);
        setMemberLoading(false);
      }
    );
    return unsubMember;
  }, [user]);

  const loading = authLoading || memberLoading;

  const signIn = async (email: string, password: string) => {
    setMemberLoading(true);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setMember(null);
    setMemberLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, member, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
