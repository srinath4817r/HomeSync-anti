import React from "react";
import { Calendar, Clock, Plus, CheckCircle2, ChevronRight, Sun, Moon, Sunset, Coffee } from "lucide-react";
import { CalendarEvent } from "../types";

interface DayTimelineProps {
  events: CalendarEvent[];
  onNavigateCalendar: () => void;
  onAddEvent?: () => void;
}

export const DayTimeline: React.FC<DayTimelineProps> = ({
  events,
  onNavigateCalendar,
  onAddEvent,
}) => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const timeFormatted = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  // Calculate percentage of day passed (0% at 6AM, 100% at 11PM for daylight timeline)
  const totalMinutes = Math.max(0, Math.min(1020, (currentHour - 6) * 60 + currentMinutes));
  const progressPercent = Math.min(100, Math.max(2, (totalMinutes / 1020) * 100));

  // Categorize events by period of day
  const periods = [
    {
      key: "morning",
      label: "Morning",
      range: "6 AM – 12 PM",
      icon: Coffee,
      color: "var(--chip-grocery)",
      isCurrent: currentHour >= 6 && currentHour < 12,
    },
    {
      key: "afternoon",
      label: "Afternoon",
      range: "12 PM – 5 PM",
      icon: Sun,
      color: "#F59E0B",
      isCurrent: currentHour >= 12 && currentHour < 17,
    },
    {
      key: "evening",
      label: "Evening",
      range: "5 PM – 9 PM",
      icon: Sunset,
      color: "var(--accent)",
      isCurrent: currentHour >= 17 && currentHour < 21,
    },
    {
      key: "night",
      label: "Night",
      range: "9 PM – 6 AM",
      icon: Moon,
      color: "var(--chip-event)",
      isCurrent: currentHour >= 21 || currentHour < 6,
    },
  ];

  const getEventPeriod = (dateStr: string) => {
    const h = new Date(dateStr).getHours();
    if (h >= 6 && h < 12) return "morning";
    if (h >= 12 && h < 17) return "afternoon";
    if (h >= 17 && h < 21) return "evening";
    return "night";
  };

  return (
    <div
      className="glass-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "20px 22px",
        background: "var(--surface-card)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Header with live clock */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="chip-icon chip-event">
            <Clock size={16} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.02rem", fontWeight: 700, color: "var(--text)" }}>
              Today's Rhythm
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
              Live daytime progression • {events.length} {events.length === 1 ? "entry" : "entries"} scheduled
            </div>
          </div>
        </div>

        {/* Live Current Time Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: "var(--radius-pill)",
            background: "var(--accent-subtle)",
            border: "1px solid var(--accent-border)",
            color: "var(--accent)",
            fontSize: "0.82rem",
            fontWeight: 800,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", animation: "pulseGently 1.5s infinite" }} />
          <span>{timeFormatted}</span>
        </div>
      </div>

      {/* Visual Day Progression Bar */}
      <div style={{ margin: "2px 0 6px" }}>
        <div
          style={{
            width: "100%",
            height: 6,
            borderRadius: 3,
            background: "var(--surface-subtle)",
            position: "relative",
            overflow: "visible",
          }}
        >
          {/* Progress fill */}
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              borderRadius: 3,
              background: "linear-gradient(90deg, var(--chip-grocery) 0%, var(--accent) 100%)",
              transition: "width 0.4s ease",
            }}
          />

          {/* Current time marker pin */}
          <div
            style={{
              position: "absolute",
              left: `${progressPercent}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "var(--accent)",
              border: "3px solid var(--surface-card)",
              boxShadow: "0 2px 8px rgba(224, 90, 71, 0.4)",
            }}
          />
        </div>

        {/* Period markers below bar */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {periods.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "0.72rem",
                  fontWeight: p.isCurrent ? 800 : 500,
                  color: p.isCurrent ? "var(--text)" : "var(--text-muted)",
                }}
              >
                <Icon size={12} color={p.isCurrent ? p.color : "var(--text-muted)"} />
                <span>{p.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Segmented Timeline Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {periods.map((period) => {
          const periodEvents = events.filter((e) => getEventPeriod(e.starts_at) === period.key);
          const Icon = period.icon;

          return (
            <div
              key={period.key}
              style={{
                borderRadius: "var(--radius-sm)",
                border: period.isCurrent ? "1px solid var(--border-strong)" : "1px solid var(--border-subtle)",
                background: period.isCurrent ? "var(--surface-subtle)" : "transparent",
                padding: "8px 12px",
                transition: "all 0.18s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: periodEvents.length > 0 ? 6 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon size={13} color={period.color} />
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" }}>
                    {period.label}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    ({period.range})
                  </span>
                </div>

                {period.isCurrent && (
                  <span style={{ fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", color: "var(--accent)", letterSpacing: "0.04em" }}>
                    Active Now
                  </span>
                )}
              </div>

              {/* Event items in period */}
              {periodEvents.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  {periodEvents.map((evt) => (
                    <div
                      key={evt.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: "var(--surface-card)",
                        border: "1px solid var(--border-subtle)",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", minWidth: 52 }}>
                          {new Date(evt.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>
                        <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>
                            {evt.title}
                          </span>
                          {evt.location_name && (
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: 6 }}>
                              • {evt.location_name}
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: "0.68rem",
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: evt.priority === "urgent" ? "var(--chip-medicine-bg)" : "var(--surface-hover)",
                          color: evt.priority === "urgent" ? "var(--chip-medicine)" : "var(--text-muted)",
                          fontWeight: 700,
                        }}
                      >
                        {evt.priority || "routine"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic", padding: "2px 0" }}>
                  Nothing scheduled
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Link */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
        <button
          type="button"
          onClick={onNavigateCalendar}
          className="panel-link"
          style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 4, fontSize: "0.8rem" }}
        >
          <span>Open Full Month Calendar</span>
          <ChevronRight size={14} />
        </button>

        <button
          type="button"
          onClick={onNavigateCalendar}
          className="btn btn-secondary"
          style={{ fontSize: "0.76rem", padding: "4px 10px", borderRadius: "var(--radius-sm)" }}
        >
          <Plus size={13} />
          <span>New Entry</span>
        </button>
      </div>
    </div>
  );
};
