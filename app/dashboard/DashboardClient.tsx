"use client";

import { useState } from "react";
import { SignOutButton, UserButton } from "@clerk/nextjs";

export default function DashboardClient() {
  const [prompt, setPrompt] = useState("");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);

  const generateScript = async () => {
    setLoading(true);

    const res = await fetch("/api/generate-script", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();
    setScript(data.script);

    setLoading(false);
  };

  

  return (
    
    <div className="min-h-screen bg-black text-white">

      {/* 🔥 NAVBAR */}
      <div className="flex justify-between items-center px-10 py-5 border-b border-gray-800 backdrop-blur-md bg-black/70 sticky top-0 z-50">
        <h1 className="text-2xl font-bold tracking-wide">
          🎬 AI Studio
        </h1>

        <div className="flex items-center gap-4">
          <UserButton />
          <SignOutButton>
            <button className="bg-red-600 px-4 py-2 rounded-md text-sm hover:bg-red-700 transition">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* 🔥 HERO SECTION */}
      <div className="max-w-5xl mx-auto mt-16 px-6">
        <h2 className="text-5xl font-bold mb-4 leading-tight">
          Create AI Video Scripts 🎬
        </h2>
        <p className="text-gray-400 mb-10">
          Generate high-quality scripts instantly using AI
        </p>

        {/* INPUT CARD */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl shadow-2xl border border-gray-700">
          <input
            className="w-full p-4 bg-black/50 rounded-lg mb-4 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-600"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your video topic..."
          />

          <button
            onClick={generateScript}
            className="w-full bg-red-600 py-3 rounded-lg font-medium hover:bg-red-700 transition transform hover:scale-[1.02]"
          >
            {loading ? "Generating..." : "Generate Script"}
          </button>
        </div>

        {/* OUTPUT */}
        {script && (
          <div className="mt-12 bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-800 hover:shadow-2xl transition">
            <h3 className="text-2xl font-semibold mb-4">
              🎬 Generated Script
            </h3>

            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
              {script}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}