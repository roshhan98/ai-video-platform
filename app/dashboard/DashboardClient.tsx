"use client";

import { useState } from "react";
import LogoutButton from "../../components/LogoutButton";

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
  <div className="h-screen bg-black text-white flex flex-col">

    {/* 🔥 NAVBAR (KEEP, just refine spacing) */}
    <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800 bg-black/80 backdrop-blur-md">
      <h1 className="text-lg font-semibold tracking-wide">
        🎬 AI Studio
      </h1>

      <div className="flex items-center gap-4">
        <LogoutButton />
        
      </div>
    </div>

    {/* 🔥 CENTER SECTION (MAIN FIX) */}
    <div className="flex flex-1 flex-col items-center justify-center px-4">

      <h2 className="text-3xl font-semibold mb-6 text-center">
        Create AI Videos
      </h2>

      {/* INPUT */}
      <input
        className="w-[400px] max-w-full p-4 bg-gray-900 rounded-lg mb-4 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-600"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your idea..."
      />

      {/* BUTTON (SMALL + CENTERED) */}
      <button
        onClick={generateScript}
        className="bg-red-600 px-5 py-2 rounded text-sm hover:bg-red-700 transition"
      >
        {loading ? "Generating..." : "Generate Script"}
      </button>

      {/* LOADING STATE (IMPORTANT UX) */}
      {loading && (
        <p className="text-gray-400 mt-4 animate-pulse">
          AI is generating your script...
        </p>
      )}

      {/* OUTPUT (IMPROVED UI) */}
      {script && !loading && (
        <div className="mt-8 w-[600px] max-w-full bg-gray-900 p-6 rounded-xl border border-gray-800">

          <h3 className="text-lg font-medium mb-3 text-gray-300">
            Generated Script
          </h3>

          <p className="text-gray-400 whitespace-pre-line text-sm leading-relaxed">
            {script}
          </p>

        </div>
      )}

    </div>
  </div>
);
}