import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, X, AlertCircle, CheckCircle2, Mic, MicOff } from "lucide-react";
import { api } from "../api/client";
import { Family } from "../types";

interface AiModalProps {
  family: Family;
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

const SUGGESTIONS = [
  "Summarize my day",
  "Add groceries to list",
  "Check medicine schedule",
  "Create Saturday chore",
];

export const AiModal: React.FC<AiModalProps> = ({
  family,
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string; action?: any }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  if (!isOpen) return null;

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userText = text.trim();
    setInput("");
    setErrorNotice(null);
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setLoading(true);

    try {
      const res = await api.askAiAssistant(family.id, userText);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
          action: res.action,
        },
      ]);
      if (res.action && onRefreshData) {
        onRefreshData();
      }
    } catch (err: any) {
      setErrorNotice(err.message || "Failed to communicate with AI Assistant");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleToggleMic = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Simulate quick voice dictation for demonstration
      setIsListening(true);
      setTimeout(() => {
        setInput("Summarize today's household schedule and tasks");
        setIsListening(false);
      }, 1400);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognition.start();
      } catch {
        setIsListening(false);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: 680,
          height: 640,
          display: "flex",
          flexDirection: "column",
          padding: 24,
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              className="chip-icon"
              style={{
                width: 38,
                height: 38,
                borderRadius: 14,
                background: "var(--accent)",
                color: "#fff",
                boxShadow: "0 4px 14px rgba(79, 79, 224, 0.35)",
              }}
            >
              <Sparkles size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text)" }}>
                HomeSync AI Assistant
              </h2>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 500 }}>
                Powered by Gemini • Authorized household context only
              </div>
            </div>
          </div>

          <button className="icon-btn" onClick={onClose} aria-label="Close Assistant">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Configuration Notice if API Error */}
        {errorNotice && (
          <div
            style={{
              padding: 12,
              borderRadius: 16,
              background: "rgba(240, 86, 140, 0.12)",
              border: "1px solid rgba(240, 86, 140, 0.3)",
              color: "var(--text)",
              fontSize: "0.82rem",
              marginBottom: 10,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <AlertCircle size={18} color="#F0568C" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700 }}>AI Integration Status</div>
              <div>{errorNotice}</div>
            </div>
          </div>
        )}

        {/* Message Log */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "8px 4px",
          }}
        >
          {messages.length === 0 ? (
            <div className="empty-state" style={{ margin: "auto" }}>
              <div
                className="chip-icon"
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 20,
                  background: "var(--nav-active-bg)",
                  color: "var(--accent)",
                  marginBottom: 8,
                }}
              >
                <Sparkles size={28} strokeWidth={1.8} />
              </div>
              <div className="empty-title">How can I assist your home today?</div>
              <div className="empty-subtitle">
                Ask questions about family schedules, groceries, chores, or dictate an action to update the household.
              </div>

              {/* Suggestion Chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 14 }}>
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="ai-suggestion-chip"
                    onClick={() => sendMessage(s)}
                  >
                    <Sparkles size={13} strokeWidth={1.8} color="var(--accent)" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={m.role === "user" ? "ai-glass-bubble-user" : "ai-glass-bubble-bot"}
                >
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>

                  {m.action && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "8px 12px",
                        borderRadius: 12,
                        background: "rgba(31, 169, 113, 0.16)",
                        color: "#1FA971",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        border: "1px solid rgba(31, 169, 113, 0.3)",
                      }}
                    >
                      <CheckCircle2 size={16} strokeWidth={2} />
                      <span>
                        Action executed: {m.action.type.replace(/_/g, " ")} ({m.action.name || m.action.title})
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div
                  className="ai-glass-bubble-bot"
                  style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontStyle: "italic" }}
                >
                  <Sparkles size={16} className="animate-spin" />
                  <span>Checking authorized household records...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Suggestion Bar when chat has messages */}
        {messages.length > 0 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "6px 2px", marginBottom: 6 }}>
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                className="ai-suggestion-chip"
                onClick={() => sendMessage(s)}
              >
                <span>{s}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input Bar with Mic Button */}
        <form onSubmit={handleSend} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <button
            type="button"
            className={`ai-mic-btn ${isListening ? "active" : ""}`}
            onClick={handleToggleMic}
            title={isListening ? "Listening... click to stop" : "Voice dictate"}
            aria-label="Voice dictate"
          >
            {isListening ? <MicOff size={18} strokeWidth={1.8} /> : <Mic size={18} strokeWidth={1.8} />}
          </button>

          <input
            type="text"
            className="form-input"
            style={{ borderRadius: "var(--radius-pill)", padding: "12px 20px" }}
            placeholder={isListening ? "Listening to your voice..." : "Ask AI or dictate a chore (e.g. Add milk)..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: 44, height: 44, borderRadius: "50%", padding: 0, flexShrink: 0 }}
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            <Send size={18} strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
};
