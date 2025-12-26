import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";

type User = {
  id: number;
  email: string;
  points: number;
};

type Redemption = {
  id: number;
  pointsSpent: number;
  valueCents: number;
  code?: string | null;
  status: string;
  createdAt: string;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchMe() {
    const res = await fetch("/api/me");
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      setRedemptions(data.redemptions || []);
    } else {
      setUser(null);
    }
  }

  useEffect(() => {
    fetchMe();
  }, []);

  async function manualRedeem() {
    if (!user) return alert("Please login");
    setLoading(true);
    const res = await fetch("/api/redemptions/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: 100 }) // fixed exchange for demo
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return alert(data?.message || "Redeem failed");
    alert("Redeem initiated. Code: " + (data.code || " — check history"));
    fetchMe();
  }

  return (
    <Layout>
      <h2>Dashboard</h2>
      {user ? (
        <div>
          <p>Signed in as <strong>{user.email}</strong></p>
          <p>Points: <strong>{user.points}</strong></p>
          <button onClick={() => location.href = "/game"}>Play Game</button>{" "}
          <button onClick={manualRedeem} disabled={loading}>Manual Redeem 100 pts</button>
          <h3 style={{marginTop:20}}>Redemptions</h3>
          <ul>
            {redemptions.map(r => (
              <li key={r.id}>
                {new Date(r.createdAt).toLocaleString()} — {r.pointsSpent} pts → ${ (r.valueCents/100).toFixed(2) } — {r.status} — code: {r.code || "—"}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          <p>You are not signed in.</p>
          <a href="/auth">Sign up / Sign in</a>
        </div>
      )}
    </Layout>
  );
}