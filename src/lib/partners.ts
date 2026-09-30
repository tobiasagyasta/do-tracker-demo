import type { Partner } from "@/types/partner";

export interface CreatePartnerInput {
  name: string;
  companyType: string;
  taxNumber: string;
  phone: string;
  email: string;
  address: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  contactPerson: string;
  contactPersonPhone: string;
  isActive: boolean;
}

export function filterPartners(partners: Partner[], search: string): Partner[] {
  const query = search.trim().toLocaleLowerCase("id-ID");

  if (query === "") {
    return partners;
  }

  return partners.filter((partner) =>
    [partner.code, partner.name, partner.contactPerson, partner.phone].some(
      (value) => value?.toLocaleLowerCase("id-ID").includes(query),
    ),
  );
}

export function getNextPartnerCode(partners: Partner[]): string {
  const nextNumber =
    partners.reduce((highest, partner) => {
      const numericCode = Number(partner.code.replace("MTR-", ""));

      return Number.isNaN(numericCode) ? highest : Math.max(highest, numericCode);
    }, 0) + 1;

  return `MTR-${String(nextNumber).padStart(3, "0")}`;
}

export function createPartnerFromInput(
  partners: Partner[],
  input: CreatePartnerInput,
): Partner {
  const code = getNextPartnerCode(partners);

  return {
    id: `partner-${Date.now()}`,
    code,
    name: input.name.trim(),
    companyType: input.companyType.trim() || undefined,
    taxNumber: input.taxNumber.trim() || undefined,
    phone: input.phone.trim() || undefined,
    email: input.email.trim() || undefined,
    address: input.address.trim() || undefined,
    bankName: input.bankName.trim() || undefined,
    bankAccountNumber: input.bankAccountNumber.trim() || undefined,
    bankAccountHolder: input.bankAccountHolder.trim() || undefined,
    contactPerson: input.contactPerson.trim() || undefined,
    contactPersonPhone: input.contactPersonPhone.trim() || undefined,
    isActive: input.isActive,
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
