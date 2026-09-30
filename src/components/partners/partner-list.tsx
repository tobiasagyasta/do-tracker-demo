"use client";

import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { filterPartners } from "@/lib/partners";
import { cn } from "@/lib/utils";
import type { Partner } from "@/types/partner";

interface PartnerListProps {
  partners: Partner[];
}

export function PartnerList({ partners }: PartnerListProps) {
  const [search, setSearch] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [toastMessage, setToastMessage] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    if (window.sessionStorage.getItem("partner-created") !== "1") {
      return "";
    }

    window.sessionStorage.removeItem("partner-created");
    return "Mitra berhasil ditambahkan.";
  });

  const filteredPartners = useMemo(
    () => filterPartners(partners, search),
    [partners, search],
  );
  const activePartnerCount = partners.filter((partner) => partner.isActive).length;
  const inactivePartnerCount = partners.length - activePartnerCount;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Mitra
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Kelola data mitra transportasi yang bekerja sama dengan perusahaan.
          </p>
        </div>
        <Link href="/partners/new" className={cn(buttonVariants(), "w-fit")}>
          <Plus />
          Tambah Mitra
        </Link>
      </div>

      {toastMessage ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            className="rounded-md p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
            aria-label="Tutup notifikasi"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryItem label="Total Mitra" value={partners.length} />
        <SummaryItem label="Mitra Aktif" value={activePartnerCount} />
        <SummaryItem label="Mitra Nonaktif" value={inactivePartnerCount} />
      </section>

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <label className="block max-w-xl text-sm font-medium">
          Search
          <span className="relative mt-2 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, kode, atau kontak mitra..."
              className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/30"
            />
          </span>
        </label>
      </section>

      <section className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Mitra</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPartners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                  Tidak ada mitra yang sesuai dengan pencarian.
                </TableCell>
              </TableRow>
            ) : (
              filteredPartners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell className="font-mono font-semibold">
                    {partner.code}
                  </TableCell>
                  <TableCell className="min-w-64 font-medium">
                    {partner.name}
                  </TableCell>
                  <TableCell>{partner.contactPerson ?? "-"}</TableCell>
                  <TableCell>{partner.phone ?? "-"}</TableCell>
                  <TableCell>{partner.bankName ?? "-"}</TableCell>
                  <TableCell>
                    <PartnerStatusBadge isActive={partner.isActive} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPartner(partner)}
                    >
                      Lihat
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      {selectedPartner ? (
        <PartnerDetailDialog
          partner={selectedPartner}
          onClose={() => setSelectedPartner(null)}
        />
      ) : null}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function PartnerStatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
      Aktif
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Nonaktif
    </Badge>
  );
}

function PartnerDetailDialog({
  partner,
  onClose,
}: {
  partner: Partner;
  onClose: () => void;
}) {
  return (
    <ModalShell title="Detail Mitra" onClose={onClose} maxWidth="max-w-3xl">
      <div className="grid gap-6 text-sm md:grid-cols-2">
        <DetailSection title="Informasi Mitra">
          <DetailItem label="Kode Mitra" value={partner.code} />
          <DetailItem label="Nama Mitra" value={partner.name} />
          <DetailItem label="Bentuk Perusahaan" value={partner.companyType} />
          <DetailItem label="NPWP" value={partner.taxNumber} />
          <DetailItem label="Alamat" value={partner.address} />
          <DetailItem label="Telepon" value={partner.phone} />
          <DetailItem label="Email" value={partner.email} />
        </DetailSection>

        <div className="space-y-6">
          <DetailSection title="Kontak Utama">
            <DetailItem label="Nama PIC" value={partner.contactPerson} />
            <DetailItem label="Nomor PIC" value={partner.contactPersonPhone} />
          </DetailSection>

          <DetailSection title="Informasi Bank">
            <DetailItem label="Nama Bank" value={partner.bankName} />
            <DetailItem label="Nomor Rekening" value={partner.bankAccountNumber} />
            <DetailItem label="Atas Nama" value={partner.bankAccountHolder} />
          </DetailSection>

          <DetailSection title="Status">
            <PartnerStatusBadge isActive={partner.isActive} />
          </DetailSection>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  onClose,
  maxWidth,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-modal-title"
        className={cn(
          "max-h-[90vh] w-full overflow-y-auto rounded-lg border bg-background p-5 shadow-xl",
          maxWidth,
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-4 border-b pb-4">
          <h3 id="partner-modal-title" className="text-lg font-semibold">
            {title}
          </h3>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
            <X />
            <span className="sr-only">Tutup</span>
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h4 className="font-semibold">{title}</h4>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value ?? "-"}</p>
    </div>
  );
}
