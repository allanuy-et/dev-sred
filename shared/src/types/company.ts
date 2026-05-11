export interface Company {
  id: string
  name: string
  businessNumber: string | null
  address1: string | null
  address2: string | null
  city: string | null
  province: string | null
  postalCode: string | null
  phone1: string | null
  phone2: string | null
  fax: string | null
  email: string | null
  website: string | null
  fiscalYearEnd: string | null
  financialContact: string | null
  technicalContact: string | null
  timezone: string
  createdAt: string
  updatedAt: string
}
