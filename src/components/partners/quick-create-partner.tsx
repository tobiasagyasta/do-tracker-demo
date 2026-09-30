"use client";

import Link from "next/link";
import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { selectCreatePartner } from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";
import type { Partner } from "@/types/partner";

interface QuickCreatePartnerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (partner: Partner) => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
  title?: string;
  description?: ReactNode;
}

interface QuickCreatePartnerErrors {
  name?: string;
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function QuickCreatePartner({
  open,
  onOpenChange,
  onCreated,
  triggerRef,
  title = "Tambah Mitra Cepat",
  description = "Buat Mitra baru dengan data minimum. Profil lengkap dapat dilengkapi lewat halaman Mitra.",
}: QuickCreatePartnerProps) {
  const createPartner = useDemoStore(selectCreatePartner);
  const titleId = useId();
  const descriptionId = useId();
  const nameErrorId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<QuickCreatePartnerErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => nameInputRef.current?.focus());

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!open) {
    return null;
  }

  function closeDialog() {
    onOpenChange(false);
    setName("");
    setPhone("");
    setErrors({});
    setIsSubmitting(false);

    window.requestAnimationFrame(() => {
      const focusTarget = triggerRef?.current ?? lastFocusedElementRef.current;
      focusTarget?.focus();
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }

    if (event.key !== "Tab" || !dialogRef.current) {
      return;
    }

    const focusableElements = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
    );

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (name.trim() === "") {
      setErrors({ name: "Nama Mitra wajib diisi." });
      nameInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    const partner = createPartner({
      name,
      phone,
      companyType: "",
      taxNumber: "",
      email: "",
      address: "",
      bankName: "",
      bankAccountNumber: "",
      bankAccountHolder: "",
      contactPerson: "",
      contactPersonPhone: "",
      isActive: true,
    });

    onCreated(partner);
    closeDialog();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onKeyDown={handleKeyDown}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-lg rounded-lg border bg-background p-5 shadow-xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <h3 id={titleId} className="text-lg font-semibold">
              {title}
            </h3>
            <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={closeDialog}>
            <X />
            <span className="sr-only">Tutup</span>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium">
            Nama Mitra <span className="text-destructive">*</span>
            <input
              ref={nameInputRef}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setErrors((current) => ({ ...current, name: undefined }));
              }}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? nameErrorId : undefined}
              className={cn(
                "mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30",
                errors.name ? "border-destructive focus:border-destructive" : "",
              )}
            />
            {errors.name ? (
              <span id={nameErrorId} className="mt-1 block text-xs text-destructive">
                {errors.name}
              </span>
            ) : null}
          </label>

          <label className="block text-sm font-medium">
            <span className="flex items-center gap-2">
              Nomor Telepon
              <span className="text-xs font-normal text-muted-foreground">Opsional</span>
            </span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
            />
          </label>

          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Perlu data lengkap? Buka {" "}
            <Link href="/partners/new" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={closeDialog}>
              halaman tambah Mitra lengkap
            </Link>
            .
          </div>

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Mitra"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
