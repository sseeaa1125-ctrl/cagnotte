"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { useNotifications } from "@/contexts/NotificationContext";
import { DashboardSkeleton, EmptyState, PullToRefreshIndicator } from "@/components/ui";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  Inbox,
  Handshake,
  Heart,
  CreditCard,
  Mail,
  Phone,
  User,
  Building2,
  Wallet,
  ChevronLeft,
  Check,
  X as XIcon,
  Clock,
  Archive,
  ArchiveRestore,
  MoreVertical,
  Loader2,
  Send,
} from "lucide-react";

// ── Types ──
interface InboxItem {
  id: string;
  type: "partnership" | "donation" | "payment";
  message: string;
  senderName: string | null;
  senderEmail: string;
  senderPhone: string | null;
  senderCompany: string | null;
  blockTitle: string | null;
  budget: string | null;
  amount: number | null;
  partnershipStatus: string | null;
  read: boolean;
  archived: boolean;
  date: string;
  isTest?: boolean;
}

type FilterType = "all" | "partnership" | "donation" | "payment";

// ── Constantes ──
const FILTER_TABS: { key: FilterType; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "Tout", icon: Inbox },
  { key: "partnership", label: "Partenariats", icon: Handshake },
  { key: "donation", label: "Dons", icon: Heart },
  { key: "payment", label: "Paiements", icon: CreditCard },
];

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  partnership: { label: "Partenariat", color: "text-purple-700", bg: "bg-purple-50", icon: Handshake },
  donation: { label: "Don", color: "text-pink-700", bg: "bg-pink-50", icon: Heart },
  payment: { label: "Paiement", color: "text-blue-700", bg: "bg-blue-50", icon: CreditCard },
};

const PARTNERSHIP_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "En attente", color: "text-amber-700", bg: "bg-amber-50" },
  ACCEPTED: { label: "Accepté", color: "text-green-700", bg: "bg-green-50" },
  REJECTED: { label: "Refusé", color: "text-red-700", bg: "bg-red-50" },
};

// Templates de messages pour les réponses aux demandes de partenariat
const ACCEPT_TEMPLATE = (name: string) => `Salut ${name} !

Merci pour ta demande de partenariat, je suis ravi(e) de collaborer avec toi !

Je te recontacte très vite pour qu'on discute des détails ensemble.

À très bientôt !`;

const REJECT_REASONS = [
  { id: "timing", label: "Pas le bon moment", template: (name: string) => `Salut ${name},\n\nMerci pour ta proposition de partenariat !\n\nMalheureusement, ce n'est pas le bon moment pour moi de m'engager dans de nouvelles collaborations.\n\nJe te souhaite bonne continuation dans tes projets !` },
  { id: "fit", label: "Pas aligné avec ma ligne éditoriale", template: (name: string) => `Salut ${name},\n\nMerci d'avoir pensé à moi pour ce partenariat !\n\nAprès réflexion, je ne pense pas que ce soit aligné avec ma ligne éditoriale actuelle.\n\nJe te souhaite de trouver le bon partenaire pour ton projet !` },
  { id: "budget", label: "Budget insuffisant", template: (name: string) => `Salut ${name},\n\nMerci pour ta proposition !\n\nMalheureusement, le budget proposé ne correspond pas à mes tarifs actuels.\n\nN'hésite pas à me recontacter si ton budget évolue !` },
  { id: "other", label: "Autre raison", template: (name: string) => `Salut ${name},\n\nMerci pour ta demande de partenariat !\n\nAprès réflexion, je ne pourrai malheureusement pas donner suite à ta proposition.\n\nJe te souhaite bonne continuation !` },
];

const PAGE_SIZE = 20;

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD === 1) return "Hier";
  if (diffD < 7) return `Il y a ${diffD}j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Composant principal ──
export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<InboxItem | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [nextCursorId, setNextCursorId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const { refreshCounts } = useNotifications();
  const cursorIdRef = useRef<string | null>(null);

  const fetchItems = useCallback(async (cursor?: string, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ filter, limit: String(PAGE_SIZE) });
      if (cursor) params.set("cursor", cursor);
      if (cursorIdRef.current && cursor) params.set("cursorId", cursorIdRef.current);
      if (showArchived) params.set("archived", "true");
      const data = await api<{ items: InboxItem[]; nextCursor: string | null; nextCursorId: string | null; hasMore: boolean }>(
        `/api/inbox?${params}`
      );
      if (append) {
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setNextCursor(data.nextCursor);
      setNextCursorId(data.nextCursorId);
      setHasMore(data.hasMore);
    } catch {
      // Silent
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter, showArchived]);

  useEffect(() => {
    setSelected(null);
    fetchItems();
  }, [fetchItems]);

  // Pull to refresh
  const { containerRef: pullRefreshRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: () => fetchItems(),
    disabled: !!selected,
  });

  async function handleMarkRead(item: InboxItem) {
    if (!item.read) {
      try {
        await api("/api/inbox/mark-read", {
          method: "POST",
          body: { type: item.type, id: item.id },
        });
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, read: true } : i))
        );
        refreshCounts();
      } catch {
        // Silent
      }
    }
  }

  async function handleArchive(item: InboxItem) {
    const newArchived = !item.archived;
    try {
      await api("/api/inbox/archive", {
        method: "POST",
        body: { type: item.type, id: item.id, archived: newArchived },
      });
      // Toujours retirer : l'item ne correspond plus au filtre actuel
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      if (selected?.id === item.id) setSelected(null);
      refreshCounts();
    } catch {
      // Silent
    }
  }

  async function handlePartnershipAction(id: string, status: "ACCEPTED" | "REJECTED", message: string) {
    setUpdatingStatus(true);
    try {
      await api(`/api/partnerships/${id}/status`, {
        method: "PUT",
        body: { status, message },
      });
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, partnershipStatus: status } : i
        )
      );
      if (selected?.id === id) {
        setSelected({ ...selected, partnershipStatus: status });
      }
    } catch {
      // Silent
    } finally {
      setUpdatingStatus(false);
    }
  }

  function handleSelect(item: InboxItem) {
    setSelected(item);
    handleMarkRead(item);
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <div ref={pullRefreshRef} className="flex flex-1 flex-col overflow-hidden">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inbox</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Messages, partenariats et notes de paiement
          </p>
        </div>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
            showArchived
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Archive size={13} />
          {showArchived ? "Voir actifs" : "Archives"}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      {items.length === 0 ? (
        <EmptyState
          icon={showArchived ? Archive : Inbox}
          title={showArchived ? "Aucune archive" : "Aucun message"}
          description={
            showArchived
              ? "Les messages archivés apparaîtront ici"
              : "Les messages de tes visiteurs apparaîtront ici"
          }
        />
      ) : (
        <div className="flex min-h-0 flex-1 gap-0 lg:gap-4">
          {/* ── Liste (gauche sur desktop, plein écran mobile sauf si sélection) ── */}
          <div className={`flex min-h-0 w-full flex-col lg:w-[380px] lg:shrink-0 ${selected ? "hidden lg:flex" : "flex"}`}>
            <div className="flex-1 overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white">
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <InboxRow
                    key={item.id}
                    item={item}
                    isSelected={selected?.id === item.id}
                    onSelect={() => handleSelect(item)}
                    onArchive={() => handleArchive(item)}
                  />
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="border-t border-gray-100 p-3">
                  <button
                    onClick={() => { cursorIdRef.current = nextCursorId; nextCursor && fetchItems(nextCursor, true); }}
                    disabled={loadingMore}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <><Loader2 size={14} className="animate-spin" /> Chargement...</>
                    ) : (
                      "Charger plus"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Détail (droite sur desktop, plein écran mobile) ── */}
          <div className={`min-h-0 flex-1 flex-col overflow-hidden ${selected ? "flex" : "hidden lg:flex"}`}>
            {selected ? (
              <DetailPanel
                item={selected}
                onClose={() => setSelected(null)}
                onAction={handlePartnershipAction}
                onArchive={() => handleArchive(selected)}
                updatingStatus={updatingStatus}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white">
                <div className="text-center">
                  <Inbox size={32} className="mx-auto text-gray-300" />
                  <p className="mt-2 text-sm text-gray-400">Sélectionne un message</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Row d'un message ──
function InboxRow({
  item,
  isSelected,
  onSelect,
  onArchive,
}: {
  item: InboxItem;
  isSelected: boolean;
  onSelect: () => void;
  onArchive: () => void;
}) {
  const config = TYPE_CONFIG[item.type];
  const statusConfig = item.partnershipStatus ? PARTNERSHIP_STATUS[item.partnershipStatus] : null;
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  return (
    <div
      className={`group relative flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors ${
        isSelected
          ? "bg-teal-50"
          : item.read
            ? "hover:bg-gray-50"
            : "bg-teal-50/30 hover:bg-teal-50/50"
      }`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      {/* Unread dot */}
      <div className="mt-1.5 shrink-0">
        {!item.read ? (
          <div className="h-2 w-2 rounded-full bg-teal-500" />
        ) : (
          <div className="h-2 w-2" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`truncate text-sm ${item.read ? "font-medium text-gray-700" : "font-bold text-gray-900"}`}>
            {item.senderName || item.senderEmail}
          </span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.bg} ${config.color}`}>
            {config.label}
          </span>
          {item.isTest && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              Test
            </span>
          )}
          {statusConfig && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusConfig.bg} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          )}
        </div>

        {item.blockTitle && (
          <p className="mt-0.5 truncate text-xs text-gray-400">{item.blockTitle}</p>
        )}

        <p className={`mt-1 line-clamp-1 text-sm ${item.read ? "text-gray-500" : "text-gray-700"}`}>
          {item.message}
        </p>

        {item.amount != null && (
          <p className="mt-1 text-xs font-semibold text-teal-600">
            {formatPrice(item.amount)}
          </p>
        )}
      </div>

      {/* Date + menu */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[11px] text-gray-400">{formatRelativeDate(item.date)}</span>

        {/* Options menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-300 opacity-0 transition-all hover:bg-gray-100 hover:text-gray-500 group-hover:opacity-100"
            aria-label="Options"
          >
            <MoreVertical size={14} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onArchive();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {item.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                {item.archived ? "Désarchiver" : "Archiver"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Panneau de détail ──
function DetailPanel({
  item,
  onClose,
  onAction,
  onArchive,
  updatingStatus,
}: {
  item: InboxItem;
  onClose: () => void;
  onAction: (id: string, status: "ACCEPTED" | "REJECTED", message: string) => Promise<void>;
  onArchive: () => void;
  updatingStatus: boolean;
}) {
  const config = TYPE_CONFIG[item.type];
  const statusConfig = item.partnershipStatus ? PARTNERSHIP_STATUS[item.partnershipStatus] : null;
  const senderName = item.senderName || "là";

  // Modal states
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [acceptMessage, setAcceptMessage] = useState(ACCEPT_TEMPLATE(senderName));
  const [selectedReason, setSelectedReason] = useState(REJECT_REASONS[0].id);
  const [rejectMessage, setRejectMessage] = useState(REJECT_REASONS[0].template(senderName));

  // Update reject message when reason changes
  function handleReasonChange(reasonId: string) {
    setSelectedReason(reasonId);
    const reason = REJECT_REASONS.find((r) => r.id === reasonId);
    if (reason) setRejectMessage(reason.template(senderName));
  }

  async function handleAcceptSubmit() {
    await onAction(item.id, "ACCEPTED", acceptMessage);
    setShowAcceptModal(false);
  }

  async function handleRejectSubmit() {
    await onAction(item.id, "REJECTED", rejectMessage);
    setShowRejectModal(false);
  }

  return (
    <div className="flex min-h-0 h-full flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 shrink-0">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 lg:hidden"
          aria-label="Retour"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-bold text-gray-900">
              {item.senderName || item.senderEmail}
            </h2>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.bg} ${config.color}`}>
              {config.label}
            </span>
            {item.isTest && (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                Test
              </span>
            )}
          </div>
          {item.blockTitle && (
            <p className="truncate text-xs text-gray-400">{item.blockTitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onArchive}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label={item.archived ? "Désarchiver" : "Archiver"}
            title={item.archived ? "Désarchiver" : "Archiver"}
          >
            {item.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Date */}
        <div className="px-5 pt-4 pb-2">
          <span className="text-xs text-gray-400">{formatFullDate(item.date)}</span>
        </div>

        {/* Message */}
        <div className="px-5 pb-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {item.message}
          </p>
        </div>

        {/* Amount */}
        {item.amount != null && (
          <div className="mx-5 mb-4 rounded-xl bg-teal-50 px-4 py-3">
            <p className="text-xs text-teal-600">Montant</p>
            <p className="text-lg font-bold text-teal-700">{formatPrice(item.amount)}</p>
          </div>
        )}

        {/* Contact info */}
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Contact
          </p>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <User size={14} className="shrink-0 text-gray-400" />
              <span>{item.senderName || "—"}</span>
            </div>
            <a
              href={`mailto:${item.senderEmail}`}
              className="flex items-center gap-2.5 text-sm text-teal-600 hover:underline"
            >
              <Mail size={14} className="shrink-0 text-gray-400" />
              <span>{item.senderEmail}</span>
            </a>
            {item.senderPhone && (
              <a
                href={`tel:${item.senderPhone}`}
                className="flex items-center gap-2.5 text-sm text-teal-600 hover:underline"
              >
                <Phone size={14} className="shrink-0 text-gray-400" />
                <span>{item.senderPhone}</span>
              </a>
            )}
            {item.senderCompany && (
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <Building2 size={14} className="shrink-0 text-gray-400" />
                <span>{item.senderCompany}</span>
              </div>
            )}
            {item.budget && (
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <Wallet size={14} className="shrink-0 text-gray-400" />
                <span>Budget : {item.budget}</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Partnership actions — sticky en bas, toujours visible */}
      {item.type === "partnership" && (
        <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 safe-pb">
          {item.partnershipStatus === "PENDING" ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAcceptModal(true)}
                disabled={updatingStatus}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
              >
                <Check size={16} />
                Accepter
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={updatingStatus}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
              >
                <XIcon size={16} />
                Refuser
              </button>
            </div>
          ) : statusConfig ? (
            <div className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 ${statusConfig.bg}`}>
              <Clock size={14} className={statusConfig.color} />
              <span className={`text-sm font-semibold ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
          ) : null}
        </div>
      )}

      {/* ══════ ACCEPT MODAL ══════ */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setShowAcceptModal(false)}>
          <div
            className="w-full max-w-lg rounded-t-2xl bg-white p-5 sm:rounded-2xl sm:m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
                <Check size={20} className="text-teal-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Accepter la demande</h3>
                <p className="text-xs text-gray-500">Un email sera envoyé à {item.senderEmail}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                Message de réponse
              </label>
              <textarea
                value={acceptMessage}
                onChange={(e) => setAcceptMessage(e.target.value)}
                rows={8}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                placeholder="Écris ton message..."
              />
              <p className="mt-1 text-[11px] text-gray-400">Tu peux modifier ce message avant de l&apos;envoyer</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAcceptModal(false)}
                className="flex-1 rounded-xl bg-gray-100 px-4 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleAcceptSubmit}
                disabled={updatingStatus || !acceptMessage.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
              >
                {updatingStatus ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ REJECT MODAL ══════ */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setShowRejectModal(false)}>
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl sm:m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <XIcon size={20} className="text-gray-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Refuser la demande</h3>
                <p className="text-xs text-gray-500">Un email sera envoyé à {item.senderEmail}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-xs font-medium text-gray-600">
                Raison du refus
              </label>
              <div className="flex flex-wrap gap-2">
                {REJECT_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => handleReasonChange(reason.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedReason === reason.id
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                Message de réponse
              </label>
              <textarea
                value={rejectMessage}
                onChange={(e) => setRejectMessage(e.target.value)}
                rows={8}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/20"
                placeholder="Écris ton message..."
              />
              <p className="mt-1 text-[11px] text-gray-400">Tu peux modifier ce message avant de l&apos;envoyer</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 rounded-xl bg-gray-100 px-4 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={updatingStatus || !rejectMessage.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                {updatingStatus ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
