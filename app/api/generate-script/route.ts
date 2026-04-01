export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  console.log("DEBUG: My key is", process.env.GROK_API_KEY);
  try {
    const { prompt } = await req.json();

    // 🛑 THE FIX: Check if the key actually exists before calling OpenAI
    if (!process.env.GROK_API_KEY) {
      console.error("CRITICAL ERROR: GROK_API_KEY is not loaded in the environment!");
      return NextResponse.json(
        { error: "Server configuration error: Missing API Key" },
        { status: 500 }
      );
    }

    // Initialize the OpenAI client pointing to Groq's servers
    const client = new OpenAI({
      apiKey: process.env.GROK_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `Create a professional YouTube video script on: ${prompt}. Make it engaging, structured with intro, body and conclusion.`,
        },
      ],
    });

    return NextResponse.json({
      script: response.choices[0].message.content,
    });
  } catch (error) {
    console.error("API Error:", error);

    return NextResponse.json(
      { error: "Failed to generate script" },
      { status: 500 }
    );
  }
}