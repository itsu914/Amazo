import React from "react";
import Link from "next/link";

export default function Layout({ children }: { children: React.ReactNode; }) {
  return (
    <div className="container">
      <header className="header">
        <h1>Game Rewards MVP</h1>
        <nav>
          <Link href="/">Dashboard</Link>{" | "}
          <Link href="/game">Play</Link>{" | "}
          <Link href="/auth">Sign In</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}