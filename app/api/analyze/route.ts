import { NextRequest, NextResponse } from "next/server";
import { analyzeContract } from "@/lib/asi-one";
import pdf from "pdf-parse";
import { createWorker } from "tesseract.js";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const pastedText = formData.get("text") as string | null;

    let text = "";

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileType = file.type;

      if (fileType === "application/pdf") {
        try {
          const pdfData = await pdf(buffer);
          text = pdfData.text;
          if (!text || text.trim().length < 10) {
            return NextResponse.json(
              { error: "The PDF file is empty or scanned (does not contain selectable text). Please copy-paste the contract text directly." },
              { status: 400 }
            );
          }
        } catch (pdfErr: any) {
          console.error("PDF Parsing Error:", pdfErr);
          return NextResponse.json(
            { error: `Failed to parse PDF: ${pdfErr.message || pdfErr}. Please ensure it is not password-protected or paste the text manually.` },
            { status: 400 }
          );
        }
      } else if (fileType.startsWith("image/")) {
        try {
          // Setup Tesseract worker
          const worker = await createWorker('eng');
          const { data: { text: extractedText } } = await worker.recognize(buffer);
          await worker.terminate();
          text = extractedText;
          if (!text || text.trim().length < 10) {
            return NextResponse.json(
              { error: "Could not extract readable text from the image. Please use a clearer screenshot or paste the text manually." },
              { status: 400 }
            );
          }
        } catch (ocrErr: any) {
          console.error("OCR Error:", ocrErr);
          return NextResponse.json(
            { 
              error: `OCR engine error: ${ocrErr.message || ocrErr}. Note: OCR downloads language models from a CDN. Since the system is offline, please paste the contract text directly.` 
            },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Unsupported file format. Please upload a PDF, JPG, JPEG, or PNG." },
          { status: 400 }
        );
      }
    } else if (pastedText) {
      text = pastedText;
    }

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        { error: "Please upload a contract file or paste the contract text (at least 20 characters) to analyze." },
        { status: 400 }
      );
    }

    // Call ASI:ONE API for contract analysis
    const analysis = await analyzeContract(text);

    return NextResponse.json({
      success: true,
      text,
      analysis,
    });
  } catch (error: any) {
    console.error("Analyze Route Error:", error);
    
    // Check if key is missing
    if (error.message && error.message.includes("ASI_ONE_API_KEY")) {
      return NextResponse.json(
        { error: "ASI_ONE_API_KEY is not configured on the server. Please add your key to .env.local to run the analysis." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during contract analysis." },
      { status: 500 }
    );
  }
}
