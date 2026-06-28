"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  ArrowRight,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Send,
  Trash2,
  Lock,
  ChevronRight,
  Info
} from "lucide-react";
import { DEMO_CONTRACT_TEXT, DEMO_CONTRACT_NAME } from "./DemoContract";
import type { ContractAnalysisResult } from "@/lib/asi-one";

export default function ContractLensApp() {
  // App States
  // 'landing' -> file upload / paste interface
  // 'preview' -> showing contract text before analyzing (ideal for demo flow)
  // 'analyzing' -> loading state sending to ASI:ONE
  // 'results' -> dashboard and chat
  const [appState, setAppState] = useState<"landing" | "preview" | "analyzing" | "results">("landing");
  const [activeTab, setActiveTab] = useState<"file" | "text">("file");
  
  // File & Text States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [contractText, setContractText] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  
  // OCR/Parsing & Analysis States
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ContractAnalysisResult | null>(null);
  
  // Chat States
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Rotating loading messages for visual polish
  const loadingMessages = [
    "Extracting contract clauses and formatting...",
    "Sending document to ASI:ONE reasoning engine...",
    "ASI:ONE is scanning for liabilities and restrictions...",
    "Translating complex legal jargon into simple English...",
    "Compiling summary, warnings, and key clauses..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (appState === "analyzing") {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [appState]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setError("Unsupported file format. Please upload a PDF or image (PNG, JPG, JPEG).");
      return;
    }
    setSelectedFile(file);
    setDocumentTitle(file.name);
    setError(null);
    setAppState("preview");
    
    // Provide a small visual confirmation
    // Note: PDF / Image text extraction happens in the backend API
  };

  // Loads the pre-defined demo contract
  const handleLoadDemo = () => {
    setSelectedFile(null);
    setAppState("preview");
    setContractText(DEMO_CONTRACT_TEXT);
    setDocumentTitle(DEMO_CONTRACT_NAME);
    setError(null);
  };

  // Resets the application state
  const handleReset = () => {
    setAppState("landing");
    setSelectedFile(null);
    setPastedText("");
    setContractText("");
    setDocumentTitle("");
    setAnalysis(null);
    setChatMessages([]);
    setError(null);
  };

  // Triggers the Backend Analysis Route
  const handleAnalyze = async () => {
    setAppState("analyzing");
    setLoadingStep(0);
    setError(null);

    const formData = new FormData();
    if (selectedFile) {
      formData.append("file", selectedFile);
    } else if (contractText) {
      formData.append("text", contractText);
    } else if (activeTab === "text" && pastedText) {
      formData.append("text", pastedText);
      setContractText(pastedText);
      setDocumentTitle("Pasted_Contract_Text.txt");
    } else {
      setError("Please upload a file or enter contract text to analyze.");
      setAppState("landing");
      return;
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze contract.");
      }

      setAnalysis(data.analysis);
      if (data.text) {
        setContractText(data.text);
      }
      setAppState("results");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during contract analysis.");
      setAppState("landing");
    }
  };

  // Handles Sending Chat Messages
  const handleSendChat = async (messageText?: string) => {
    const query = messageText || chatInput;
    if (!query.trim() || isChatLoading) return;

    // Add user message to state
    const updatedMessages = [...chatMessages, { role: "user" as const, content: query }];
    setChatMessages(updatedMessages);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractText,
          messages: updatedMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate chat response.");
      }

      setChatMessages((prev) => [...prev, { role: "assistant" as const, content: data.answer }]);
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant" as const, content: `Error: ${err.message || "Failed to get response from ASI:ONE."}` }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Clickable Question Chip functionality
  const handleQuickQuestion = (question: string) => {
    handleSendChat(question);
    // Smooth scroll to the chat area
    document.getElementById("chat-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-6 md:max-w-2xl lg:max-w-4xl">
      {/* Header Bar */}
      <header className="flex justify-between items-center mb-8 bg-white py-3 px-5 rounded-2xl shadow-premium border border-gray-100">
        <div className="flex items-center gap-2" onClick={handleReset} style={{ cursor: "pointer" }}>
          <div className="bg-primary text-white p-2 rounded-xl">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-foreground tracking-tight">ContractLens <span className="text-primary">AI</span></h1>
            <p className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase">Understand Before You Sign</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-primary-light px-3 py-1 rounded-full text-xs font-semibold text-primary">
          <Lock className="h-3 w-3" />
          <span>Server Secured</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex gap-3 items-start animate-fade-in shadow-sm">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Action Required</p>
              <p className="text-xs text-red-600 mt-1 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* 1. Landing View */}
        {appState === "landing" && (
          <div className="space-y-6">
            {/* Hero Section */}
            <div className="text-center py-8 space-y-4">
              <span className="bg-primary-light text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Hackathon Agentic Special Build
              </span>
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
                Understand legal documents in plain English.
              </h2>
              <p className="text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
                Upload your employment contract, rental agreement, or terms and conditions, and let ASI:ONE explain the risks.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleLoadDemo}
                  className="bg-white hover:bg-gray-50 text-primary border border-primary/20 hover:border-primary px-6 py-2.5 rounded-full text-sm font-bold shadow-sm transition-all duration-200 flex items-center gap-2 mx-auto"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Try Demo Contract</span>
                </button>
              </div>
            </div>

            {/* Upload Area Tabs */}
            <div className="bg-white rounded-3xl shadow-premium border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => setActiveTab("file")}
                  className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
                    activeTab === "file"
                      ? "border-primary text-primary bg-white"
                      : "border-transparent text-gray-500 hover:text-gray-900"
                  }`}
                >
                  File Upload
                </button>
                <button
                  onClick={() => setActiveTab("text")}
                  className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
                    activeTab === "text"
                      ? "border-primary text-primary bg-white"
                      : "border-transparent text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Paste Text
                </button>
              </div>

              <div className="p-6">
                {activeTab === "file" ? (
                  /* File Upload Area */
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
                      dragActive
                        ? "border-primary bg-primary-light/50 scale-[0.99]"
                        : "border-gray-200 hover:border-primary/50 hover:bg-gray-50/50"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      className="hidden"
                    />
                    <div className="bg-primary-light text-primary p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                      <Upload className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-sm text-foreground mb-1">
                      Drag & Drop Contract File
                    </h3>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto leading-normal mb-3">
                      Supports PDF, PNG, JPG, or JPEG formats.
                    </p>
                    <span className="inline-block bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-primary-hover transition-colors">
                      Browse Files
                    </span>
                  </div>
                ) : (
                  /* Paste Text Area */
                  <div className="space-y-4">
                    <textarea
                      placeholder="Paste your legal document, contract terms, or agreement clauses here..."
                      rows={10}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      className="w-full border border-gray-200 rounded-2xl p-4 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                    />
                    <button
                      onClick={() => {
                        if (pastedText.trim().length < 20) {
                          setError("Pasted text is too short. Please provide at least 20 characters.");
                          return;
                        }
                        setContractText(pastedText);
                        setDocumentTitle("Pasted_Contract_Text.txt");
                        setAppState("preview");
                      }}
                      className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-2xl text-xs font-bold shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Preview</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Engine Credit Footer */}
            <div className="text-center text-xs text-gray-400 font-medium">
              Powered by the Web3 Agentic Core Intelligence Engine:{" "}
              <span className="text-primary font-bold">ASI:ONE</span>
            </div>
          </div>
        )}

        {/* 2. Preview View (Shows contract before analyzing) */}
        {appState === "preview" && (
          <div className="bg-white rounded-3xl shadow-premium border border-gray-100 p-6 space-y-6">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 text-primary p-2.5 rounded-xl">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground max-w-[200px] truncate md:max-w-md">
                    {documentTitle}
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "Pre-loaded Content"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                title="Discard file"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Document Preview Box */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Document Content Preview
              </label>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 max-h-72 overflow-y-auto text-xs leading-relaxed text-gray-600 font-mono scrollbar-hide">
                {selectedFile ? (
                  <p className="italic text-gray-400 text-center py-12">
                    [File selected: {selectedFile.name}. Content will be extracted and analyzed on click.]
                  </p>
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">{contractText}</pre>
                )}
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleAnalyze}
              className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-2xl text-xs font-bold shadow-premium hover:shadow-premium-hover transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              <Sparkles className="h-4 w-4 text-white group-hover:rotate-12 transition-transform" />
              <span>Analyze with ASI:ONE Engine</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* 3. Analyzing State (Loading screen) */}
        {appState === "analyzing" && (
          <div className="bg-white rounded-3xl shadow-premium border border-gray-100 p-12 text-center space-y-6 flex flex-col items-center">
            {/* Spinning/Pulsing Logo */}
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
              <div className="absolute inset-0 m-auto w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <Sparkles className="h-7 w-7" />
              </div>
            </div>

            <div className="space-y-2 max-w-sm">
              <h3 className="font-bold text-lg text-foreground">ASI:ONE is analyzing your document...</h3>
              <p className="text-xs text-gray-400 min-h-[3rem] px-4 leading-normal flex items-center justify-center font-medium">
                {loadingMessages[loadingStep]}
              </p>
            </div>
            
            <div className="w-full bg-gray-100 h-1.5 rounded-full max-w-xs overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* 4. Results & Chat View */}
        {appState === "results" && analysis && (
          <div className="space-y-8 animate-fade-in">
            {/* Document Header */}
            <div className="bg-white border border-gray-100 shadow-premium p-4 rounded-2xl flex flex-col md:flex-row md:justify-between md:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary/5 text-primary p-2.5 rounded-xl">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground max-w-[240px] truncate md:max-w-md">
                    {documentTitle}
                  </h4>
                  <p className="text-[10px] text-primary font-semibold flex items-center gap-1.5 mt-0.5">
                    <Sparkles className="h-3 w-3" />
                    <span>Analyzed by ASI:ONE Ultra</span>
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleReset}
                className="bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-150 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 self-start md:self-auto"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Upload New Contract</span>
              </button>
            </div>

            {/* Dashboard Cards Grid (4 Cards as specified) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1: Simple Summary */}
              <div className="bg-white rounded-3xl shadow-premium border border-gray-100 p-6 space-y-4 hover:shadow-premium-hover transition-all-300">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-50 text-primary p-2 rounded-xl">
                    <Info className="h-5 w-5" />
                  </div>
                  <h3 className="font-extrabold text-sm text-foreground">Simple English Summary</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">
                  {analysis.simple_summary}
                </p>
                {analysis.overall_explanation && (
                  <div className="pt-2 border-t border-gray-50">
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      {analysis.overall_explanation}
                    </p>
                  </div>
                )}
              </div>

              {/* Card 2: Key Points */}
              <div className="bg-white rounded-3xl shadow-premium border border-gray-100 p-6 space-y-4 hover:shadow-premium-hover transition-all-300">
                <div className="flex items-center gap-2">
                  <div className="bg-green-50 text-green-600 p-2 rounded-xl">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <h3 className="font-extrabold text-sm text-foreground">Key Points</h3>
                </div>
                <ul className="space-y-2.5">
                  {analysis.key_points.map((point, index) => (
                    <li key={index} className="flex gap-2 text-xs text-gray-600 leading-relaxed font-medium">
                      <span className="text-green-500 font-bold shrink-0 mt-0.5">✓</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Card 3: Important Warnings */}
              <div className="bg-red-50/30 rounded-3xl shadow-premium border border-red-100/50 p-6 space-y-4 hover:shadow-premium-hover transition-all-300">
                <div className="flex items-center gap-2">
                  <div className="bg-red-50 text-red-500 p-2 rounded-xl">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <h3 className="font-extrabold text-sm text-foreground text-red-950">Important Warnings</h3>
                </div>
                <div className="flex flex-col gap-2.5">
                  {analysis.important_warnings.map((warning, index) => (
                    <div 
                      key={index} 
                      className="bg-white border border-red-100/80 rounded-xl p-3 flex gap-2 text-xs text-gray-700 leading-normal shadow-sm font-medium"
                    >
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase shrink-0 h-fit mt-0.5">
                        Warning
                      </span>
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4: Questions To Ask */}
              <div className="bg-white rounded-3xl shadow-premium border border-gray-100 p-6 space-y-4 hover:shadow-premium-hover transition-all-300">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-50 text-amber-500 p-2 rounded-xl">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <h3 className="font-extrabold text-sm text-foreground">Questions To Ask</h3>
                </div>
                <p className="text-[11px] text-gray-400 leading-normal">
                  Click any question to ask ASI:ONE immediately in the chat below:
                </p>
                <div className="flex flex-col gap-2">
                  {analysis.questions_to_ask.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickQuestion(question)}
                      className="text-left w-full bg-gray-50 hover:bg-primary-light hover:text-primary border border-gray-100 hover:border-primary/20 rounded-xl p-2.5 text-xs text-gray-600 font-bold transition-all flex justify-between items-center group"
                    >
                      <span className="pr-2">{question}</span>
                      <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Chat Feature Interface */}
            <div id="chat-section" className="bg-white rounded-3xl shadow-premium border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 p-5 bg-gray-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="bg-primary text-white p-2 rounded-xl">
                    <MessageSquare className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-foreground">Ask About This Contract</h3>
                    <p className="text-[10px] text-gray-400">Contextual Q&A answered by ASI:ONE</p>
                  </div>
                </div>
              </div>

              {/* Demo Mode Quick Prompts */}
              <div className="px-5 pt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => handleQuickQuestion("What is the biggest risk in this contract?")}
                  className="bg-primary-light/50 hover:bg-primary-light text-primary text-[11px] font-bold px-3 py-1.5 rounded-full border border-primary/10 hover:border-primary/30 transition-all flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Ask: "What is the biggest risk?"</span>
                </button>
                <button
                  onClick={() => handleQuickQuestion("Can they terminate me without notice?")}
                  className="bg-primary-light/50 hover:bg-primary-light text-primary text-[11px] font-bold px-3 py-1.5 rounded-full border border-primary/10 hover:border-primary/30 transition-all"
                >
                  "Can they terminate me without notice?"
                </button>
                <button
                  onClick={() => handleQuickQuestion("Am I liable for damages?")}
                  className="bg-primary-light/50 hover:bg-primary-light text-primary text-[11px] font-bold px-3 py-1.5 rounded-full border border-primary/10 hover:border-primary/30 transition-all"
                >
                  "Am I liable for damages?"
                </button>
              </div>

              {/* Chat Messages Log */}
              <div className="p-5 min-h-[16rem] max-h-[22rem] overflow-y-auto space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-2">
                    <MessageSquare className="h-8 w-8 text-gray-300" />
                    <p className="text-xs font-bold">No questions asked yet.</p>
                    <p className="text-[10px] max-w-xs leading-normal">
                      Ask about cancellation terms, notices, non-competes, or select from the quick prompt chips above.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div 
                        className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed font-medium ${
                          msg.role === "user" 
                            ? "bg-primary text-white rounded-br-sm" 
                            : "bg-gray-100 text-gray-800 rounded-bl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}

                {/* AI Loading State */}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-500 rounded-2xl rounded-bl-sm p-3.5 text-xs flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                      <span className="font-bold text-[10px]">ASI:ONE is typing...</span>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="border-t border-gray-100 p-4 bg-gray-50/50 flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask a question about this contract..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isChatLoading}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs leading-normal focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 font-medium"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="bg-primary hover:bg-primary-hover disabled:bg-gray-300 text-white p-2.5 rounded-xl transition-colors shrink-0 flex items-center justify-center"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="mt-12 text-center text-[10px] text-gray-400 font-medium space-y-1">
        <p>© 2026 ContractLens AI. Developed for Hack-A-Agent Hackathon.</p>
        <p>Disclaimer: ContractLens AI converts legal text into simple summaries. It does not provide legal advice.</p>
      </footer>
    </div>
  );
}
