import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged,type  User } from "firebase/auth";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-blue-600 text-xl font-semibold">
          💰 Memuat...
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <Login />;
}