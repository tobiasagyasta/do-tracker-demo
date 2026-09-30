"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { startTransition, useState } from "react";

import { StoreLoading } from "@/components/store-loading";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isValidEmail, type CreatePartnerInput } from "@/lib/partners";
import { cn } from "@/lib/utils";
import { selectCreatePartner, selectHasHydrated } from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

type PartnerFormErrors = Partial<Record<keyof CreatePartnerInput, string>>;

const emptyForm: CreatePartnerInput = {
  name: "",
  companyType: "",
  taxNumber: "",
  phone: "",
  email: "",
  address: "",
  bankName: "",
  bankAccountNumber: "",
  bankAccountHolder: "",
  contactPerson: "",
  contactPersonPhone: "",
  isActive: true,
};

export function PartnerCreateFormStore() {
  const router = useRouter();
  const hasHydrated = useDemoStore(selectHasHydrated);
  const createPartner = useDemoStore(selectCreatePartner);
  const [form, setForm] = useState<CreatePartnerInput>(emptyForm);
  const [errors, setErrors] = useState<PartnerFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!hasHydrated) {
    return <StoreLoading />;
  }

  function updateForm<Key extends keyof CreatePartnerInput>(
    key: Key,
    value: CreatePartnerInput[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validateForm(): PartnerFormErrors {
    const nextErrors: PartnerFormErrors = {};

    if (form.name.trim() === "") {
      nextErrors.name = "Nama Mitra wajib diisi.";
    }

    if (form.email.trim() !== "" && !isValidEmail(form.email.trim())) {
      nextErrors.email = "Format email tidak valid.";
    }

    return nextErrors;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const nextErrors = validateForm();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    createPartner(form);
    window.sessionStorage.setItem("partner-created", "1");
    startTransition(() => router.push("/partners"));
  }

  return (
    <div className="space-y-6">
      <Link
        href="/partners"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4" />
        Kembali ke Mitra
      </Link>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Tambah Mitra
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Isi data mitra transportasi. Kode Mitra, ID, dan tanggal dibuat akan
          dibuat otomatis saat data disimpan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Utama</CardTitle>
            <CardDescription>
              Nama Mitra wajib diisi. Status awal otomatis Aktif.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormInput
              label="Nama Mitra"
              required
              value={form.name}
              error={errors.name}
              onChange={(value) => updateForm("name", value)}
            />
            <ReadOnlyField label="Kode Mitra" value="Dibuat otomatis" />
            <FormInput
              label="Bentuk Perusahaan"
              optional
              value={form.companyType}
              onChange={(value) => updateForm("companyType", value)}
            />
            <FormInput
              label="NPWP"
              optional
              value={form.taxNumber}
              onChange={(value) => updateForm("taxNumber", value)}
            />
            <FormInput
              label="Alamat"
              optional
              value={form.address}
              onChange={(value) => updateForm("address", value)}
              className="md:col-span-2"
            />
            <label className="inline-flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateForm("isActive", event.target.checked)}
                className="size-4 rounded border"
              />
              Status Aktif
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kontak</CardTitle>
            <CardDescription>
              Semua informasi kontak bersifat opsional. Email divalidasi hanya
              jika diisi.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormInput
              label="Nomor Telepon"
              optional
              value={form.phone}
              onChange={(value) => updateForm("phone", value)}
            />
            <FormInput
              label="Email"
              type="email"
              optional
              value={form.email}
              error={errors.email}
              onChange={(value) => updateForm("email", value)}
            />
            <FormInput
              label="Nama PIC"
              optional
              value={form.contactPerson}
              onChange={(value) => updateForm("contactPerson", value)}
            />
            <FormInput
              label="Nomor PIC"
              optional
              value={form.contactPersonPhone}
              onChange={(value) => updateForm("contactPersonPhone", value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informasi Pembayaran</CardTitle>
            <CardDescription>
              Detail rekening bersifat opsional dan dapat dilengkapi nanti.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormInput
              label="Nama Bank"
              optional
              value={form.bankName}
              onChange={(value) => updateForm("bankName", value)}
            />
            <FormInput
              label="Nomor Rekening"
              optional
              value={form.bankAccountNumber}
              onChange={(value) => updateForm("bankAccountNumber", value)}
            />
            <FormInput
              label="Atas Nama Rekening"
              optional
              value={form.bankAccountHolder}
              onChange={(value) => updateForm("bankAccountHolder", value)}
              className="md:col-span-2"
            />
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Link href="/partners" className={cn(buttonVariants({ variant: "outline" }))}>
            Batal
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : "Simpan Mitra"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  error,
  type = "text",
  required = false,
  optional = false,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: "text" | "email";
  required?: boolean;
  optional?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("block text-sm font-medium", className)}>
      <span className="flex items-center gap-2">
        {label}
        {required ? <span className="text-destructive">*</span> : null}
        {optional ? <span className="text-xs font-normal text-muted-foreground">Opsional</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={cn(
          "mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/30",
          error ? "border-destructive focus:border-destructive" : "",
        )}
      />
      {error ? <span className="mt-1 block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        {value}
      </p>
    </div>
  );
}
