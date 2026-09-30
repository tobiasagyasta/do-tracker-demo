export interface Partner {
  id: string;
  code: string;
  name: string;
  companyType?: string;
  taxNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  contactPerson?: string;
  contactPersonPhone?: string;
  isActive: boolean;
  createdAt: string;
}
