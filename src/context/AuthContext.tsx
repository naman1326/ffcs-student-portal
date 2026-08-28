import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, User } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setMember(null);
        setLoading(false);
      }
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubMember = onSnapshot(
      doc(db, "members", user.uid),
      async (snap) => {
        if (snap.exists()) {
          setMember(snap.data() as Member);
          setLoading(false);
        } else if (user.email) {
          // Fallback: lookup by collegeEmail in case document ID is not user.uid
          try {
            const emailQuery = query(
              collection(db, "members"),
              where("collegeEmail", "==", user.email.trim().toLowerCase())
            );
            const querySnap = await getDocs(emailQuery);
            if (!querySnap.empty) {
              setMember(querySnap.docs[0].data() as Member);
            } else {
              setMember(null);
            }
          } catch {
            setMember(null);
          }
          setLoading(false);
        } else {
          setMember(null);
          setLoading(false);
        }
      },
      () => setLoading(false)
    );
    return unsubMember;
  }, [user]);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, member, loading, signIn, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
