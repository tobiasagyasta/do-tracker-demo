"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Plus, Search } from "lucide-react";
import { startTransition, useMemo, useRef, useState } from "react";

import { QuickCreatePartner } from "@/components/partners/quick-create-partner";
import { StoreLoading } from "@/components/store-loading";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  calculateEstimatedGrossMargin,
  calculatePartnerPph23,
  calculatePurchaseTotal,
  calculateSalesPph23,
  calculateSalesTotal,
  generateNextDeliveryOrderNumber,
  normalizeVehiclePlate,
  validateDeliveryOrderDates,
} from "@/lib/delivery-order-creation";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  selectDeliveryOrders,
  selectHasHydrated,
  selectPartners,
} from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";
import type { CreateDeliveryOrderInput } from "@/types/delivery-order";
import type { Partner } from "@/types/partner";

type SubmitMode = "detail" | "again";

type FieldKey =
  | "loadingDate"
  | "unloadingDate"
  | "partnerId"
  | "customerName"
  | "originMine"
  | "destinationPort"
  | "truckPlate"
  | "driverName"
  | "tonnage"
  | "transportPrice"
  | "roadMoney"
  | "gasMoney"
  | "partnerPph23"
  | "sellingPrice"
  | "salesGasMoney"
  | "salesPph23";

type FieldErrors = Partial<Record<FieldKey, string>>;

interface DeliveryOrderFormState {
  loadingDate: string;
  unloadingDate: string;
  partnerId: string;
  customerName: string;
  originMine: string;
  destinationPort: string;
  truckPlate: string;
  driverName: string;
  tonnage: string;
  transportPrice: string;
  roadMoney: string;
  gasMoney: string;
  partnerPph23: string;
  isPartnerPphManual: boolean;
  sellingPrice: string;
  salesGasMoney: string;
  salesPph23: string;
  isSalesPphManual: boolean;
}

const today = new Date().toISOString().slice(0, 10);

const initialForm: DeliveryOrderFormState = {
  loadingDate: today,
  unloadingDate: "",
  partnerId: "",
  customerName: "",
  originMine: "",
  destinationPort: "",
  truckPlate: "",
  driverName: "",
  tonnage: "",
  transportPrice: "",
  roadMoney: "0",
  gasMoney: "0",
  partnerPph23: "",
  isPartnerPphManual: false,
  sellingPrice: "",
  salesGasMoney: "0",
  salesPph23: "",
  isSalesPphManual: false,
};

const retainedAfterCreateAgain: Array<keyof DeliveryOrderFormState> = [
  "loadingDate",
  "partnerId",
  "customerName",
  "originMine",
  "destinationPort",
];

export function DeliveryOrderCreateFormStore() {
  const router = useRouter();
  const hasHydrated = useDemoStore(selectHasHydrated);
  const orders = useDemoStore(selectDeliveryOrders);
  const partners = useDemoStore(selectPartners);
  const createDeliveryOrder = useDemoStore((state) => state.createDeliveryOrder);
  const [form, setForm] = useState<DeliveryOrderFormState>(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSalesOpen, setIsSalesOpen] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [submitMode, setSubmitMode] = useState<SubmitMode | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const quickCreateTriggerRef = useRef<HTMLButtonElement | null>(null);
  const fieldRefs = useRef<Partial<Record<FieldKey, HTMLElement | null>>>({});

  const activePartners = useMemo(
    () => partners.filter((partner) => partner.isActive),
    [partners],
  );
  const filteredPartners = useMemo(() => {
    const query = partnerSearch.trim().toLocaleLowerCase("id-ID");

    if (query === "") {
      return activePartners;
    }

    return activePartners.filter((partner) =>
      [partner.name, partner.code].some((value) =>
        value.toLocaleLowerCase("id-ID").includes(query),
      ),
    );
  }, [activePartners, partnerSearch]);
  const selectedPartner = partners.find((partner) => partner.id === form.partnerId);
  const doNumberPreview = generateNextDeliveryOrderNumber(
    orders,
    form.loadingDate ? form.loadingDate.slice(0, 4) : new Date().getFullYear(),
  );
  const preview = getFinancialPreview(form);
  const errorList = getErrorList(errors);

  if (!hasHydrated) {
    return <StoreLoading />;
  }

  function updateField<Key extends keyof DeliveryOrderFormState>(
    key: Key,
    value: DeliveryOrderFormState[Key],
  ) {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "truckPlate" && typeof value === "string") {
        next.truckPlate = value.toUpperCase();
      }

      return next;
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validateForm(): FieldErrors {
    const nextErrors: FieldErrors = {};
    const dateValidation = validateDeliveryOrderDates({
      loadingDate: form.loadingDate,
      unloadingDate: form.unloadingDate || undefined,
    });

    if (!dateValidation.valid) {
      nextErrors.loadingDate = dateValidation.errors[0];
    }

    if (form.partnerId === "") nextErrors.partnerId = "Mitra wajib dipilih.";
    if (form.customerName.trim() === "") nextErrors.customerName = "Tambang wajib diisi.";
    if (form.originMine.trim() === "") nextErrors.originMine = "Tambang asal wajib diisi.";
    if (form.destinationPort.trim() === "") nextErrors.destinationPort = "Pelabuhan tujuan wajib diisi.";
    if (form.truckPlate.trim() === "") nextErrors.truckPlate = "Nomor polisi wajib diisi.";
    if (form.driverName.trim() === "") nextErrors.driverName = "Nama pengemudi wajib diisi.";
    validatePositiveNumber(form.tonnage, "Tonase", "tonnage", nextErrors);
    validatePositiveNumber(form.transportPrice, "Harga angkut", "transportPrice", nextErrors);
    validateNonNegativeNumber(form.roadMoney, "Uang jalan", "roadMoney", nextErrors);
    validateNonNegativeNumber(form.gasMoney, "Uang pijak gas", "gasMoney", nextErrors);

    if (form.isPartnerPphManual) {
      validateNonNegativeNumber(form.partnerPph23, "PPh 23 Mitra", "partnerPph23", nextErrors);
    }

    if (form.sellingPrice.trim() !== "") {
      validatePositiveNumber(form.sellingPrice, "Harga jual", "sellingPrice", nextErrors);
    }

    validateNonNegativeNumber(form.salesGasMoney, "Uang pijak gas penjualan", "salesGasMoney", nextErrors);

    if (form.isSalesPphManual) {
      validateNonNegativeNumber(form.salesPph23, "PPh 23 Penjualan", "salesPph23", nextErrors);
    }

    return nextErrors;
  }

  function focusFirstInvalid(nextErrors: FieldErrors) {
    const firstField = Object.keys(nextErrors)[0] as FieldKey | undefined;

    if (!firstField) return;

    fieldRefs.current[firstField]?.focus();
  }

  function buildInput(): CreateDeliveryOrderInput {
    return {
      id: `do-${Date.now()}`,
      truckPlate: normalizeVehiclePlate(form.truckPlate),
      driverName: form.driverName.trim(),
      partnerName: selectedPartner?.name ?? "",
      customerName: form.customerName.trim(),
      originMine: form.originMine.trim(),
      destinationPort: form.destinationPort.trim(),
      loadingDate: form.loadingDate,
      unloadingDate: form.unloadingDate || undefined,
      tonnage: toNumber(form.tonnage),
      transportPrice: toNumber(form.transportPrice),
      roadMoney: toNumber(form.roadMoney),
      gasMoney: toNumber(form.gasMoney),
      partnerPph23: preview.partnerPph23,
      sellingPrice: preview.hasSales ? toNumber(form.sellingPrice) : undefined,
      salesGasMoney: preview.hasSales ? toNumber(form.salesGasMoney) : undefined,
      salesPph23: preview.hasSales ? preview.salesPph23 : undefined,
    };
  }

  function handleSubmit(mode: SubmitMode) {
    if (submitMode) return;

    setSubmitAttempted(true);
    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalid(nextErrors);
      return;
    }

    setSubmitMode(mode);
    const createdOrder = createDeliveryOrder(buildInput());

    if (mode === "detail") {
      startTransition(() => router.push(`/delivery-orders/${createdOrder.id}`));
      return;
    }

    setForm((current) => ({
      ...initialForm,
      loadingDate: current.loadingDate,
      partnerId: current.partnerId,
      customerName: current.customerName,
      originMine: current.originMine,
      destinationPort: current.destinationPort,
    }));
    setErrors({});
    setSubmitAttempted(false);
    setSubmitMode(null);
    setSuccessMessage(
      `${createdOrder.doNumber} tersimpan. Nilai yang dipertahankan: tanggal muat, mitra, tambang, asal, dan tujuan.`,
    );
  }

  function handleQuickPartnerCreated(partner: Partner) {
    updateField("partnerId", partner.id);
    setPartnerSearch(partner.name);
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <Link href="/delivery-orders" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        <ArrowLeft className="size-4" />
        Kembali ke Tracking DO
      </Link>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Buat Delivery Order</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Isi data operasional dan biaya awal. Record baru selalu dimulai sebagai Belum Dibayar ke Mitra.
        </p>
      </div>

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          {successMessage}
        </div>
      ) : null}

      {submitAttempted && errorList.length > 0 ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          <p className="font-medium">Periksa kembali data berikut:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errorList.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <MainInfoSection
            form={form}
            errors={errors}
            doNumberPreview={doNumberPreview}
            partnerSearch={partnerSearch}
            partners={filteredPartners}
            selectedPartner={selectedPartner}
            onPartnerSearchChange={setPartnerSearch}
            onFieldChange={updateField}
            onOpenQuickCreate={() => setIsQuickCreateOpen(true)}
            quickCreateTriggerRef={quickCreateTriggerRef}
            fieldRefs={fieldRefs}
          />
          <TripSection form={form} errors={errors} onFieldChange={updateField} fieldRefs={fieldRefs} />
          <PurchaseSection form={form} errors={errors} preview={preview} onFieldChange={updateField} fieldRefs={fieldRefs} />
          <SalesSection isOpen={isSalesOpen} onToggle={() => setIsSalesOpen((current) => !current)} form={form} errors={errors} preview={preview} onFieldChange={updateField} fieldRefs={fieldRefs} />
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SummaryCard preview={preview} />
        </aside>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 p-4 backdrop-blur sm:-mx-6 lg:hidden">
        <div className="flex gap-2">
          <Link href="/delivery-orders" className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>Batal</Link>
          <Button type="button" className="flex-1" disabled={Boolean(submitMode)} onClick={() => handleSubmit("detail")}>Simpan DO</Button>
        </div>
      </div>

      <div className="hidden justify-end gap-2 border-t pt-4 lg:flex">
        <Link href="/delivery-orders" className={cn(buttonVariants({ variant: "outline" }))}>Batal</Link>
        <Button type="button" variant="outline" disabled={Boolean(submitMode)} onClick={() => handleSubmit("again")}>Simpan & Buat Lagi</Button>
        <Button type="button" disabled={Boolean(submitMode)} onClick={() => handleSubmit("detail")}>Simpan DO</Button>
      </div>

      <QuickCreatePartner
        open={isQuickCreateOpen}
        onOpenChange={setIsQuickCreateOpen}
        onCreated={handleQuickPartnerCreated}
        triggerRef={quickCreateTriggerRef}
      />
    </div>
  );
}

function MainInfoSection({
  form,
  errors,
  doNumberPreview,
  partnerSearch,
  partners,
  selectedPartner,
  onPartnerSearchChange,
  onFieldChange,
  onOpenQuickCreate,
  quickCreateTriggerRef,
  fieldRefs,
}: {
  form: DeliveryOrderFormState;
  errors: FieldErrors;
  doNumberPreview: string;
  partnerSearch: string;
  partners: Partner[];
  selectedPartner?: Partner;
  onPartnerSearchChange: (value: string) => void;
  onFieldChange: <Key extends keyof DeliveryOrderFormState>(key: Key, value: DeliveryOrderFormState[Key]) => void;
  onOpenQuickCreate: () => void;
  quickCreateTriggerRef: React.RefObject<HTMLButtonElement | null>;
  fieldRefs: React.MutableRefObject<Partial<Record<FieldKey, HTMLElement | null>>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informasi Utama</CardTitle>
        <CardDescription>Nomor DO adalah preview. Store akan menentukan nomor akhir saat disimpan.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <ReadOnlyField label="Nomor DO" value={doNumberPreview} />
        <FormInput label="Tanggal Muat" required type="date" value={form.loadingDate} error={errors.loadingDate} inputRef={(node) => { fieldRefs.current.loadingDate = node; }} onChange={(value) => onFieldChange("loadingDate", value)} />
        <FormInput label="Tanggal Bongkar" optional type="date" value={form.unloadingDate} error={errors.unloadingDate} inputRef={(node) => { fieldRefs.current.unloadingDate = node; }} onChange={(value) => onFieldChange("unloadingDate", value)} />
        <FormInput label="Tambang" required value={form.customerName} error={errors.customerName} inputRef={(node) => { fieldRefs.current.customerName = node; }} onChange={(value) => onFieldChange("customerName", value)} />
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">
            Mitra <span className="text-destructive">*</span>
            <span className="relative mt-2 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input ref={(node) => { fieldRefs.current.partnerId = node; }} value={partnerSearch} onChange={(event) => onPartnerSearchChange(event.target.value)} className={cn("h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30", errors.partnerId ? "border-destructive" : "")} aria-invalid={Boolean(errors.partnerId)} />
            </span>
          </label>
          {errors.partnerId ? <p className="mt-1 text-xs text-destructive">{errors.partnerId}</p> : null}
          <div className="mt-2 rounded-md border bg-background p-2">
            <div className="max-h-44 space-y-1 overflow-y-auto">
              {partners.length === 0 ? <p className="px-2 py-3 text-sm text-muted-foreground">Tidak ada mitra aktif yang cocok.</p> : partners.map((partner) => (
                <button key={partner.id} type="button" onClick={() => { onFieldChange("partnerId", partner.id); onPartnerSearchChange(partner.name); }} className={cn("flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted", selectedPartner?.id === partner.id ? "bg-muted font-medium" : "")}> 
                  <span>{partner.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{partner.code}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 border-t pt-2">
              <Button ref={quickCreateTriggerRef} type="button" variant="outline" size="sm" onClick={onOpenQuickCreate}><Plus />Tambah Mitra Baru</Button>
              <Link href="/partners/new" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Form Lengkap Mitra</Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TripSection({ form, errors, onFieldChange, fieldRefs }: SectionProps) {
  return (
    <Card>
      <CardHeader><CardTitle>Perjalanan & Kendaraan</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <FormInput label="Tambang Asal" required value={form.originMine} error={errors.originMine} inputRef={(node) => { fieldRefs.current.originMine = node; }} onChange={(value) => onFieldChange("originMine", value)} />
        <FormInput label="Pelabuhan Tujuan" required value={form.destinationPort} error={errors.destinationPort} inputRef={(node) => { fieldRefs.current.destinationPort = node; }} onChange={(value) => onFieldChange("destinationPort", value)} />
        <FormInput label="Nomor Polisi" required value={form.truckPlate} error={errors.truckPlate} inputRef={(node) => { fieldRefs.current.truckPlate = node; }} onChange={(value) => onFieldChange("truckPlate", value)} />
        <FormInput label="Nama Pengemudi" required value={form.driverName} error={errors.driverName} inputRef={(node) => { fieldRefs.current.driverName = node; }} onChange={(value) => onFieldChange("driverName", value)} />
        <FormInput label="Tonase" required suffix="ton" inputMode="decimal" value={form.tonnage} error={errors.tonnage} inputRef={(node) => { fieldRefs.current.tonnage = node; }} onChange={(value) => onFieldChange("tonnage", value)} />
      </CardContent>
    </Card>
  );
}

type SectionProps = {
  form: DeliveryOrderFormState;
  errors: FieldErrors;
  onFieldChange: <Key extends keyof DeliveryOrderFormState>(key: Key, value: DeliveryOrderFormState[Key]) => void;
  fieldRefs: React.MutableRefObject<Partial<Record<FieldKey, HTMLElement | null>>>;
};

function PurchaseSection({ form, errors, preview, onFieldChange, fieldRefs }: SectionProps & { preview: FinancialPreview }) {
  return (
    <Card>
      <CardHeader><CardTitle>Biaya Mitra</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <FormInput label="Harga Angkut" required inputMode="numeric" value={form.transportPrice} error={errors.transportPrice} inputRef={(node) => { fieldRefs.current.transportPrice = node; }} onChange={(value) => onFieldChange("transportPrice", value)} />
        <FormInput label="Uang Jalan" optional inputMode="numeric" value={form.roadMoney} error={errors.roadMoney} inputRef={(node) => { fieldRefs.current.roadMoney = node; }} onChange={(value) => onFieldChange("roadMoney", value)} />
        <FormInput label="Uang Pijak Gas" optional inputMode="numeric" value={form.gasMoney} error={errors.gasMoney} inputRef={(node) => { fieldRefs.current.gasMoney = node; }} onChange={(value) => onFieldChange("gasMoney", value)} />
        <div>
          <FormInput label="PPh 23 Mitra" optional inputMode="numeric" value={form.isPartnerPphManual ? form.partnerPph23 : String(preview.autoPartnerPph23)} error={errors.partnerPph23} inputRef={(node) => { fieldRefs.current.partnerPph23 = node; }} onChange={(value) => { onFieldChange("partnerPph23", value); onFieldChange("isPartnerPphManual", true); }} />
          <Button type="button" variant="link" size="sm" className="mt-1 px-0" onClick={() => { onFieldChange("isPartnerPphManual", false); onFieldChange("partnerPph23", ""); }}>Gunakan otomatis</Button>
        </div>
        <ReadOnlyField label="Total Pembelian" value={formatRupiah(preview.purchaseTotal)} />
      </CardContent>
    </Card>
  );
}

function SalesSection({ isOpen, onToggle, form, errors, preview, onFieldChange, fieldRefs }: SectionProps & { isOpen: boolean; onToggle: () => void; preview: FinancialPreview }) {
  return (
    <Card>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-6 text-left">
        <span><span className="block font-medium">Informasi Penjualan</span><span className="text-sm text-muted-foreground">Opsional, dapat dilengkapi nanti.</span></span>
        <ChevronDown className={cn("size-4 transition-transform", isOpen ? "rotate-180" : "")} />
      </button>
      {isOpen ? (
        <CardContent className="mt-4 grid gap-4 md:grid-cols-2">
          <FormInput label="Harga Jual" optional inputMode="numeric" value={form.sellingPrice} error={errors.sellingPrice} inputRef={(node) => { fieldRefs.current.sellingPrice = node; }} onChange={(value) => onFieldChange("sellingPrice", value)} />
          <FormInput label="Uang Pijak Gas Penjualan" optional inputMode="numeric" value={form.salesGasMoney} error={errors.salesGasMoney} inputRef={(node) => { fieldRefs.current.salesGasMoney = node; }} onChange={(value) => onFieldChange("salesGasMoney", value)} />
          <div>
            <FormInput label="PPh 23 Penjualan" optional inputMode="numeric" value={form.isSalesPphManual ? form.salesPph23 : String(preview.autoSalesPph23)} error={errors.salesPph23} inputRef={(node) => { fieldRefs.current.salesPph23 = node; }} onChange={(value) => { onFieldChange("salesPph23", value); onFieldChange("isSalesPphManual", true); }} />
            <Button type="button" variant="link" size="sm" className="mt-1 px-0" onClick={() => { onFieldChange("isSalesPphManual", false); onFieldChange("salesPph23", ""); }}>Gunakan otomatis</Button>
          </div>
          <ReadOnlyField label="Total Penjualan" value={formatRupiah(preview.salesTotal)} />
          <ReadOnlyField label="Estimasi Margin" value={formatRupiah(preview.estimatedMargin)} />
        </CardContent>
      ) : null}
    </Card>
  );
}

function SummaryCard({ preview }: { preview: FinancialPreview }) {
  return (
    <Card>
      <CardHeader><CardTitle>Ringkasan</CardTitle><CardDescription>Record dimulai sebagai Belum Dibayar ke Mitra.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        <SummaryLine label="Total Pembelian" value={formatRupiah(preview.purchaseTotal)} />
        {preview.hasSales ? <SummaryLine label="Total Penjualan" value={formatRupiah(preview.salesTotal)} /> : null}
        {preview.hasSales ? <SummaryLine label="Estimasi Margin" value={formatRupiah(preview.estimatedMargin)} /> : null}
        <SummaryLine label="Status Awal" value="Belum Dibayar ke Mitra" />
        <p className="text-xs text-muted-foreground">Nomor DO, ID, total, dan status akhir saat simpan mengikuti store/domain helpers.</p>
      </CardContent>
    </Card>
  );
}

function FormInput({ label, value, onChange, error, required, optional, type = "text", inputMode, suffix, inputRef }: { label: string; value: string; onChange: (value: string) => void; error?: string; required?: boolean; optional?: boolean; type?: "text" | "date"; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; suffix?: string; inputRef?: (node: HTMLInputElement | null) => void }) {
  return (
    <label className="block text-sm font-medium">
      <span className="flex items-center gap-2">{label}{required ? <span className="text-destructive">*</span> : null}{optional ? <span className="text-xs font-normal text-muted-foreground">Opsional</span> : null}</span>
      <span className="relative mt-2 block">
        <input ref={inputRef} type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} className={cn("h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30", suffix ? "pr-12" : "", error ? "border-destructive focus:border-destructive" : "")} />
        {suffix ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span> : null}
      </span>
      {error ? <span className="mt-1 block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <div><p className="text-sm font-medium">{label}</p><p className="mt-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{value}</p></div>;
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 border-b pb-2 last:border-0"><span className="text-sm text-muted-foreground">{label}</span><span className="text-right text-sm font-semibold">{value}</span></div>;
}

interface FinancialPreview {
  autoPartnerPph23: number;
  partnerPph23: number;
  purchaseTotal: number;
  hasSales: boolean;
  autoSalesPph23: number;
  salesPph23: number;
  salesTotal: number;
  estimatedMargin: number;
}

function getFinancialPreview(form: DeliveryOrderFormState): FinancialPreview {
  const transportPrice = toNumber(form.transportPrice);
  const roadMoney = toNumber(form.roadMoney);
  const gasMoney = toNumber(form.gasMoney);
  const sellingPrice = toNumber(form.sellingPrice);
  const salesGasMoney = toNumber(form.salesGasMoney);
  const autoPartnerPph23 = calculatePartnerPph23(transportPrice);
  const partnerPph23 = form.isPartnerPphManual ? toNumber(form.partnerPph23) : autoPartnerPph23;
  const purchaseTotal = calculatePurchaseTotal({ transportPrice, roadMoney, gasMoney, partnerPph23 });
  const hasSales = form.sellingPrice.trim() !== "" || salesGasMoney > 0;
  const autoSalesPph23 = calculateSalesPph23(sellingPrice);
  const salesPph23 = form.isSalesPphManual ? toNumber(form.salesPph23) : autoSalesPph23;
  const salesTotal = calculateSalesTotal({ sellingPrice, salesGasMoney, salesPph23 });
  const estimatedMargin = calculateEstimatedGrossMargin({ purchaseTotal, salesTotal });

  return { autoPartnerPph23, partnerPph23, purchaseTotal, hasSales, autoSalesPph23, salesPph23, salesTotal, estimatedMargin };
}

function toNumber(value: string): number {
  return Number(value.replace(/,/g, ".")) || 0;
}

function validatePositiveNumber(value: string, label: string, field: FieldKey, errors: FieldErrors) {
  if (value.trim() === "" || toNumber(value) <= 0) errors[field] = `${label} harus lebih dari 0.`;
}

function validateNonNegativeNumber(value: string, label: string, field: FieldKey, errors: FieldErrors) {
  if (value.trim() !== "" && toNumber(value) < 0) errors[field] = `${label} tidak boleh negatif.`;
}

function getErrorList(errors: FieldErrors): string[] {
  return Object.values(errors).filter(Boolean) as string[];
}
