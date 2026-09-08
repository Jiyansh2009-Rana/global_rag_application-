import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useContextHooks";
import { useIsMobile } from "@/hooks/useContextHooks";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ activePage, onNavigate, mobileOpen, onCloseMobile }: SidebarProps) {
  const { user, role, isAdmin, isSuperAdmin, signOut } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const isMobile = useIsMobile(768);

  const navLinks = [
    { key: "chat",   label: "Chat Studio",     icon: "◆", desc: "Streaming RAG queries" },
    { key: "upload", label: "Ingest Pipeline", icon: "↑", desc: "Document processing" },
    ...(isAdmin ? [{ key: "admin", label: "Admin Console", icon: "⊞", desc: "User & doc management" }] : []),
    ...(isSuperAdmin ? [{ key: "super-admin", label: "Super Admin", icon: "⚡", desc: "Global system control" }] : []),
  ];

  const isDesktopOpen = isHovered || isPinned;
  const isEffectiveOpen = isMobile ? !!mobileOpen : isDesktopOpen;

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
            width: 24,
            zIndex: 45,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingLeft: 4,
          }}
          title="Move cursor here to reveal sidebar"
        >
          {/* Subtle glowing indicator bar on edge */}
          <motion.div
            animate={{ opacity: [0.3, 0.8, 0.3], height: ["36px", "52px", "36px"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 3,
              borderRadius: 999,
              background: "linear-gradient(180deg, #46b7ff, #8bf3e6)",
              boxShadow: "0 0 10px rgba(70,183,255,0.6)",
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
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 140,
          }}
        />
      )}

      {/* ── Backdrop Overlay when hover-revealed on desktop (if not pinned) ── */}
      {!isMobile && isDesktopOpen && !isPinned && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsHovered(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 48,
          }}
        />
      )}

      {/* ── Animated Slide-Out Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{
          x: isMobile ? (mobileOpen ? 0 : -300) : (isDesktopOpen ? 0 : -280),
        }}
        transition={{ type: "spring", stiffness: 360, damping: 32 }}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        style={{
          width: 272,
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: isMobile ? 150 : 50,
          background: "#07080a",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: isEffectiveOpen ? "0 0 54px rgba(0,0,0,0.85), 0 0 24px rgba(70,183,255,0.12)" : "none",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "1.25rem 1rem",
        }}
      >
        {/* Top: Brand Header + Pin Toggle / Mobile Close */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.5rem 0.5rem 1.25rem",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              marginBottom: "1.25rem",
            }}
          >
            <div
              onClick={() => {
                onNavigate("chat");
                if (isMobile) onCloseMobile?.();
                if (!isPinned) setIsHovered(false);
              }}
              style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}
            >
              <span
                style={{
                  display: "inline-flex",
                  width: 36,
                  height: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #46b7ff, #8bf3e6)",
                  fontSize: "0.75rem",
                  fontWeight: 900,
                  color: "#04121f",
                  letterSpacing: "0.04em",
                  boxShadow: "0 0 16px rgba(70,183,255,0.35)",
                }}
              >
                RA
              </span>
              <div>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    letterSpacing: "-0.025em",
                    fontFamily: '"Bricolage Grotesque", "Inter", sans-serif',
                    color: "#e8e6e0",
                    lineHeight: 1.1,
                  }}
                >
                  Rag<span style={{ color: "#46b7ff" }}>-Agent</span>
                </div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "#5a5852",
                    fontFamily: "Space Mono, monospace",
                    marginTop: 2,
                  }}
                >
                  Enterprise RAG v3.0
                </div>
              </div>
            </div>

            {/* Mobile Close Button */}
            {isMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#9a9690",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
                aria-label="Close sidebar"
              >
                ✕
              </button>
            )}

            {/* Pin Toggle Button (Desktop) */}
            {!isMobile && (
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 8,
                  fontSize: "0.7rem",
                  background: isPinned ? "rgba(70,183,255,0.15)" : "rgba(255,255,255,0.04)",
                  border: isPinned ? "1px solid rgba(70,183,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  color: isPinned ? "#46b7ff" : "#5a5852",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                }}
                title={isPinned ? "Unpin sidebar (enable hover-reveal)" : "Pin sidebar open"}
              >
                {isPinned ? "📌 Pinned" : "📌 Auto"}
              </button>
            )}
          </div>

          {/* Navigation Items List */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                fontSize: "0.65rem",
                fontFamily: "Space Mono, monospace",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#5a5852",
                padding: "0.25rem 0.6rem 0.5rem",
              }}
            >
              Navigation
            </div>
            {navLinks.map((link) => {
              const isActive = activePage === link.key;
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
                    borderRadius: 12,
                    fontSize: "0.85rem",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: isActive ? 600 : 500,
                    cursor: "pointer",
                    border: isActive ? "1px solid rgba(70,183,255,0.3)" : "1px solid transparent",
                    background: isActive ? "rgba(70,183,255,0.1)" : "transparent",
                    color: isActive ? "#46b7ff" : "#9a9690",
                    transition: "all 0.18s ease",
                    textAlign: "left",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                      e.currentTarget.style.color = "#e8e6e0";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#9a9690";
                    }
                  }}
                >
                  <span style={{ fontSize: "1rem", width: 22, display: "inline-flex", justifyContent: "center", color: isActive ? "#46b7ff" : "#5a5852" }}>
                    {link.icon}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ lineHeight: 1.2 }}>{link.label}</div>
                    <div style={{ fontSize: "0.65rem", color: isActive ? "rgba(70,183,255,0.7)" : "#5a5852", marginTop: 2 }}>
                      {link.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: User Info & Sign Out */}
        <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "1rem" }}>
          {/* User profile card */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.5rem 0.5rem 0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #46b7ff, #8bf3e6)",
                color: "#04121f",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.85rem",
                flexShrink: 0,
              }}
            >
              {(user?.username || user?.email)?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#e8e6e0",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.username || user?.email?.split("@")[0] || "User"}
              </div>
              <div style={{ fontSize: "0.68rem", color: "#5a5852", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.email}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", padding: "0 0.25rem" }}>
            <Badge role={role ?? undefined}>{role ?? "User"}</Badge>
            <span style={{ fontSize: "0.68rem", color: "#5a5852", fontFamily: "Space Mono, monospace" }}>
              {user?.org_id ? `org: ${user.org_id}` : "org: default"}
            </span>
          </div>

          <Button
            variant="danger"
            size="sm"
            fullWidth
            onClick={async () => {
              await signOut();
            }}
          >
            Sign out
          </Button>
        </div>
      </motion.aside>
    </>
  );
}