"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Plus, Search, Trash2 } from "lucide-react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

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
import { formatTonnage } from "@/lib/delivery-orders";
import {
  generateNextDeliveryOrderNumber,
  normalizeVehiclePlate,
} from "@/lib/delivery-order-creation";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  selectDeliveryOrderTransactions,
  selectDeliveryOrderDraft,
  selectDeliveryOrders,
  selectHasHydrated,
  selectPartners,
  selectSaveDeliveryOrderDraft,
  selectClearDeliveryOrderDraft,
} from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";
import type { CreateDeliveryOrderWithTransactionsInput } from "@/types/delivery-order";
import type { Partner } from "@/types/partner";

type SubmitMode = "detail" | "again";
type ParentField =
  | "customerName"
  | "partnerId"
  | "originMine"
  | "destinationPort"
  | "salesRatePerTon"
  | "roadMoney"
  | "partnerRatePerTon"
  | "gasMoney";
type TransactionField =
  | "transactionNumber"
  | "truckPlate"
  | "driverName"
  | "loadingDate"
  | "unloadingDate"
  | "loadingLocation"
  | "unloadingLocation"
  | "tonnage"
  | "category"
  | "salesRatePerTon"
  | "roadMoney"
  | "partnerRatePerTon"
  | "gasMoney";
type DefaultRateField = Extract<
  ParentField,
  "salesRatePerTon" | "roadMoney" | "partnerRatePerTon" | "gasMoney"
>;

interface FormState {
  customerName: string;
  partnerId: string;
  originMine: string;
  destinationPort: string;
  salesRatePerTon: string;
  roadMoney: string;
  partnerRatePerTon: string;
  gasMoney: string;
}

interface TransactionRow {
  clientId: string;
  transactionNumber: string;
  truckPlate: string;
  driverName: string;
  loadingDate: string;
  unloadingDate: string;
  loadingLocation: string;
  unloadingLocation: string;
  tonnage: string;
  category: string;
  salesRatePerTon: string;
  roadMoney: string;
  partnerRatePerTon: string;
  gasMoney: string;
}

type FieldErrors = Partial<Record<ParentField, string>>;
type TransactionErrors = Record<string, Partial<Record<TransactionField, string>>>;

const today = new Date().toISOString().slice(0, 10);

const initialForm: FormState = {
  customerName: "",
  partnerId: "",
  originMine: "",
  destinationPort: "",
  salesRatePerTon: "",
  roadMoney: "0",
  partnerRatePerTon: "",
  gasMoney: "0",
};

export function DeliveryOrderCreateFormStore() {
  const router = useRouter();
  const hasHydrated = useDemoStore(selectHasHydrated);
  const orders = useDemoStore(selectDeliveryOrders);
  const existingTransactions = useDemoStore(selectDeliveryOrderTransactions);
  const partners = useDemoStore(selectPartners);
  const persistedDraft = useDemoStore(selectDeliveryOrderDraft);
  const saveDeliveryOrderDraft = useDemoStore(selectSaveDeliveryOrderDraft);
  const clearDeliveryOrderDraft = useDemoStore(selectClearDeliveryOrderDraft);
  const createDeliveryOrderWithTransactions = useDemoStore(
    (state) => state.createDeliveryOrderWithTransactions,
  );
  const [form, setForm] = useState<FormState>(initialForm);
  const [rows, setRows] = useState<TransactionRow[]>(() => [createEmptyRow(initialForm)]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [transactionErrors, setTransactionErrors] = useState<TransactionErrors>({});
  const [partnerSearch, setPartnerSearch] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitMode, setSubmitMode] = useState<SubmitMode | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const quickCreateTriggerRef = useRef<HTMLButtonElement | null>(null);
  const pendingFocusRowId = useRef<string | null>(null);
  const skipNextDraftSave = useRef(false);

  useEffect(() => {
    if (!pendingFocusRowId.current) return;
    document
      .querySelector<HTMLInputElement>(
        `[data-row-id="${pendingFocusRowId.current}"][data-transaction-field="transactionNumber"]`,
      )
      ?.focus();
    pendingFocusRowId.current = null;
  }, [rows.length]);

  const activePartners = useMemo(
    () => partners.filter((partner) => partner.isActive),
    [partners],
  );
  const filteredPartners = useMemo(() => {
    const query = partnerSearch.trim().toLocaleLowerCase("id-ID");
    return query === ""
      ? activePartners
      : activePartners.filter((partner) =>
          [partner.name, partner.code].some((value) =>
            value.toLocaleLowerCase("id-ID").includes(query),
          ),
        );
  }, [activePartners, partnerSearch]);
  const selectedPartner = partners.find((partner) => partner.id === form.partnerId);
  const lastOrder = orders[0];
  const doNumberPreview = generateNextDeliveryOrderNumber(orders);
  const totals = calculateTotals(rows);
  const errorList = getErrorList(errors, transactionErrors);

  useEffect(() => {
    if (!hasHydrated) return;

    if (skipNextDraftSave.current) {
      skipNextDraftSave.current = false;
      return;
    }

    const handle = window.setTimeout(() => {
      if (isEmptyDraft(form, rows)) return;
      saveDeliveryOrderDraft({ ...form, transactions: rows, updatedAt: new Date().toISOString() });
    }, 500);

    return () => window.clearTimeout(handle);
  }, [form, hasHydrated, rows, saveDeliveryOrderDraft]);

  if (!hasHydrated) {
    return <StoreLoading />;
  }

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => {
      if (isDefaultRateField(key)) {
        const previousDefault = current[key];
        setRows((currentRows) =>
          currentRows.map((row) =>
            shouldUseUpdatedDefault(row[key], previousDefault)
              ? { ...row, [key]: value }
              : row,
          ),
        );
      }

      return { ...current, [key]: value };
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function updateTransactionField(
    rowId: string,
    field: TransactionField,
    value: string,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.clientId === rowId
          ? {
              ...row,
              [field]: field === "truckPlate" ? value.toUpperCase() : value,
            }
          : row,
      ),
    );
    setTransactionErrors((current) => ({
      ...current,
      [rowId]: { ...current[rowId], [field]: undefined },
    }));
  }

  function addRow() {
    const row = createEmptyRow(form);
    pendingFocusRowId.current = row.clientId;
    setRows((current) => [...current, row]);
  }

  function restoreDraft() {
    if (!persistedDraft) return;

    const partnerStillExists = partners.some((partner) => partner.id === persistedDraft.partnerId);
    setForm({
      customerName: persistedDraft.customerName,
      partnerId: partnerStillExists ? persistedDraft.partnerId : "",
      originMine: persistedDraft.originMine,
      destinationPort: persistedDraft.destinationPort,
      salesRatePerTon: persistedDraft.salesRatePerTon,
      roadMoney: persistedDraft.roadMoney,
      partnerRatePerTon: persistedDraft.partnerRatePerTon,
      gasMoney: persistedDraft.gasMoney,
    });
    setRows(persistedDraft.transactions.length > 0 ? persistedDraft.transactions : [createEmptyRow(persistedDraft)]);
    setPartnerSearch(partnerStillExists ? partners.find((partner) => partner.id === persistedDraft.partnerId)?.name ?? "" : "");
    setErrors(partnerStillExists ? {} : { partnerId: "Mitra di draft sudah tidak tersedia. Pilih mitra baru." });
    setDraftMessage(partnerStillExists ? "Draft dipulihkan." : "Draft dipulihkan, tetapi mitra lama tidak tersedia.");
  }

  function discardDraft() {
    skipNextDraftSave.current = true;
    clearDeliveryOrderDraft();
    setDraftMessage("Draft dihapus.");
  }

  function useLastOrderTemplate() {
    if (!lastOrder) return;
    const nextForm: FormState = {
      customerName: lastOrder.customerName,
      partnerId: partners.find((partner) => partner.name === lastOrder.partnerName)?.id ?? "",
      originMine: lastOrder.originMine,
      destinationPort: lastOrder.destinationPort,
      salesRatePerTon: String(lastOrder.defaultRates?.salesRatePerTon ?? ""),
      roadMoney: String(lastOrder.defaultRates?.roadMoney ?? 0),
      partnerRatePerTon: String(lastOrder.defaultRates?.partnerRatePerTon ?? ""),
      gasMoney: String(lastOrder.defaultRates?.gasMoney ?? 0),
    };
    setForm(nextForm);
    setPartnerSearch(partners.find((partner) => partner.id === nextForm.partnerId)?.name ?? "");
    setRows([createEmptyRow(nextForm)]);
    setDraftMessage("Template DO terakhir digunakan. Nilai yang dipertahankan: tambang, mitra, origin, destination, dan default tarif.");
  }

  function duplicateLastTransactionTemplate() {
    if (!lastOrder) return;
    const lastTransaction = existingTransactions.find(
      (transaction) => transaction.deliveryOrderId === lastOrder.id,
    );
    if (!lastTransaction) return;

    const row: TransactionRow = {
      clientId: createRowId(),
      transactionNumber: "",
      truckPlate: "",
      driverName: "",
      loadingDate: "",
      unloadingDate: "",
      loadingLocation: lastTransaction.loadingLocation,
      unloadingLocation: lastTransaction.unloadingLocation,
      tonnage: "",
      category: lastTransaction.category ?? "",
      salesRatePerTon: String(lastTransaction.salesRatePerTon),
      roadMoney: String(lastTransaction.roadMoney),
      partnerRatePerTon: String(lastTransaction.partnerRatePerTon),
      gasMoney: String(lastTransaction.gasMoney),
    };

    setRows((current) => [...current, row]);
    setDraftMessage("Satu template transaksi ditambahkan. Nilai unik seperti SPB, truck, supir, tanggal, tonase, invoice, dan pembayaran dikosongkan.");
  }

  function duplicateRow(row: TransactionRow) {
    const nextRow: TransactionRow = {
      ...row,
      clientId: createRowId(),
      transactionNumber: "",
      loadingDate: "",
      unloadingDate: "",
    };
    pendingFocusRowId.current = nextRow.clientId;
    setRows((current) => [...current, nextRow]);
  }

  function removeRow(row: TransactionRow) {
    if (rows.length === 1) {
      setTransactionErrors((current) => ({
        ...current,
        [row.clientId]: { transactionNumber: "Minimal satu transaksi wajib diisi." },
      }));
      return;
    }

    if (isNonEmptyRow(row) && !window.confirm("Hapus transaksi yang sudah berisi data?")) {
      return;
    }

    setRows((current) => current.filter((candidate) => candidate.clientId !== row.clientId));
  }

  function validateForm(): { parent: FieldErrors; transactions: TransactionErrors } {
    const nextErrors: FieldErrors = {};
    const nextTransactionErrors: TransactionErrors = {};
    const existingNumbers = new Set(
      existingTransactions.map((transaction) =>
        transaction.transactionNumber.trim().toLocaleLowerCase("id-ID"),
      ),
    );
    const seenNumbers = new Set<string>();

    if (form.customerName.trim() === "") nextErrors.customerName = "Tambang wajib diisi.";
    if (form.partnerId === "") nextErrors.partnerId = "Mitra wajib dipilih.";
    if (form.originMine.trim() === "") nextErrors.originMine = "Lokasi asal wajib diisi.";
    if (form.destinationPort.trim() === "") nextErrors.destinationPort = "Lokasi tujuan wajib diisi.";
    validatePositiveNumber(form.salesRatePerTon, "Tarif jual per ton", "salesRatePerTon", nextErrors);
    validateNonNegativeNumber(form.roadMoney, "Uang jalan", "roadMoney", nextErrors);
    validateNonNegativeNumber(form.partnerRatePerTon, "Tarif mitra per ton", "partnerRatePerTon", nextErrors);
    validateNonNegativeNumber(form.gasMoney, "Uang gas", "gasMoney", nextErrors);

    rows.forEach((row) => {
      const rowErrors: Partial<Record<TransactionField, string>> = {};
      const numberKey = row.transactionNumber.trim().toLocaleLowerCase("id-ID");

      if (row.transactionNumber.trim() === "") {
        rowErrors.transactionNumber = "No SPB wajib diisi.";
      } else if (seenNumbers.has(numberKey) || existingNumbers.has(numberKey)) {
        rowErrors.transactionNumber = "No SPB sudah dipakai.";
      }

      seenNumbers.add(numberKey);
      if (row.truckPlate.trim() === "") rowErrors.truckPlate = "No polisi wajib diisi.";
      if (row.driverName.trim() === "") rowErrors.driverName = "Supir wajib diisi.";
      if (row.loadingDate.trim() === "") rowErrors.loadingDate = "Tanggal muat wajib diisi.";
      if (row.unloadingDate && row.loadingDate && row.unloadingDate < row.loadingDate) {
        rowErrors.unloadingDate = "Tanggal bongkar tidak boleh sebelum muat.";
      }
      validatePositiveNumber(row.tonnage, "Tonase", "tonnage", rowErrors);
      validatePositiveNumber(row.salesRatePerTon, "Tarif jual", "salesRatePerTon", rowErrors);
      validateNonNegativeNumber(row.roadMoney, "Uang jalan", "roadMoney", rowErrors);
      validateNonNegativeNumber(row.partnerRatePerTon, "Tarif mitra", "partnerRatePerTon", rowErrors);
      validateNonNegativeNumber(row.gasMoney, "Uang gas", "gasMoney", rowErrors);

      if (Object.keys(rowErrors).length > 0) {
        nextTransactionErrors[row.clientId] = rowErrors;
      }
    });

    return { parent: nextErrors, transactions: nextTransactionErrors };
  }

  function handleSubmit(mode: SubmitMode) {
    if (submitMode) return;

    setSubmitAttempted(true);
    const nextErrors = validateForm();
    setErrors(nextErrors.parent);
    setTransactionErrors(nextErrors.transactions);

    if (
      Object.keys(nextErrors.parent).length > 0 ||
      Object.keys(nextErrors.transactions).length > 0
    ) {
      focusFirstInvalid(nextErrors.parent, nextErrors.transactions);
      return;
    }

    const input = buildInput({
      form,
      rows,
      doNumber: doNumberPreview,
      partnerName: selectedPartner?.name ?? "",
    });

    setSubmitMode(mode);
    const result = createDeliveryOrderWithTransactions(input);

    if (!result.ok) {
      setSubmitMode(null);
      setErrors((current) => ({
        ...current,
        customerName: result.reason === "duplicate-transaction-number" ? undefined : current.customerName,
      }));
      setSuccessMessage(`Gagal menyimpan: ${result.reason}`);
      return;
    }

    if (mode === "detail") {
      clearDeliveryOrderDraft();
      startTransition(() => router.push(`/delivery-orders/${result.record.id}`));
      return;
    }

    clearDeliveryOrderDraft();
    setForm((current) => ({
      ...initialForm,
      partnerId: current.partnerId,
      customerName: current.customerName,
      originMine: current.originMine,
      destinationPort: current.destinationPort,
      salesRatePerTon: current.salesRatePerTon,
      roadMoney: current.roadMoney,
      partnerRatePerTon: current.partnerRatePerTon,
      gasMoney: current.gasMoney,
    }));
    setRows([createEmptyRow(form)]);
    setErrors({});
    setTransactionErrors({});
    setSubmitAttempted(false);
    setSubmitMode(null);
    setSuccessMessage(`${result.record.doNumber} tersimpan dengan ${rows.length} transaksi.`);
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
          Buat satu parent DO dengan satu atau lebih transaksi angkutan dalam satu halaman.
        </p>
      </div>

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          {successMessage}
        </div>
      ) : null}

      {persistedDraft ? (
        <div className="rounded-md border bg-card px-4 py-3 text-sm shadow-sm">
          <p className="font-medium">Draft Delivery Order tersedia</p>
          <p className="mt-1 text-muted-foreground">Draft terakhir disimpan {formatDraftTime(persistedDraft.updatedAt)}. Draft tidak dipulihkan otomatis.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={restoreDraft}>Lanjutkan Draft</Button>
            <Button type="button" size="sm" variant="outline" onClick={discardDraft}>Hapus Draft</Button>
          </div>
        </div>
      ) : null}

      {lastOrder ? (
        <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm">
          <p className="font-medium">Repeat entry dari DO terakhir</p>
          <p className="mt-1 text-muted-foreground">Retain: tambang, mitra, origin, destination, dan default tarif. Tidak menyalin SPB, tanggal, transaksi, invoice, atau pembayaran.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={useLastOrderTemplate}>Gunakan Template DO Terakhir</Button>
            <Button type="button" size="sm" variant="outline" onClick={duplicateLastTransactionTemplate}>Duplikat Satu Baris Transaksi</Button>
          </div>
        </div>
      ) : null}

      {draftMessage ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
          {draftMessage}
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
          <ParentInfoSection
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
          />
          <DefaultRateSection form={form} errors={errors} onFieldChange={updateField} />
          <TransactionSection
            form={form}
            rows={rows}
            errors={transactionErrors}
            onAddRow={addRow}
            onDuplicateRow={duplicateRow}
            onRemoveRow={removeRow}
            onFieldChange={updateTransactionField}
          />
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SummaryCard totals={totals} />
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

function ParentInfoSection({
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
}: {
  form: FormState;
  errors: FieldErrors;
  doNumberPreview: string;
  partnerSearch: string;
  partners: Partner[];
  selectedPartner?: Partner;
  onPartnerSearchChange: (value: string) => void;
  onFieldChange: <Key extends keyof FormState>(key: Key, value: FormState[Key]) => void;
  onOpenQuickCreate: () => void;
  quickCreateTriggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>A. Informasi Delivery Order</CardTitle>
        <CardDescription>Nomor DO otomatis dibuat saat data disimpan.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <ReadOnlyField label="No DO" value={doNumberPreview} />
        <FormInput field="customerName" label="Tambang" required value={form.customerName} error={errors.customerName} onChange={(value) => onFieldChange("customerName", value)} />
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">
            Mitra <span className="text-destructive">*</span>
            <span className="relative mt-2 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input data-field="partnerId" value={partnerSearch} onChange={(event) => onPartnerSearchChange(event.target.value)} className={cn("h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30", errors.partnerId ? "border-destructive" : "")} aria-invalid={Boolean(errors.partnerId)} />
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
        <FormInput field="originMine" label="Origin" required value={form.originMine} error={errors.originMine} onChange={(value) => onFieldChange("originMine", value)} />
        <FormInput field="destinationPort" label="Destination" required value={form.destinationPort} error={errors.destinationPort} onChange={(value) => onFieldChange("destinationPort", value)} />
      </CardContent>
    </Card>
  );
}

function DefaultRateSection({ form, errors, onFieldChange }: {
  form: FormState;
  errors: FieldErrors;
  onFieldChange: <Key extends keyof FormState>(key: Key, value: FormState[Key]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>B. Default Tarif</CardTitle>
        <CardDescription>Baris transaksi baru mewarisi nilai ini dan tetap bisa diedit.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <FormInput field="salesRatePerTon" label="Tarif Jual / Ton" required inputMode="numeric" value={form.salesRatePerTon} error={errors.salesRatePerTon} onChange={(value) => onFieldChange("salesRatePerTon", value)} />
        <FormInput field="roadMoney" label="Uang Jalan / Rit" required inputMode="numeric" value={form.roadMoney} error={errors.roadMoney} onChange={(value) => onFieldChange("roadMoney", value)} />
        <FormInput field="partnerRatePerTon" label="Tarif Mitra / Ton" optional inputMode="numeric" value={form.partnerRatePerTon} error={errors.partnerRatePerTon} onChange={(value) => onFieldChange("partnerRatePerTon", value)} />
        <FormInput field="gasMoney" label="Uang Gas" optional inputMode="numeric" value={form.gasMoney} error={errors.gasMoney} onChange={(value) => onFieldChange("gasMoney", value)} />
      </CardContent>
    </Card>
  );
}

function TransactionSection({
  form,
  rows,
  errors,
  onAddRow,
  onDuplicateRow,
  onRemoveRow,
  onFieldChange,
}: {
  form: FormState;
  rows: TransactionRow[];
  errors: TransactionErrors;
  onAddRow: () => void;
  onDuplicateRow: (row: TransactionRow) => void;
  onRemoveRow: (row: TransactionRow) => void;
  onFieldChange: (rowId: string, field: TransactionField, value: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>C. Transaksi Angkutan</CardTitle>
          <CardDescription>Minimal satu transaksi. Gunakan duplikat untuk entri truck berulang.</CardDescription>
        </div>
        <Button type="button" variant="outline" onClick={onAddRow}><Plus />Tambah Baris</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row, index) => (
          <TransactionCard
            key={row.clientId}
            index={index}
            form={form}
            row={row}
            errors={errors[row.clientId] ?? {}}
            onDuplicate={() => onDuplicateRow(row)}
            onRemove={() => onRemoveRow(row)}
            onFieldChange={(field, value) => onFieldChange(row.clientId, field, value)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function TransactionCard({
  index,
  form,
  row,
  errors,
  onDuplicate,
  onRemove,
  onFieldChange,
}: {
  index: number;
  form: FormState;
  row: TransactionRow;
  errors: Partial<Record<TransactionField, string>>;
  onDuplicate: () => void;
  onRemove: () => void;
  onFieldChange: (field: TransactionField, value: string) => void;
}) {
  return (
    <section className="rounded-lg border bg-muted/20 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Transaksi #{index + 1}</p>
          <p className="text-xs text-muted-foreground">Override ditandai jika berbeda dari default tarif.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onDuplicate}><Copy />Duplikat</Button>
          <Button type="button" variant="outline" size="sm" onClick={onRemove}><Trash2 />Hapus</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TransactionInput rowId={row.clientId} field="transactionNumber" label="No SPB / Transaksi" required value={row.transactionNumber} error={errors.transactionNumber} onChange={(value) => onFieldChange("transactionNumber", value)} />
        <TransactionInput rowId={row.clientId} field="truckPlate" label="No Polisi" required value={row.truckPlate} error={errors.truckPlate} onChange={(value) => onFieldChange("truckPlate", value)} />
        <TransactionInput rowId={row.clientId} field="driverName" label="Supir" required value={row.driverName} error={errors.driverName} onChange={(value) => onFieldChange("driverName", value)} />
        <TransactionInput rowId={row.clientId} field="loadingDate" label="Tanggal Muat" required type="date" value={row.loadingDate} error={errors.loadingDate} onChange={(value) => onFieldChange("loadingDate", value)} />
        <TransactionInput rowId={row.clientId} field="unloadingDate" label="Tanggal Bongkar" optional type="date" value={row.unloadingDate} error={errors.unloadingDate} onChange={(value) => onFieldChange("unloadingDate", value)} />
        <TransactionInput rowId={row.clientId} field="tonnage" label="Tonase" required suffix="ton" inputMode="decimal" value={row.tonnage} error={errors.tonnage} onChange={(value) => onFieldChange("tonnage", value)} />
        <TransactionInput rowId={row.clientId} field="loadingLocation" label="Lokasi Muat" optional placeholder={form.originMine || "Default origin"} value={row.loadingLocation} error={errors.loadingLocation} onChange={(value) => onFieldChange("loadingLocation", value)} />
        <TransactionInput rowId={row.clientId} field="unloadingLocation" label="Lokasi Bongkar" optional placeholder={form.destinationPort || "Default destination"} value={row.unloadingLocation} error={errors.unloadingLocation} onChange={(value) => onFieldChange("unloadingLocation", value)} />
        <TransactionInput rowId={row.clientId} field="category" label="Kategori" optional value={row.category} error={errors.category} onChange={(value) => onFieldChange("category", value)} />
        <TransactionInput rowId={row.clientId} field="salesRatePerTon" label="Tarif Jual / Ton" required inputMode="numeric" value={row.salesRatePerTon} error={errors.salesRatePerTon} isOverride={isOverride(row.salesRatePerTon, form.salesRatePerTon)} onChange={(value) => onFieldChange("salesRatePerTon", value)} />
        <TransactionInput rowId={row.clientId} field="roadMoney" label="Uang Jalan" required inputMode="numeric" value={row.roadMoney} error={errors.roadMoney} isOverride={isOverride(row.roadMoney, form.roadMoney)} onChange={(value) => onFieldChange("roadMoney", value)} />
        <TransactionInput rowId={row.clientId} field="partnerRatePerTon" label="Tarif Mitra / Ton" optional inputMode="numeric" value={row.partnerRatePerTon} error={errors.partnerRatePerTon} isOverride={isOverride(row.partnerRatePerTon, form.partnerRatePerTon)} onChange={(value) => onFieldChange("partnerRatePerTon", value)} />
        <TransactionInput rowId={row.clientId} field="gasMoney" label="Uang Gas" optional inputMode="numeric" value={row.gasMoney} error={errors.gasMoney} isOverride={isOverride(row.gasMoney, form.gasMoney)} onChange={(value) => onFieldChange("gasMoney", value)} />
      </div>
    </section>
  );
}

function SummaryCard({ totals }: { totals: Totals }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>D. Ringkasan</CardTitle>
        <CardDescription>Estimasi berdasarkan baris transaksi saat ini.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <SummaryLine label="Jumlah Transaksi" value={`${totals.count}`} />
        <SummaryLine label="Total Tonase" value={formatTonnage(totals.tonnage)} />
        <SummaryLine label="Estimasi Tagihan Customer" value={formatRupiah(totals.customerAmount)} />
        <SummaryLine label="Estimasi Pembayaran Mitra" value={formatRupiah(totals.partnerAmount)} />
        <p className="text-xs text-muted-foreground">Estimasi customer = tonase x tarif jual + uang jalan. Estimasi mitra = tonase x tarif mitra + uang gas.</p>
      </CardContent>
    </Card>
  );
}

function FormInput({ field, label, value, onChange, error, required, optional, inputMode }: { field: ParentField; label: string; value: string; onChange: (value: string) => void; error?: string; required?: boolean; optional?: boolean; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }) {
  return (
    <label className="block text-sm font-medium">
      <span className="flex items-center gap-2">{label}{required ? <span className="text-destructive">*</span> : null}{optional ? <span className="text-xs font-normal text-muted-foreground">Opsional</span> : null}</span>
      <input data-field={field} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} className={cn("mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30", error ? "border-destructive focus:border-destructive" : "")} />
      {error ? <span className="mt-1 block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

function TransactionInput({ rowId, field, label, value, onChange, error, required, optional, type = "text", inputMode, suffix, placeholder, isOverride }: { rowId: string; field: TransactionField; label: string; value: string; onChange: (value: string) => void; error?: string; required?: boolean; optional?: boolean; type?: "text" | "date"; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; suffix?: string; placeholder?: string; isOverride?: boolean }) {
  return (
    <label className="block text-sm font-medium">
      <span className="flex items-center gap-2">{label}{required ? <span className="text-destructive">*</span> : null}{optional ? <span className="text-xs font-normal text-muted-foreground">Opsional</span> : null}{isOverride ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">Override</span> : null}</span>
      <span className="relative mt-2 block">
        <input data-row-id={rowId} data-transaction-field={field} type={type} inputMode={inputMode} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} className={cn("h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30", suffix ? "pr-12" : "", error ? "border-destructive focus:border-destructive" : "")} />
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

interface Totals {
  count: number;
  tonnage: number;
  customerAmount: number;
  partnerAmount: number;
}

function createRowId(): string {
  return `trx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyRow(form: FormState): TransactionRow {
  return {
    clientId: createRowId(),
    transactionNumber: "",
    truckPlate: "",
    driverName: "",
    loadingDate: today,
    unloadingDate: "",
    loadingLocation: "",
    unloadingLocation: "",
    tonnage: "",
    category: "",
    salesRatePerTon: form.salesRatePerTon,
    roadMoney: form.roadMoney,
    partnerRatePerTon: form.partnerRatePerTon,
    gasMoney: form.gasMoney,
  };
}

function calculateTotals(rows: TransactionRow[]): Totals {
  return rows.reduce<Totals>((totals, row) => {
    const tonnage = toNumber(row.tonnage);
    return {
      count: totals.count + 1,
      tonnage: totals.tonnage + tonnage,
      customerAmount: totals.customerAmount + tonnage * toNumber(row.salesRatePerTon) + toNumber(row.roadMoney),
      partnerAmount: totals.partnerAmount + tonnage * toNumber(row.partnerRatePerTon) + toNumber(row.gasMoney),
    };
  }, { count: 0, tonnage: 0, customerAmount: 0, partnerAmount: 0 });
}

function buildInput({ form, rows, doNumber, partnerName }: { form: FormState; rows: TransactionRow[]; doNumber: string; partnerName: string; }): CreateDeliveryOrderWithTransactionsInput {
  const parentId = `do-${Date.now()}`;
  return {
    parent: {
      id: parentId,
      doNumber,
      customerName: form.customerName.trim(),
      partnerName,
      originMine: form.originMine.trim(),
      destinationPort: form.destinationPort.trim(),
      defaultRates: {
        salesRatePerTon: toNumber(form.salesRatePerTon),
        roadMoney: toNumber(form.roadMoney),
        partnerRatePerTon: toNumber(form.partnerRatePerTon),
        gasMoney: toNumber(form.gasMoney),
      },
    },
    transactions: rows.map((row) => ({
      id: `trx-${Date.now()}-${row.clientId}`,
      deliveryOrderId: parentId,
      transactionNumber: row.transactionNumber.trim(),
      truckPlate: normalizeVehiclePlate(row.truckPlate),
      driverName: row.driverName.trim(),
      loadingDate: row.loadingDate,
      unloadingDate: row.unloadingDate || undefined,
      loadingLocation: row.loadingLocation.trim() || form.originMine.trim(),
      unloadingLocation: row.unloadingLocation.trim() || form.destinationPort.trim(),
      tonnage: toNumber(row.tonnage),
      category: row.category.trim() || undefined,
      salesRatePerTon: toNumber(row.salesRatePerTon),
      roadMoney: toNumber(row.roadMoney),
      partnerRatePerTon: toNumber(row.partnerRatePerTon),
      gasMoney: toNumber(row.gasMoney),
    })),
  };
}

function toNumber(value: string): number {
  return Number(value.replace(/,/g, ".")) || 0;
}

function isOverride(value: string, defaultValue: string): boolean {
  return value.trim() !== "" && value.trim() !== defaultValue.trim();
}

function isDefaultRateField(field: keyof FormState): field is DefaultRateField {
  return (
    field === "salesRatePerTon" ||
    field === "roadMoney" ||
    field === "partnerRatePerTon" ||
    field === "gasMoney"
  );
}

function shouldUseUpdatedDefault(rowValue: string, previousDefault: string): boolean {
  return rowValue.trim() === "" || rowValue.trim() === previousDefault.trim();
}

function isNonEmptyRow(row: TransactionRow): boolean {
  return Object.entries(row).some(([key, value]) => key !== "clientId" && String(value).trim() !== "");
}

function isEmptyDraft(form: FormState, rows: TransactionRow[]): boolean {
  const parentIsEmpty = Object.entries(form).every(([key, value]) => {
    if (key === "roadMoney" || key === "gasMoney") return value === "0" || value === "";
    return String(value).trim() === "";
  });

  return parentIsEmpty && rows.every((row) => !isNonEmptyRow(row));
}

function formatDraftTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sebelumnya";
  return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function validatePositiveNumber<T extends string>(value: string, label: string, field: T, errors: Partial<Record<T, string>>) {
  if (value.trim() === "" || toNumber(value) <= 0) errors[field] = `${label} harus lebih dari 0.`;
}

function validateNonNegativeNumber<T extends string>(value: string, label: string, field: T, errors: Partial<Record<T, string>>) {
  if (value.trim() !== "" && toNumber(value) < 0) errors[field] = `${label} tidak boleh negatif.`;
}

function getErrorList(errors: FieldErrors, transactionErrors: TransactionErrors): string[] {
  return [
    ...Object.values(errors).filter(Boolean),
    ...Object.entries(transactionErrors).flatMap(([rowId, rowErrors]) =>
      Object.values(rowErrors).filter(Boolean).map((error) => `${rowId}: ${error}`),
    ),
  ] as string[];
}

function focusFirstInvalid(errors: FieldErrors, transactionErrors: TransactionErrors) {
  const firstField = Object.keys(errors)[0];
  if (firstField) {
    document.querySelector<HTMLElement>(`[data-field="${firstField}"]`)?.focus();
    return;
  }

  const firstTransaction = Object.entries(transactionErrors)[0];
  if (!firstTransaction) return;
  const [rowId, rowErrors] = firstTransaction;
  const firstTransactionField = Object.keys(rowErrors)[0];
  document
    .querySelector<HTMLElement>(
      `[data-row-id="${rowId}"][data-transaction-field="${firstTransactionField}"]`,
    )
    ?.focus();
}
