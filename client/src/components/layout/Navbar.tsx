import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useContextHooks";
import { useIsMobile } from "@/hooks/useContextHooks";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GuideModal } from "@/components/guide/GuideModal";
import { Logo } from "@/components/common/Logo";
import {
  MessageSquare,
  UploadCloud,
  ShieldCheck,
  Zap,
  User as UserIcon,
  BookOpen,
  ChevronDown,
  Copy,
  Check,
  LogOut,
  X,
  Menu,
} from "lucide-react";

/* ── Inline Copy Button Helper ── */
function CopyPill({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy ${label || "value"}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: copied ? "rgba(0,194,222,0.18)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${copied ? "#00C2DE" : "rgba(255,255,255,0.12)"}`,
        borderRadius: 4,
        padding: "2px 6px",
        color: copied ? "#00C2DE" : "#ADB5BD",
        cursor: "pointer",
        fontSize: "0.68rem",
        fontFamily: '"Space Mono", monospace',
        transition: "all 0.15s ease",
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

/* ── Profile Popover Dropdown (Desktop) ── */
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
  const userInitials = (user?.username || user?.email)?.slice(0, 2).toUpperCase() || "US";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "absolute",
        top: "calc(100% + 12px)",
        right: 0,
        width: 340,
        zIndex: 300,
        transformOrigin: "top right",
      }}
    >
      <div
        style={{
          background: "rgba(26, 26, 27, 0.98)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(0, 194, 222, 0.25)",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.85), 0 0 16px rgba(0,194,222,0.12)",
        }}
      >
        {/* Header Hero Card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.875rem",
            padding: "1.25rem",
            background: "linear-gradient(180deg, rgba(0,194,222,0.08) 0%, rgba(0,0,0,0) 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Avatar with Status Beacon */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "#FFFFFF",
                background: "#080809",
                border: "2px solid #00C2DE",
                boxShadow: "0 0 14px rgba(0,194,222,0.35)",
              }}
            >
              {userInitials}
            </div>
            {/* Active Emerald Dot */}
            <span
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#10B981",
                border: "2px solid #1A1A1B",
                boxShadow: "0 0 6px #10B981",
              }}
            />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: "0.98rem",
                fontWeight: 700,
                color: "#FFFFFF",
                fontFamily: '"Open Sans", sans-serif',
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {username}
            </div>
            <div
              style={{
                fontSize: "0.76rem",
                color: "#9D9FA2",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginTop: 1,
              }}
            >
              {user?.email}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
              <Badge role={role ?? undefined}>{role ?? "User"}</Badge>
              <span style={{ fontSize: "0.68rem", color: "#10B981", fontWeight: 600 }}>● Active</span>
            </div>
          </div>
        </div>

        {/* Detailed Account Attributes */}
        <div style={{ padding: "0.75rem 1.25rem", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* User ID Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
            <span style={{ fontSize: "0.75rem", color: "#6C757D" }}>User ID</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: '"Space Mono", monospace', fontSize: "0.72rem", color: "#ADB5BD", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.user_id || "—"}
              </span>
              {user?.user_id && <CopyPill text={user.user_id} label="User ID" />}
            </div>
          </div>

          {/* Org ID Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: "0.75rem", color: "#6C757D" }}>Organisation</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: '"Space Mono", monospace', fontSize: "0.75rem", color: "#00C2DE", fontWeight: 600 }}>
                {user?.org_id || "—"}
              </span>
              {user?.org_id && <CopyPill text={user.org_id} label="Org ID" />}
            </div>
          </div>

          {/* Global Upload Access */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: "0.75rem", color: "#6C757D" }}>Ingest Scope</span>
            <span style={{ fontSize: "0.72rem", color: user?.allow_global_upload ? "#00C2DE" : "#ADB5BD", fontWeight: 500 }}>
              {user?.allow_global_upload ? "Global & Sandbox" : "Sandbox Only"}
            </span>
          </div>

          {/* Member Since Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: "0.75rem", color: "#6C757D" }}>Member Since</span>
            <span style={{ fontSize: "0.74rem", color: "#ADB5BD" }}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Active"}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: "0.75rem 1.25rem 1.25rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Button variant="danger" size="sm" fullWidth onClick={handleSignOut}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <LogOut size={13} />
              <span>Sign out</span>
            </span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Mobile Profile Sheet (Comprehensive Full-Screen/Drawer on Mobile) ── */
function MobileProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, role, signOut } = useAuth();
  const username = user?.username || user?.email?.split("@")[0] || "User";
  const userInitials = (user?.username || user?.email)?.slice(0, 2).toUpperCase() || "US";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 300,
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(8px)",
            }}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 301,
              background: "#1A1A1B",
              borderTop: "1px solid rgba(0, 194, 222, 0.35)",
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              padding: "1.25rem 1.25rem calc(1.5rem + var(--safe-bottom, 16px))",
              boxShadow: "0 -16px 48px rgba(0,0,0,0.9)",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            {/* Grab Drag Bar Handle */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.25)" }} />
            </div>

            {/* Top Close Button & Title */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <UserIcon size={16} className="text-[#00C2DE]" />
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#FFFFFF", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: '"Space Mono", monospace' }}>
                  Account Profile
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "50%",
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9D9FA2",
                  cursor: "pointer",
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Hero Card */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "1rem",
                borderRadius: 14,
                background: "linear-gradient(135deg, rgba(0, 194, 222, 0.12) 0%, rgba(26, 26, 27, 0.6) 100%)",
                border: "1px solid rgba(0, 194, 222, 0.25)",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    background: "#080809",
                    border: "2px solid #00C2DE",
                    boxShadow: "0 0 16px rgba(0,194,222,0.4)",
                  }}
                >
                  {userInitials}
                </div>
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "#10B981",
                    border: "2px solid #1A1A1B",
                  }}
                />
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {username}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#9D9FA2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                  {user?.email}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <Badge role={role ?? undefined}>{role ?? "User"}</Badge>
                  <span style={{ fontSize: "0.72rem", color: "#10B981", fontWeight: 600 }}>● Active Session</span>
                </div>
              </div>
            </div>

            {/* Profile Attributes List */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "1rem",
                borderRadius: 12,
                background: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: "1.5rem",
              }}
            >
              {/* Organization ID */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.78rem", color: "#6C757D" }}>Organisation ID</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: '"Space Mono", monospace', fontSize: "0.82rem", color: "#00C2DE", fontWeight: 600 }}>
                    {user?.org_id ?? "—"}
                  </span>
                  {user?.org_id && <CopyPill text={user.org_id} label="Org ID" />}
                </div>
              </div>

              {/* User ID */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: "0.78rem", color: "#6C757D" }}>User ID</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: '"Space Mono", monospace', fontSize: "0.74rem", color: "#ADB5BD", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user?.user_id ?? "—"}
                  </span>
                  {user?.user_id && <CopyPill text={user.user_id} label="User ID" />}
                </div>
              </div>

              {/* Ingest Permissions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: "0.78rem", color: "#6C757D" }}>Upload Permissions</span>
                <span style={{ fontSize: "0.75rem", color: user?.allow_global_upload ? "#00C2DE" : "#ADB5BD", fontWeight: 600 }}>
                  {user?.allow_global_upload ? "Global & Sandbox" : "Sandbox Only"}
                </span>
              </div>

              {/* Member Since */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: "0.78rem", color: "#6C757D" }}>Member Since</span>
                <span style={{ fontSize: "0.78rem", color: "#FFFFFF" }}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Active"}
                </span>
              </div>
            </div>

            {/* Sign Out Button */}
            <Button
              variant="danger"
              size="md"
              fullWidth
              onClick={() => {
                onClose();
                void signOut();
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <LogOut size={15} />
                <span>Sign Out of Askmydocsai</span>
              </span>
            </Button>
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
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    color: "#FFFFFF",
                    width: 38,
                    height: 38,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                    flexShrink: 0,
                    transition: "background-color 0.15s ease, border-color 0.15s ease",
                  }}
                  aria-label="Toggle navigation menu"
                >
                  <Menu size={18} />
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
