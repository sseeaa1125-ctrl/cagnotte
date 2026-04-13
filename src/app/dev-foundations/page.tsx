"use client";

import * as React from "react";
import { notFound } from "next/navigation";
import {
  Gift,
  Heart,
  User,
  Bell,
  Search,
  Plus,
  TrendingUp,
  Users,
  Wallet,
  Home,
  Settings,
  FolderOpen,
} from "lucide-react";

import {
  Button,
  Input,
  Textarea,
  Select,
  DatePicker,
  ImageUpload,
  RadioCard,
  Toggle,
  Checkbox,
  Badge,
  Avatar,
  ProgressBar,
  KpiCard,
  Pagination,
  Tabs,
  Modal,
  EmptyState,
  useToast,
} from "@/components/ui";

import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { DashboardNavbar } from "@/components/layout/DashboardNavbar";
import { TopBanner } from "@/components/layout/TopBanner";
import { Footer } from "@/components/layout/Footer";
import { PreFooter } from "@/components/layout/PreFooter";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { CampaignCard } from "@/components/cagnottes/CampaignCard";
import { FilterChipBar } from "@/components/cagnottes/FilterChipBar";
import { MiniCagnotteCard } from "@/components/checkout/MiniCagnotteCard";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { ShareSheet } from "@/components/share/ShareSheet";
import {
  NotificationItem,
  type NotificationType,
} from "@/components/notifications/NotificationItem";
import { TrustpilotBadge } from "@/components/trust/TrustpilotBadge";

import { formatPrice, formatPhone, formatRelativeTime } from "@/lib/format";
import { BENEFICIAIRES, OCCASIONS } from "@/lib/constants";

// ────────────────────────────────────────────────────────────────
// Sample data
// ────────────────────────────────────────────────────────────────

const SAMPLE_SELLER = {
  displayName: "Amadou Fall",
  avatarUrl: null,
};

const SAMPLE_FESTIVE = {
  slug: "les-30-ans-de-thomas",
  title: "Les 30 ans de Thomas",
  coverUrl: null,
  subtype: "festive" as const,
  raised: 125_000,
  goal: 300_000,
  donorCount: 42,
  endDate: "2026-05-15",
};

const SAMPLE_SOLIDAIRE = {
  slug: "soins-pour-fatou",
  title: "Soins médicaux pour Fatou",
  coverUrl: null,
  subtype: "solidaire" as const,
  raised: 450_000,
  goal: 600_000,
  donorCount: 87,
  endDate: null,
};

const SAMPLE_NOTIF_TYPES: NotificationType[] = [
  "DONATION_RECEIVED",
  "DONATION_MESSAGE",
  "MILESTONE_REACHED",
  "CAGNOTTE_ENDING_SOON",
  "CAGNOTTE_ENDED",
  "PAYOUT_COMPLETED",
  "PAYOUT_FAILED",
  "KYC_APPROVED",
  "KYC_REJECTED",
  "SYSTEM",
];

const NOW = Date.now();

// ────────────────────────────────────────────────────────────────
// Section wrapper
// ────────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-border pt-8">
      <h3 className="font-headings text-xl font-semibold text-primary">
        {title}
      </h3>
      {children}
    </section>
  );
}

// ────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────

export default function DevFoundationsPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { toast } = useToast();

  // Interactive state
  const [inputValue, setInputValue] = React.useState("");
  const [textareaValue, setTextareaValue] = React.useState("");
  const [selectValue, setSelectValue] = React.useState("");
  const [dateValue, setDateValue] = React.useState("");
  const [imageValue, setImageValue] = React.useState<File | string | null>(
    null,
  );
  const [radioValue, setRadioValue] = React.useState("self");
  const [toggleValue, setToggleValue] = React.useState(true);
  const [checkboxValue, setCheckboxValue] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [tabValue, setTabValue] = React.useState("all");
  const [page, setPage] = React.useState(3);
  const [bannerOpen, setBannerOpen] = React.useState(true);
  const [filterValue, setFilterValue] = React.useState("all");

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <header className="border-b border-border p-6">
        <div className="container mx-auto">
          <h1 className="font-headings text-3xl font-bold text-primary">
            Dev — Design System Fixture
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Phase 3 foundation — 18 primitives + 13 composed blocks. Dev-only; 404 in production.
          </p>
        </div>
      </header>

      <main className="container mx-auto space-y-16 p-6">
        {/* ══════════════════════════════════════════════════════════ */}
        {/* Section 1: Format helpers                                  */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section className="space-y-6">
          <h2 className="font-headings text-2xl font-semibold text-primary">
            1. Format helpers
          </h2>

          <Section title="formatPrice">
            <ul className="space-y-1 font-mono text-sm text-primary">
              <li>formatPrice(0) → {formatPrice(0)}</li>
              <li>formatPrice(500) → {formatPrice(500)}</li>
              <li>formatPrice(15000) → {formatPrice(15000)}</li>
              <li>formatPrice(125000) → {formatPrice(125000)}</li>
              <li>formatPrice(1500000) → {formatPrice(1500000)}</li>
            </ul>
          </Section>

          <Section title="formatPhone">
            <ul className="space-y-1 font-mono text-sm text-primary">
              <li>formatPhone(&quot;771234567&quot;) → {formatPhone("771234567")}</li>
              <li>
                formatPhone(&quot;221771234567&quot;) → {formatPhone("221771234567")}
              </li>
              <li>
                formatPhone(&quot;+221771234567&quot;) → {formatPhone("+221771234567")}
              </li>
              <li>formatPhone(null) → [{formatPhone(null)}]</li>
            </ul>
          </Section>

          <Section title="formatRelativeTime">
            <ul className="space-y-1 font-mono text-sm text-primary">
              <li>now-10s → {formatRelativeTime(new Date(NOW - 10_000))}</li>
              <li>now-5min → {formatRelativeTime(new Date(NOW - 300_000))}</li>
              <li>now-2h → {formatRelativeTime(new Date(NOW - 7_200_000))}</li>
              <li>now-3d → {formatRelativeTime(new Date(NOW - 3 * 86_400_000))}</li>
              <li>now+1d → {formatRelativeTime(new Date(NOW + 86_400_000))}</li>
            </ul>
          </Section>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* Section 2: Primitives                                      */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section className="space-y-6">
          <h2 className="font-headings text-2xl font-semibold text-primary">
            2. Primitives (Ring 1)
          </h2>

          <Section title="Button — variants & sizes">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="primary" size="lg">
                Primary lg
              </Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="primary" loading>
                Loading
              </Button>
              <Button variant="primary" iconLeft={<Plus size={16} />}>
                With icon
              </Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
            </div>
          </Section>

          <Section title="Button — social variants">
            <div className="flex flex-wrap gap-3">
              <Button variant="social" socialProvider="google">
                Continuer avec Google
              </Button>
              <Button variant="social" socialProvider="apple">
                Apple
              </Button>
              <Button variant="social" socialProvider="facebook">
                Facebook
              </Button>
              <Button variant="social" socialProvider="whatsapp">
                WhatsApp
              </Button>
              <Button variant="social" socialProvider="email">
                Email
              </Button>
            </div>
          </Section>

          <Section title="Input / Textarea / Select / DatePicker">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Prénom"
                placeholder="Amadou"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                helper="Votre prénom tel qu'il apparaîtra sur la cagnotte"
              />
              <Input
                label="Mot de passe"
                type="password"
                placeholder="••••••••"
                helper="Minimum 8 caractères"
              />
              <Input
                label="Email"
                type="email"
                error="Email invalide"
                defaultValue="bad@"
              />
              <Select
                label="Occasion"
                placeholder="Choisir une occasion"
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
                options={OCCASIONS.map((o) => ({ value: o, label: o }))}
              />
              <DatePicker
                label="Date de fin"
                value={dateValue}
                onChange={setDateValue}
                clearable
              />
              <Textarea
                label="Message"
                placeholder="Un petit mot pour les contributeurs…"
                value={textareaValue}
                onChange={(e) => setTextareaValue(e.target.value)}
                maxLength={200}
              />
              <div className="md:col-span-2">
                <ImageUpload
                  label="Image de couverture"
                  value={imageValue}
                  onChange={setImageValue}
                />
              </div>
            </div>
          </Section>

          <Section title="RadioCard / Toggle / Checkbox">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                {BENEFICIAIRES.map((b) => (
                  <RadioCard
                    key={b.value}
                    name="beneficiaire"
                    value={b.value}
                    title={b.label}
                    description={
                      b.value === "self"
                        ? "Pour vous-même"
                        : b.value === "relative"
                          ? "Un membre de votre entourage"
                          : "Une organisation"
                    }
                    icon={<User size={18} />}
                    checked={radioValue === b.value}
                    onChange={setRadioValue}
                  />
                ))}
              </div>
              <div className="space-y-4">
                <Toggle
                  checked={toggleValue}
                  onChange={setToggleValue}
                  label="Afficher le nombre de contributeurs"
                  description="Visible publiquement sur la page de la cagnotte"
                />
                <Toggle
                  checked={false}
                  onChange={() => {}}
                  label="Dons anonymes autorisés"
                />
              </div>
              <div className="space-y-4">
                <Checkbox
                  checked={checkboxValue}
                  onChange={setCheckboxValue}
                  label={
                    <>
                      {"J'accepte les "}
                      <a
                        href="/cgu"
                        className="underline hover:text-primary-hover"
                      >
                        conditions générales
                      </a>
                    </>
                  }
                />
                <Checkbox
                  checked={false}
                  onChange={() => {}}
                  label="Option cochable"
                  error="Ce champ est obligatoire"
                />
              </div>
            </div>
          </Section>

          <Section title="Badge — variants">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="festive">Festive</Badge>
              <Badge variant="solidaire">Solidaire</Badge>
              <Badge variant="status-active">En cours</Badge>
              <Badge variant="status-ended">Terminée</Badge>
              <Badge variant="default">Default</Badge>
            </div>
          </Section>

          <Section title="Avatar — sizes">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name="Amadou Fall" size="sm" />
              <Avatar name="Amadou Fall" size="md" />
              <Avatar name="Amadou Fall" size="lg" />
              <Avatar name="Amadou Fall" size="xl" />
              <Avatar name="Amadou Fall" size="lg" editable onEdit={() => {}} />
            </div>
          </Section>

          <Section title="ProgressBar — primary / gold">
            <div className="grid gap-6 md:grid-cols-2">
              <ProgressBar
                value={42}
                raisedLabel={`${formatPrice(125000)} collectés`}
                goalLabel={`sur ${formatPrice(300000)}`}
                color="primary"
              />
              <ProgressBar
                value={75}
                raisedLabel={`${formatPrice(450000)} collectés`}
                goalLabel={`sur ${formatPrice(600000)}`}
                color="gold"
              />
            </div>
          </Section>

          <Section title="KpiCard">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <KpiCard
                icon={<Wallet size={18} />}
                label="Total collecté"
                value={formatPrice(1_250_000)}
                trend={{ value: 12, direction: "up" }}
              />
              <KpiCard
                icon={<Users size={18} />}
                label="Contributeurs"
                value="342"
                trend={{ value: 8, direction: "up" }}
              />
              <KpiCard
                icon={<TrendingUp size={18} />}
                label="Taux de conversion"
                value="4,2 %"
                trend={{ value: 2, direction: "down" }}
              />
              <KpiCard
                icon={<Gift size={18} />}
                label="Don moyen"
                value={formatPrice(3_650)}
              />
            </div>
          </Section>

          <Section title="Tabs">
            <Tabs
              tabs={[
                { value: "all", label: "Toutes", count: 24 },
                { value: "active", label: "En cours", count: 18 },
                { value: "ended", label: "Terminées", count: 6 },
              ]}
              value={tabValue}
              onChange={setTabValue}
            />
          </Section>

          <Section title="Pagination">
            <Pagination page={page} pageCount={12} onChange={setPage} />
          </Section>

          <Section title="Modal / EmptyState / Toast">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                Ouvrir la modal
              </Button>
              <Button
                variant="outline"
                onClick={() => toast("Ceci est un toast de test", "success")}
              >
                Déclencher un toast
              </Button>
            </div>

            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Exemple de modal"
              size="md"
            >
              <p className="text-sm text-muted-foreground">
                {"Contenu d'exemple de la modal. Appuyez sur Échap ou cliquez en dehors pour fermer."}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setModalOpen(false)}
                >
                  Confirmer
                </Button>
              </div>
            </Modal>

            <div className="mt-6 rounded-xl border border-border">
              <EmptyState
                icon={<FolderOpen size={28} />}
                title="Aucune cagnotte pour le moment"
                description="Créez votre première cagnotte pour commencer à collecter."
                cta={
                  <Button variant="primary">Créer ma cagnotte</Button>
                }
              />
            </div>
          </Section>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* Section 3: Composed blocks                                 */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section className="space-y-6">
          <h2 className="font-headings text-2xl font-semibold text-primary">
            3. Composed blocks (Ring 2)
          </h2>

          <Section title="Layout — TopBanner">
            {bannerOpen ? (
              <TopBanner
                message="Lancement de Cagnottes.sn ! Créez votre première cagnotte dès aujourd'hui."
                ctaLabel="Créer ma cagnotte"
                ctaHref="/inscription"
                onClose={() => setBannerOpen(false)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Bannière fermée.{" "}
                <button
                  type="button"
                  onClick={() => setBannerOpen(true)}
                  className="underline"
                >
                  Rouvrir
                </button>
              </p>
            )}
          </Section>

          <Section title="Layout — PublicNavbar">
            <div className="overflow-hidden rounded-xl border border-border">
              <PublicNavbar />
            </div>
          </Section>

          <Section title="Layout — DashboardNavbar (unreadCount=3, prop-driven)">
            <div className="overflow-hidden rounded-xl border border-border">
              <DashboardNavbar
                unreadCount={3}
                seller={SAMPLE_SELLER}
                onLogout={() => toast("onLogout() appelé", "info")}
              />
            </div>
          </Section>

          <Section title="Layout — SidebarNav">
            <div className="max-w-sm rounded-xl border border-border p-3">
              <SidebarNav
                items={[
                  {
                    label: "Tableau de bord",
                    href: "/tableau-de-bord",
                    icon: <Home size={18} />,
                    active: true,
                  },
                  {
                    label: "Mes cagnottes",
                    href: "/mes-cagnottes",
                    icon: <FolderOpen size={18} />,
                  },
                  {
                    label: "Notifications",
                    href: "/notifications",
                    icon: <Bell size={18} />,
                  },
                  {
                    label: "Profil",
                    href: "/profil",
                    icon: <User size={18} />,
                  },
                  {
                    label: "Paramètres",
                    href: "/parametres",
                    icon: <Settings size={18} />,
                  },
                ]}
              />
            </div>
          </Section>

          <Section title="Cagnotte — CampaignCard festive + solidaire">
            <div className="grid gap-6 md:grid-cols-2">
              <CampaignCard cagnotte={SAMPLE_FESTIVE} />
              <CampaignCard cagnotte={SAMPLE_SOLIDAIRE} />
            </div>
          </Section>

          <Section title="Cagnotte — FilterChipBar">
            <FilterChipBar
              filters={[
                { value: "all", label: "Toutes", count: 24 },
                { value: "festive", label: "Festive", count: 15 },
                { value: "solidaire", label: "Solidaire", count: 9 },
              ]}
              value={filterValue}
              onChange={setFilterValue}
            />
          </Section>

          <Section title="Checkout — MiniCagnotteCard + OrderSummary (festive + solidaire)">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <MiniCagnotteCard cagnotte={SAMPLE_FESTIVE} />
                <OrderSummary
                  amount={10_000}
                  subtype="festive"
                  commissionBp={800}
                  commissionAmount={800}
                  netAmount={9_200}
                />
              </div>
              <div className="space-y-4">
                <MiniCagnotteCard cagnotte={SAMPLE_SOLIDAIRE} />
                <OrderSummary
                  amount={10_000}
                  subtype="solidaire"
                  commissionBp={600}
                  commissionAmount={600}
                  netAmount={9_400}
                />
              </div>
            </div>
          </Section>

          <Section title="Share — ShareSheet (WhatsApp first)">
            <div className="max-w-2xl rounded-xl border border-border p-4">
              <ShareSheet
                url="https://cagnottes.sn/c/les-30-ans-de-thomas"
                title="Les 30 ans de Thomas"
                description="Participez à la cagnotte pour l'anniversaire de Thomas !"
                onShare={(target) => toast(`Partagé via ${target}`, "info")}
              />
            </div>
          </Section>

          <Section title="Notifications — NotificationItem (10 types)">
            <div className="max-w-xl space-y-2 rounded-xl border border-border p-2">
              {SAMPLE_NOTIF_TYPES.map((type, i) => (
                <NotificationItem
                  key={type}
                  notification={{
                    id: String(i),
                    type,
                    subtitle: `Exemple pour le type ${type}`,
                    createdAt: new Date(
                      NOW - (i + 1) * 3_600_000,
                    ).toISOString(),
                    isRead: i >= 3,
                  }}
                  onClick={() => toast(`Clic sur ${type}`, "info")}
                />
              ))}
            </div>
          </Section>

          <Section title="Trust — TrustpilotBadge">
            <div className="flex flex-wrap items-center gap-3">
              <TrustpilotBadge />
              <TrustpilotBadge rating={4.9} reviewCount={342} />
            </div>
          </Section>

          <Section title="Layout — PreFooter + Footer">
            <div className="overflow-hidden rounded-xl border border-border">
              <PreFooter />
              <Footer />
            </div>
          </Section>
        </section>

        <footer className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
          <Search size={12} />
          Fin du fixture — tout scrollé ?{" "}
          <Heart size={12} className="text-pink" />
        </footer>
      </main>
    </div>
  );
}
