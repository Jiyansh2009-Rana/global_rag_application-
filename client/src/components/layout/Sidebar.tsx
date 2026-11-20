import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth, useIsMobile } from "@/hooks/useContextHooks";
import { useChatSession } from "@/features/chat/ChatContext";
import { Logo } from "@/components/common/Logo";
import {
  Plus,
  MessageSquare,
  UploadCloud,
  ShieldCheck,
  Zap,
  Pin,
  X,
  History as HistoryIcon,
} from "lucide-react";

/* ── Relative Time Formatter ── */
function formatSessionTime(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "Just now";
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24 && now.getDate() === date.getDate()) return `${diffHours}h ago`;
    if (diffDays === 1 || (diffDays === 0 && now.getDate() !== date.getDate())) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ activePage, onNavigate, mobileOpen, onCloseMobile }: SidebarProps) {
  const { isAdmin, isSuperAdmin } = useAuth();
  const {
    sessions,
    activeSessionId,
    loadingSessions,
    loadingMore,
    hasMoreHistory,
    loadMoreHistory,
    startNewChat,
    selectSession,
  } = useChatSession();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const isMobile = useIsMobile(768);

  /* ── Pagination in Chat History (10 per page, scroll-based load, strictly fixed) ── */
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const visibleSessions = useMemo(() => {
    return sessions.slice(0, page * PAGE_SIZE);
  }, [sessions, page]);

  const hasMoreClientSessions = visibleSessions.length < sessions.length;
  const hasMore = hasMoreClientSessions || hasMoreHistory;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 60) {
      if (hasMoreClientSessions) {
        setPage((p) => p + 1);
      } else if (hasMoreHistory && !loadingMore) {
        void loadMoreHistory();
      }
    }
  };

  const navLinks = [
    { key: "chat", label: "Chat Studio", icon: MessageSquare, desc: "Streaming RAG queries" },
    { key: "upload", label: "Ingest Pipeline", icon: UploadCloud, desc: "Document processing" },
    ...(isAdmin ? [{ key: "admin", label: "Admin Console", icon: ShieldCheck, desc: "User & doc governance" }] : []),
    ...(isSuperAdmin ? [{ key: "super-admin", label: "Super Admin", icon: Zap, desc: "System control" }] : []),
  ];

  const isDesktopOpen = isHovered || isPinned;
  const isEffectiveOpen = isMobile ? !!mobileOpen : isDesktopOpen;

  const handleStartNewChat = () => {
    startNewChat();
    onNavigate("chat");
    if (isMobile) onCloseMobile?.();
    if (!isPinned) setIsHovered(false);
  };

  const handleSelectChatSession = (sessionId: string) => {
    selectSession(sessionId);
    onNavigate("chat");
    if (isMobile) onCloseMobile?.();
    if (!isPinned) setIsHovered(false);
  };

  return (
    <>
      {/* ── Left Screen Edge Hover Trigger Zone (Desktop) ── */}
      {!isMobile && !isPinned && (
        <div
          onMouseEnter={() => setIsHovered(true)}
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            width: 22,
            zIndex: 45,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingLeft: 3,
          }}
          title="Move cursor here to reveal sidebar"
        >
          <motion.div
            animate={{ opacity: [0.3, 0.9, 0.3], height: ["32px", "48px", "32px"] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 3,
              borderRadius: 2,
              background: "#00C2DE",
              boxShadow: "0 0 10px rgba(0,194,222,0.6)",
            }}
          />
        </div>
      )}

      {/* ── Mobile Backdrop Overlay ── */}
      {isMobile && mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCloseMobile}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.78)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 140,
          }}
        />
      )}

      {/* ── Desktop Backdrop when hover-revealed ── */}
      {!isMobile && isDesktopOpen && !isPinned && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsHovered(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 48,
          }}
        />
      )}

      {/* ── Modern Collapsible Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{
          x: isMobile ? (mobileOpen ? 0 : -320) : (isDesktopOpen ? 0 : -290),
        }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        style={{
          width: isMobile ? 300 : 280,
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: isMobile ? 150 : 50,
          background: "#0b0c0e",
          borderRight: "1px solid rgba(255, 255, 255, 0.09)",
          boxShadow: isEffectiveOpen ? "0 8px 36px rgba(0,0,0,0.85)" : "none",
          display: "flex",
          flexDirection: "column",
          padding: "1.25rem 1rem",
        }}
      >
        {/* Top: Brand Header + Pin / Close */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.25rem 0.25rem 1rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            marginBottom: "1rem",
          }}
        >
          <div
            onClick={() => {
              onNavigate("chat");
              if (isMobile) onCloseMobile?.();
            }}
            style={{ cursor: "pointer" }}
          >
            <Logo size="sm" showText={true} />
          </div>

          {/* Desktop Pin or Mobile Close */}
          {!isMobile ? (
            <button
              type="button"
              onClick={() => setIsPinned((p) => !p)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: isPinned ? "rgba(0,194,222,0.15)" : "transparent",
                border: isPinned ? "1px solid #00C2DE" : "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: "0.72rem",
                color: isPinned ? "#00C2DE" : "#9D9FA2",
                cursor: "pointer",
              }}
              title={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
            >
              <Pin size={12} className={isPinned ? "rotate-45 text-[#00C2DE]" : ""} />
              <span>{isPinned ? "Pinned" : "Pin"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCloseMobile}
              style={{
                background: "transparent",
                border: "none",
                color: "#9D9FA2",
                cursor: "pointer",
                padding: 4,
              }}
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* ── NEW CHAT BUTTON (Unslopped: quiet surface step, no colored glow) ── */}
        <button
          type="button"
          onClick={handleStartNewChat}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.6rem 0.8rem",
            marginBottom: "1rem",
            borderRadius: 10,
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.10)",
            color: "#ededed",
            fontSize: "0.84rem",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.18s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.borderColor = "rgba(0, 194, 222, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.10)";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                background: "rgba(0, 194, 222, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#00C2DE",
              }}
            >
              <Plus size={13} strokeWidth={2.5} />
            </div>
            <span>New chat</span>
          </div>
          <span
            style={{
              fontSize: "0.66rem",
              fontFamily: '"Space Mono", monospace',
              color: "#85858b",
              background: "rgba(255, 255, 255, 0.05)",
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            Studio
          </span>
        </button>

        {/* ── Navigation Links ── */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "1rem" }}>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "#85858b",
              padding: "0.2rem 0.5rem",
              letterSpacing: "0.02em",
            }}
          >
            Workspace
          </div>

          {navLinks.map((link) => {
            const isActive = activePage === link.key;
            const Icon = link.icon;
            return (
              <button
                key={link.key}
                onClick={() => {
                  onNavigate(link.key);
                  if (isMobile) onCloseMobile?.();
                  if (!isPinned) setIsHovered(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.65rem 0.75rem",
                  borderRadius: 8,
                  fontSize: "0.84rem",
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  border: "none",
                  borderLeft: isActive ? "3px solid #00C2DE" : "3px solid transparent",
                  background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                  color: isActive ? "#FFFFFF" : "#9D9FA2",
                  transition: "all 0.15s ease",
                  textAlign: "left",
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.color = "#FFFFFF";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#9D9FA2";
                  }
                }}
              >
                <Icon size={16} className={isActive ? "text-[#00C2DE]" : "text-[#6C757D]"} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ lineHeight: 1.25 }}>{link.label}</div>
                  <div style={{ fontSize: "0.66rem", color: isActive ? "#00C2DE" : "#6C757D", marginTop: 2 }}>
                    {link.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* ── RECENT CHATS (Paginated 10/page with Scroll-based Load) ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            paddingTop: "0.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 0.5rem 0.5rem",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "#85858b",
                display: "flex",
                alignItems: "center",
                gap: 6,
                letterSpacing: "0.02em",
              }}
            >
              <HistoryIcon size={13} />
              <span>Recent chats</span>
            </div>
            {sessions.length > 0 && (
              <span
                style={{
                  fontSize: "0.68rem",
                  color: "#85858b",
                  fontFamily: '"Space Mono", monospace',
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "1px 6px",
                  borderRadius: 4,
                }}
              >
                {sessions.length}
              </span>
            )}
          </div>

          {/* Scrollable paginated list container */}
          <div
            onScroll={handleScroll}
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              paddingRight: 4,
            }}
          >
            {loadingSessions ? (
              <div style={{ padding: "1.5rem 0.5rem", fontSize: "0.75rem", color: "#6C757D", textAlign: "center" }}>
                Loading past chats…
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: "2rem 0.5rem", fontSize: "0.75rem", color: "#6C757D", textAlign: "center", lineHeight: 1.5 }}>
                No past conversations yet.<br />Ask a question to start.
              </div>
            ) : (
              <>
                {visibleSessions.map((s, idx) => {
                  const isActive = activeSessionId === s.sessionId && activePage === "chat";
                  const timeLabel = formatSessionTime(s.lastAt);
                  return (
                    <motion.button
                      key={s.sessionId}
                      type="button"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (idx % 10) * 0.02, type: "spring", stiffness: 400, damping: 30 }}
                      onClick={() => handleSelectChatSession(s.sessionId)}
                      whileHover={{ x: 2 }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                        padding: "0.55rem 0.65rem",
                        borderRadius: 8,
                        background: isActive ? "rgba(0, 194, 222, 0.12)" : "transparent",
                        border: isActive ? "1px solid rgba(0, 194, 222, 0.35)" : "1px solid transparent",
                        borderLeft: isActive ? "3px solid #00C2DE" : "3px solid transparent",
                        color: isActive ? "#00C2DE" : "#ADB5BD",
                        fontSize: "0.8rem",
                        textAlign: "left",
                        cursor: "pointer",
                        width: "100%",
                        transition: "background 0.14s ease, border-color 0.14s ease, color 0.14s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                          e.currentTarget.style.color = "#FFFFFF";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#ADB5BD";
                        }
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 7, width: "100%" }}>
                        <MessageSquare
                          size={13}
                          style={{ flexShrink: 0, color: isActive ? "#00C2DE" : "#6C757D" }}
                        />
                        <span
                          style={{
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? "#FFFFFF" : "#E5E7EB",
                          }}
                          title={s.firstQuery}
                        >
                          {s.firstQuery}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingLeft: 20,
                          fontSize: "0.66rem",
                          color: "#6C757D",
                        }}
                      >
                        <span>{timeLabel || "Earlier"}</span>
                        <span
                          style={{
                            fontFamily: '"Space Mono", monospace',
                            color: s.mode === "global" ? "#00C2DE" : "#A855F7",
                            opacity: 0.85,
                            fontSize: "0.62rem",
                          }}
                        >
                          {s.mode === "global" ? "Global" : "Sandbox"}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}

                {/* Pagination indicator / Infinite scroll trigger */}
                {hasMore && (
                  <div style={{ padding: "8px 0", textAlign: "center", marginTop: 4 }}>
                    <button
                      type="button"
                      disabled={loadingMore}
                      onClick={() => {
                        if (hasMoreClientSessions) {
                          setPage((p) => p + 1);
                        } else if (hasMoreHistory && !loadingMore) {
                          void loadMoreHistory();
                        }
                      }}
                      style={{
                        background: "rgba(0, 194, 222, 0.08)",
                        border: "1px solid rgba(0, 194, 222, 0.25)",
                        borderRadius: 6,
                        padding: "5px 10px",
                        fontSize: "0.72rem",
                        color: "#00C2DE",
                        cursor: loadingMore ? "wait" : "pointer",
                        width: "100%",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(0, 194, 222, 0.16)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(0, 194, 222, 0.08)";
                      }}
                    >
                      {loadingMore ? "Loading more chats…" : "Load 10 more"}
                    </button>
                  </div>
                )}

                {!hasMore && sessions.length > 10 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "8px 0 4px",
                      fontSize: "0.65rem",
                      color: "#4B5563",
                      fontFamily: '"Space Mono", monospace',
                    }}
                  >
                    All {sessions.length} chats loaded
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}
