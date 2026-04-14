"use client";

import { useEffect, useState } from "react";
import LogoutButton from "../../components/LogoutButton";

export default function DashboardClient() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [script, setScript] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (videoUrl.startsWith("blob:")) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const generateVideo = async () => {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setError("Enter a video idea first.");
      return;
    }

    setLoading(true);
    setError("");
    setVideoUrl((currentVideoUrl) => {
      if (currentVideoUrl.startsWith("blob:")) {
        URL.revokeObjectURL(currentVideoUrl);
      }

      return "";
    });
    setScript("");

    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: trimmedPrompt }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Video generation failed.");
      }

      const videoBlob = await res.blob();
      const objectUrl = URL.createObjectURL(videoBlob);
      const encodedScript = res.headers.get("X-Video-Script");

      setVideoUrl(objectUrl);
      setScript(encodedScript ? decodeURIComponent(encodedScript) : "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video generation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800 bg-black/80 backdrop-blur-md">
        <h1 className="text-lg font-semibold tracking-wide">AI Studio</h1>

        <div className="flex items-center gap-4">
          <LogoutButton />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <h2 className="text-3xl font-semibold mb-6 text-center">
          Create AI Videos
        </h2>

        <input
          className="w-[400px] max-w-full p-4 bg-gray-900 rounded-lg mb-4 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-600"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your idea..."
        />

        <button
          onClick={generateVideo}
          disabled={loading}
          className="bg-red-600 px-5 py-2 rounded text-sm hover:bg-red-700 transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Generating..." : "Generate Video"}
        </button>

        {loading && (
          <p className="text-gray-400 mt-4 animate-pulse">
            Creating a 20-25 second video with voiceover...
          </p>
        )}

        {error && (
          <p className="text-red-400 mt-4 text-center max-w-[400px]">
            {error}
          </p>
        )}

        {videoUrl && (
          <div className="mt-8 flex flex-col items-center">
            <video controls className="w-[400px] max-w-full rounded-lg">
              <source src={videoUrl} type="video/mp4" />
            </video>

            {script && (
              <p className="mt-4 text-sm text-gray-300 max-w-[520px] text-center">
                {script}
              </p>
            )}

            <a href={videoUrl} download="ai-video.mp4">
              <button className="mt-4 bg-green-600 px-4 py-2 rounded">
                Download Video
              </button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
