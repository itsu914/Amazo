import React, { useRef, useEffect, useState } from "react";
import Layout from "../components/Layout";

function GameCanvas({ onWin }: { onWin: (score:number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [collected, setCollected] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let w = canvas.width = 600;
    let h = canvas.height = 300;

    let coins: {x:number,y:number, r:number}[] = [];
    function spawn() {
      coins.push({ x: Math.random()*(w-30)+15, y: Math.random()*(h-30)+15, r: 10 });
    }
    for(let i=0;i<5;i++) spawn();

    function draw() {
      ctx.fillStyle = "#0ea5a4";
      ctx.fillRect(0,0,w,h);
      // coins
      ctx.fillStyle = "gold";
      for(const c of coins) {
        ctx.beginPath();
        ctx.arc(c.x,c.y,c.r,0,Math.PI*2);
        ctx.fill();
      }
      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("Collect 10 coins to win", 10, 20);
      ctx.fillText("Collected: " + collected, 10, 40);
    }

    function loop() {
      draw();
      if (running) requestAnimationFrame(loop);
    }
    setRunning(true);
    requestAnimationFrame(loop);

    function onClick(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // hit test coins
      for(let i=coins.length-1;i>=0;i--) {
        const c = coins[i];
        const dx = x - c.x, dy = y - c.y;
        if (dx*dx+dy*dy <= c.r*c.r) {
          coins.splice(i,1);
          setCollected(cn => {
            const v = cn + 1;
            // spawn occasionally
            if (Math.random() < 0.6) spawn();
            if (v >= 10) {
              setRunning(false);
              onWin(v);
            }
            return v;
          });
          break;
        }
      }
    }
    canvas.addEventListener("click", onClick);
    return () => {
      canvas.removeEventListener("click", onClick);
      setRunning(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} style={{border:"1px solid #ddd", width:600, height:300}} />;
}

export default function GamePage() {
  const [status, setStatus] = useState<string | null>(null);

  async function handleWin(score:number) {
    setStatus("Sending win to server...");
    const res = await fetch("/api/game/complete", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ pointsAwarded: 10, score })
    });
    const data = await res.json();
    if (res.ok) {
      setStatus(`Awarded ${data.pointsAwarded} points. New balance: ${data.newBalance}`);
    } else {
      setStatus(`Failed: ${data?.message || "error"}`);
    }
  }

  return (
    <Layout>
      <h2>Play</h2>
      <p>Click coins on the canvas. Collect 10 coins to win a round (awards 10 pts).</p>
      <GameCanvas onWin={handleWin} />
      <p>{status}</p>
    </Layout>
  );
}