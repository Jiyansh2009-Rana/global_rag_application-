import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useContextHooks";
import { useIsMobile } from "@/hooks/useContextHooks";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GuideModal } from "@/components/guide/GuideModal";
import { Logo } from "@/components/common/Logo";
import { MessageSquare, UploadCloud, ShieldCheck, Zap, User as UserIcon, BookOpen, ChevronDown } from "lucide-react";

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
    { label: "Username",     value: <span style={{ fontFamily: "Space Mono, monospace", fontSize: "0.78rem", color: "#00C2DE", fontWeight: 600 }}>@{username}</span> },
    { label: "User ID",      value: <span style={{ fontFamily: "Space Mono, monospace", fontSize: "0.7rem", color: "#9D9FA2", display: "block", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>{user?.user_id ?? "—"}</span> },
    { label: "Organisation", value: user?.org_id ?? "—" },
    { label: "Member since", value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—" },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      style={{ position: "absolute", top: "calc(100% + 12px)", right: 0, width: 300, zIndex: 300, transformOrigin: "top right" }}
    >
      <div
        style={{
          background: "#1A1A1B",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 8px 28px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "#FFFFFF",
              background: "#000000",
              border: "1px solid #00C2DE",
              boxShadow: "0 0 12px rgba(0,194,222,0.25)",
            }}
          >
            {(user?.username || user?.email)?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFFFFF", fontFamily: '"Open Sans", sans-serif', overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {username}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#9D9FA2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
              <span style={{ fontSize: "0.75rem", color: "#6C757D" }}>{label}</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#FFFFFF" }}>{value}</span>
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
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.75)" }}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
            style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201, background: "#1A1A1B", borderTop: "1px solid rgba(255,255,255,0.12)", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: "1.5rem", paddingBottom: "calc(1.5rem + var(--safe-bottom))" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: 700, color: "#FFFFFF", background: "#000000", border: "1px solid #00C2DE" }}>
                {(user?.username || user?.email)?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFFFFF" }}>{username}</div>
                <div style={{ fontSize: "0.78rem", color: "#9D9FA2" }}>{user?.email}</div>
                <div style={{ marginTop: 4 }}>
                  <Badge role={role ?? undefined}>{role ?? "User"}</Badge>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#9D9FA2" }}>
                <span>Org ID</span>
                <span style={{ color: "#FFFFFF", fontFamily: "Space Mono, monospace" }}>{user?.org_id ?? "—"}</span>
              </div>
            </div>
            <Button variant="danger" fullWidth onClick={() => { onClose(); signOut(); }}>Sign out</Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Mobile Bottom Tab Bar ── */
function MobileBottomTabBar({
  navLinks,
  activePage,
  onNavigate,
  onProfileTap,
}: {
  navLinks: Array<{ key: string; label: string; icon: React.ReactNode }>;
  activePage: string;
  onNavigate: (page: string) => void;
  onProfileTap: () => void;
}) {
  return (
    <nav
      className="mobile-bottom-tab"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "var(--bottom-tab-h)",
        zIndex: 100,
        background: "#000000",
        borderTop: "1px solid rgba(255,255,255,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        paddingBottom: "var(--safe-bottom)",
      }}
    >
      {navLinks.map((link) => {
        const isActive = activePage === link.key;
        return (
          <button
            key={link.key}
            onClick={() => onNavigate(link.key)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              padding: "6px 0",
              background: "transparent",
              border: "none",
              color: isActive ? "#00C2DE" : "#9D9FA2",
              cursor: "pointer",
              transition: "color 120ms cubic-bezier(0.23,1,0.32,1)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center" }}>{link.icon}</span>
            <span style={{ fontSize: "0.68rem", fontWeight: isActive ? 600 : 400 }}>{link.label}</span>
          </button>
        );
      })}
      <button
        onClick={onProfileTap}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          padding: "6px 0",
          background: "transparent",
          border: "none",
          color: "#9D9FA2",
          cursor: "pointer",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center" }}><UserIcon size={18} /></span>
        <span style={{ fontSize: "0.68rem" }}>Profile</span>
      </button>
    </nav>
  );
}

/* ── Main Navbar ── */
interface NavbarProps {
  activePage?: string;
  onNavigate?: (page: string) => void;
  onToggleMobileSidebar?: () => void;
}

export function Navbar({ activePage = "chat", onNavigate, onToggleMobileSidebar }: NavbarProps) {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const isMobile = useIsMobile(768);

  const username = user?.username || user?.email?.split("@")[0] || "User";

  const navLinks: Array<{ key: string; label: string; icon: React.ReactNode }> = [
    { key: "chat",   label: "Chat Studio",     icon: <MessageSquare size={15} /> },
    { key: "upload", label: "Ingest Pipeline", icon: <UploadCloud size={15} /> },
    ...(isAdmin ? [{ key: "admin", label: "Admin Console", icon: <ShieldCheck size={15} /> }] : []),
    ...(isSuperAdmin ? [{ key: "super-admin", label: "Super Admin", icon: <Zap size={15} /> }] : []),
  ];

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "#000000",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.24)",
        }}
      >
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: isMobile ? "0 1rem" : "0 2rem" }}>
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 70,
              gap: 16,
            }}
          >
            {/* Left: Mobile hamburger or Brand */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {isMobile && onToggleMobileSidebar && (
                <button
                  type="button"
                  onClick={onToggleMobileSidebar}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    color: "#FFFFFF",
                    padding: "6px 10px",
                    cursor: "pointer",
                  }}
                  aria-label="Toggle navigation menu"
                >
                  ☰
                </button>
              )}

              <div
                onClick={() => onNavigate?.("chat")}
                style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <Logo size="md" showText={true} />
              </div>
            </div>

            {/* Middle: Desktop Nav Links with sharp indicators */}
            {!isMobile && onNavigate && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {navLinks.map((link) => {
                  const isActive = activePage === link.key;
                  return (
                    <button
                      key={link.key}
                      onClick={() => onNavigate(link.key)}
                      style={{
                        padding: "8px 16px",
                        background: "transparent",
                        border: "none",
                        borderBottom: isActive ? "2px solid #00C2DE" : "2px solid transparent",
                        color: isActive ? "#FFFFFF" : "#9D9FA2",
                        fontFamily: '"Open Sans", sans-serif',
                        fontWeight: isActive ? 600 : 500,
                        fontSize: "0.88rem",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        transition: "color 120ms cubic-bezier(0.23,1,0.32,1), border-color 120ms cubic-bezier(0.23,1,0.32,1)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.color = "#FFFFFF";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.color = "#9D9FA2";
                      }}
                    >
                      <span style={{ color: isActive ? "#00C2DE" : "#6C757D" }}>{link.icon}</span>
                      <span>{link.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Right: Guide Button & User Profile */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 16px",
                  borderRadius: 20,
                  whiteSpace: "nowrap",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#9D9FA2",
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: '"Open Sans", sans-serif',
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#00C2DE";
                  e.currentTarget.style.color = "#FFFFFF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.color = "#9D9FA2";
                }}
                aria-label="Open platform guide"
              >
                <BookOpen size={14} />
                <span>Guide</span>
              </button>

              <div style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    if (isMobile) setMobileProfileOpen(true);
                    else setProfileOpen((p) => !p);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 10px 4px 6px",
                    borderRadius: 20,
                    background: "#1A1A1B",
                    border: "1px solid rgba(255,255,255,0.12)",
                    cursor: "pointer",
                    transition: "border-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#00C2DE";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  }}
                  aria-label="User profile menu"
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#FFFFFF",
                      background: "#000000",
                      border: "1px solid #00C2DE",
                    }}
                  >
                    {(user?.username || user?.email)?.charAt(0).toUpperCase() ?? "U"}
                  </div>
                  {!isMobile && (
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#FFFFFF", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {username}
                    </span>
                  )}
                  <ChevronDown size={13} style={{ color: "#9D9FA2" }} />
                </button>

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

      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

      {onNavigate && (
        <MobileBottomTabBar
          navLinks={navLinks}
          activePage={activePage}
          onNavigate={onNavigate}
          onProfileTap={() => setMobileProfileOpen(true)}
        />
      )}

      <MobileProfileSheet open={mobileProfileOpen} onClose={() => setMobileProfileOpen(false)} />
    </>
  );
}
