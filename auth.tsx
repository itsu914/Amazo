import React, { useState } from "react";
import Layout from "../components/Layout";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login"|"register">("register");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const url = mode === "register" ? "/api/auth/register" : "/api/auth/login";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      alert("Success. You are signed in.");
      location.href = "/";
    } else {
      alert(data?.message || "Error");
    }
  }

  return (
    <Layout>
      <h2>{mode === "register" ? "Sign Up" : "Sign In"}</h2>
      <form onSubmit={submit}>
        <div>
          <label>Email</label><br />
          <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required />
        </div>
        <div>
          <label>Password</label><br />
          <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" required />
        </div>
        <div style={{marginTop:8}}>
          <button type="submit">{mode === "register" ? "Register" : "Login"}</button>{" "}
          <button type="button" onClick={()=>setMode(mode==="register"?"login":"register")}>
            {mode==="register" ? "Switch to Login" : "Switch to Register"}
          </button>
        </div>
      </form>
      <p style={{marginTop:12, color:"#555"}}>
        ※ 本番環境ではメール確認・CAPTCHA・追加の不正検知を必須にしてください。
      </p>
    </Layout>
  );
}