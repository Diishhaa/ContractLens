import { NextRequest, NextResponse } from "next/server";
import { chatAboutContract } from "@/lib/asi-one";

export async function POST(req: NextRequest) {
  try {
    const { contractText, messages } = await req.json();

    if (!contractText || !contractText.trim()) {
      return NextResponse.json(
        { error: "No contract context found. Please analyze a contract first." },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Chat message history is required." },
        { status: 400 }
      );
    }

    // Call ASI:ONE API for contextual chat
    const answer = await chatAboutContract(contractText, messages);

    return NextResponse.json({
      success: true,
      answer,
    });
  } catch (error: any) {
    console.error("Chat Route Error:", error);

    if (error.message && error.message.includes("ASI_ONE_API_KEY")) {
      return NextResponse.json(
        { error: "ASI_ONE_API_KEY is not configured on the server. Please add your key to .env.local to ask questions." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during chat conversation." },
      { status: 500 }
    );
  }
}
