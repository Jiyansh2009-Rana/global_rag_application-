import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useContextHooks";
import { useIsMobile } from "@/hooks/useContextHooks";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GuideModal } from "@/components/guide/GuideModal";

/* ── Profile Popover Dropdown ── */
function ProfileDropdown({ onClose }: { onClose: () => void }) {
  const { user, role, signOut } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  const username = user?.username || user?.email?.split("@")[0] || "User";

  const rows = [
    { label: "Username",     value: <span style={{ fontFamily: "Space Mono, monospace", fontSize: "0.75rem", color: "#46b7ff", fontWeight: 600 }}>@{username}</span> },
    { label: "User ID",      value: <span style={{ fontFamily: "Space Mono, monospace", fontSize: "0.67rem", color: "var(--muted)", display: "block", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>{user?.user_id ?? "—"}</span> },
    { label: "Organisation", value: user?.org_id ?? "—" },
    { label: "Member since", value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—" },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ type: "spring", damping: 26, stiffness: 380 }}
      style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: 290, zIndex: 300 }}
    >
      <div style={{ background: "#0f1014", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.85), 0 0 24px rgba(70,183,255,0.15)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", fontWeight: 700, color: "#04121f", background: "linear-gradient(135deg, #46b7ff, #8bf3e6)", boxShadow: "0 0 18px rgba(70,183,255,0.35)" }}>
            {(user?.username || user?.email)?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#e8e6e0", fontFamily: '"Bricolage Grotesque", "Inter", sans-serif', overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {username}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#9a9690", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.email}
            </div>
            <div style={{ marginTop: 4 }}>
              <Badge role={role ?? undefined}>{role ?? "User"}</Badge>
            </div>
          </div>
        </div>

        {/* Details list */}
        <div style={{ padding: "0.5rem 1.25rem" }}>
          {rows.map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{label}</span>
              <span style={{ fontSize: "0.72rem", fontWeight: 500, color: "var(--text-secondary)" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Sign out */}
        <div style={{ padding: "0.75rem 1.25rem 1.25rem" }}>
          <Button variant="danger" size="sm" fullWidth onClick={handleSignOut}>Sign out</Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Mobile Profile Sheet ── */
function MobileProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, role, signOut } = useAuth();
  const username = user?.username || user?.email?.split("@")[0] || "User";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201,
              background: "#0f1014", borderRadius: "20px 20px 0 0",
              border: "1px solid rgba(255,255,255,0.1)", borderBottom: "none",
              boxShadow: "0 -8px 48px rgba(0,0,0,0.55)",
              paddingBottom: "calc(var(--bottom-tab-h, 0px) + 0.75rem)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 4px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.18)" }} />
            </div>
            <div style={{ padding: "0.5rem 1.5rem 1rem", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: 700, color: "#04121f", background: "linear-gradient(135deg, #46b7ff, #8bf3e6)", boxShadow: "0 0 20px rgba(70,183,255,0.35)" }}>
                {(user?.username || user?.email)?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e8e6e0", fontFamily: '"Bricolage Grotesque", "Inter", sans-serif', overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {username}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#9a9690", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.email}
                </div>
                <div style={{ marginTop: 4 }}><Badge role={role ?? undefined}>{role ?? "User"}</Badge></div>
              </div>
            </div>
            <div style={{ padding: "0.5rem 1.5rem" }}>
              {[
                { label: "Username", value: `@${username}`, mono: true },
                { label: "User ID", value: user?.user_id ?? "—", mono: true },
                { label: "Organisation", value: user?.org_id ?? "—" },
                { label: "Member since", value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—" },
              ].map(({ label, value, mono }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{label}</span>
                  <span style={{ fontSize: "0.72rem", color: mono ? "#46b7ff" : "var(--text-secondary)", fontFamily: mono ? "Space Mono, monospace" : "inherit", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", textAlign: "right" }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "0.75rem 1.5rem 0" }}>
              <Button variant="danger" size="sm" fullWidth onClick={async () => { onClose(); await signOut(); }}>Sign out</Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Mobile Bottom Tab Bar ── */
interface TabBarProps {
  navLinks: { key: string; label: string; icon: string }[];
  activePage: string;
  onNavigate: (page: string) => void;
  onProfileTap: () => void;
}

function MobileBottomTabBar({ navLinks, activePage, onNavigate, onProfileTap }: TabBarProps) {
  const allTabs = [
    ...navLinks,
    { key: "__profile__", label: "Profile", icon: "◉" },
  ];

  return (
    <nav
      className="mobile-bottom-tab"
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(7, 8, 10, 0.94)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        alignItems: "stretch",
      }}
    >
      {allTabs.map((tab) => {
        const isActive = tab.key !== "__profile__" && activePage === tab.key;
        const onTap = tab.key === "__profile__" ? onProfileTap : () => onNavigate(tab.key);
        return (
          <button
            key={tab.key}
            onClick={onTap}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 3,
              padding: "10px 4px 12px",
              background: "none", border: "none", cursor: "pointer",
              color: isActive ? "#46b7ff" : "var(--muted)",
              transition: "color 0.18s ease",
              position: "relative", minHeight: 56,
            }}
          >
            {isActive && (
              <motion.div
                layoutId="tab-active-bar"
                style={{
                  position: "absolute", top: 0, left: "18%", right: "18%",
                  height: 2, borderRadius: "0 0 2px 2px",
                  background: "linear-gradient(90deg, #46b7ff, #8bf3e6)",
                  boxShadow: "0 0 8px rgba(70,183,255,0.6)",
                }}
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
              />
            )}
            <span style={{ fontSize: "1.05rem", lineHeight: 1, display: "block", filter: isActive ? "drop-shadow(0 0 6px rgba(70,183,255,0.7))" : "none", transition: "filter 0.2s", transform: isActive ? "scale(1.12)" : "scale(1)" }}>
              {tab.icon}
            </span>
            <span style={{ fontSize: "0.6rem", fontWeight: isActive ? 600 : 400, fontFamily: "Inter, sans-serif", letterSpacing: isActive ? "0.02em" : 0 }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/* ── Main Top Navbar ── */
interface NavbarProps {
  activePage: string;
  onNavigate?: (page: string) => void;
  onToggleMobileSidebar?: () => void;
}

export function Navbar({ activePage, onNavigate, onToggleMobileSidebar }: NavbarProps) {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const isMobile = useIsMobile(768);

  const navLinks = [
    { key: "chat",   label: "Chat",   icon: "◆" },
    { key: "upload", label: "Ingest", icon: "↑" },
    ...(isAdmin ? [{ key: "admin", label: "Admin", icon: "⊞" }] : []),
    ...(isSuperAdmin ? [{ key: "super-admin", label: "S.Admin", icon: "⚡" }] : []),
  ];

  const pageLabels: Record<string, string> = {
    chat: "Chat Studio",
    upload: "Ingest Pipeline",
    admin: "Admin Console",
    "super-admin": "Super Admin Console",
  };

  const username = user?.username || user?.email?.split("@")[0] || "User";

  return (
    <>
      <header className="sticky top-0 z-30 w-full" style={{ position: "sticky", top: 0 }}>
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(7, 8, 10, 0.65)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
          <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: isMobile ? "0 0.875rem" : "0 1.5rem", height: 54 }}>

            {/* Left: Breadcrumb / Mobile Menu Trigger & Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", minWidth: 0 }}>
              {isMobile && onToggleMobileSidebar && (
                <button
                  type="button"
                  onClick={onToggleMobileSidebar}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#e8e6e0",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                    padding: 0,
                    flexShrink: 0,
                  }}
                  aria-label="Toggle navigation menu"
                >
                  ☰
                </button>
              )}
              {isMobile && (
                <div
                  onClick={() => onNavigate?.("chat")}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", flexShrink: 0 }}
                >
                  <span style={{ display: "inline-flex", width: 26, height: 26, alignItems: "center", justifyContent: "center", borderRadius: 7, background: "linear-gradient(135deg, #46b7ff, #8bf3e6)", fontSize: "0.55rem", fontWeight: 900, color: "#04121f", flexShrink: 0 }}>
                    RA
                  </span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: "0.68rem", fontFamily: "Space Mono, monospace", textTransform: "uppercase", color: "#5a5852", display: isMobile ? "none" : "inline" }}>
                  Workspace /
                </span>
                <span style={{ fontSize: isMobile ? "0.82rem" : "0.88rem", fontWeight: 700, fontFamily: '"Bricolage Grotesque", "Inter", sans-serif', color: "#e8e6e0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {pageLabels[activePage] || "Chat Studio"}
                </span>
              </div>
            </div>

            {/* Right: Guide Button + Clickable User Profile Popover */}
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "0.5rem" : "0.875rem", flexShrink: 0 }}>
              {/* 1. Guide Button in Top Navbar */}
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  borderRadius: 9999,
                  background: "rgba(139,243,230,0.06)",
                  border: "1px solid rgba(139,243,230,0.2)",
                  color: "#8bf3e6",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139,243,230,0.12)";
                  e.currentTarget.style.borderColor = "rgba(139,243,230,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(139,243,230,0.06)";
                  e.currentTarget.style.borderColor = "rgba(139,243,230,0.2)";
                }}
                aria-label="Open platform guide"
              >
                <span>📖</span>
                <span>Guide</span>
              </button>

              {/* 2. Clickable Profile Icon with Popover (Desktop & Mobile) */}
              <div style={{ position: "relative" }}>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    if (isMobile) {
                      setMobileProfileOpen(true);
                    } else {
                      setProfileOpen((p) => !p);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "3px 8px 3px 4px",
                    borderRadius: 9999,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(70,183,255,0.35)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }}
                  aria-label="Open user profile menu"
                  aria-expanded={profileOpen}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#04121f",
                      background: "linear-gradient(135deg, #46b7ff, #8bf3e6)",
                      boxShadow: "0 0 10px rgba(70,183,255,0.35)",
                    }}
                  >
                    {(user?.username || user?.email)?.charAt(0).toUpperCase() ?? "U"}
                  </div>
                  {!isMobile && (
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#e8e6e0", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {username}
                    </span>
                  )}
                  <span style={{ fontSize: "0.65rem", color: "#5a5852" }}>▼</span>
                </motion.button>

                {/* Popover on Desktop */}
                <AnimatePresence>
                  {profileOpen && !isMobile && (
                    <ProfileDropdown onClose={() => setProfileOpen(false)} />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Guide Modal */}
      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* Mobile bottom tab bar */}
      {onNavigate && (
        <MobileBottomTabBar
          navLinks={navLinks}
          activePage={activePage}
          onNavigate={onNavigate}
          onProfileTap={() => setMobileProfileOpen(true)}
        />
      )}

      {/* Mobile profile sheet */}
      <MobileProfileSheet open={mobileProfileOpen} onClose={() => setMobileProfileOpen(false)} />
    </>
  );
}