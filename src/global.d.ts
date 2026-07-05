declare global {
  type ExtractValueOf<T> = T extends string
    ? T
    : { [K in keyof T]: ExtractValueOf<T[K]> }[keyof T]

  interface ErrorResponse {
    message: string
    statusCode: number
  }

  type UserRole = 'ADMIN' | 'LAWYER' | 'CLIENT'

  interface User {
    created_at: string
    email: string
    id: string
    name: string
    role: UserRole
  }

  interface PaginationMeta {
    currentPage: number
    perPage: number
    totalCount: number
    totalPages: number
  }

  type LeadStatus = 'NEW' | 'CONTRACTED' | 'LOST' | 'CONTACTED' | 'QUALIFIED' | 'COMPLETED'

  interface Lead {
    id: string
    name: string
    email: string
    phone: string
    status: LeadStatus
    created_at: string
    updated_at: string
  }

  interface Client {
    id: string
    name: string
    email: string
    phone: string
    marital_status: string
    profession: string
    cpf: string
    rg: string
    issuing_agency: string
    street: string
    number: string
    neighborhood: string
    city: string
    state: string
    zip_code: string
    created_at: string
    updated_at: string
  }

  type CaseStatus = 'OPEN' | 'CLOSED' | 'PENDING'

  interface Case {
    id: string
    title: string
    description: string
    status: CaseStatus
    client_id: string
    assigned_lawyer_id?: string | null
    created_at: string
    updated_at: string
  }

  // A movement/update registered against a case (issue #25).
  interface CaseUpdate {
    id: string
    case_id: string
    date: string
    type: string
    description: string
    created_at: string
    updated_at: string
  }

  interface LeadObservation {
    id: string
    lead_id: string
    description: string
    created_at: string
    updated_at: string
  }

  interface PaymentMethod {
    id: string
    name: string
    description: string | null
    is_active: boolean
    created_at: string
    updated_at: string
  }

  type ContractFeeType = 'FIXED' | 'HOURLY' | 'SUCCESS' | 'MIXED'
  type ContractBillingType = 'ONE_TIME' | 'MONTHLY' | 'INSTALLMENTS'
  type ContractStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'

  interface Contract {
    id: string
    contract_number: string
    lawyer_id: string
    client_id: string
    case_id: string
    signed_at: string
    service_description: string
    fee_type: ContractFeeType
    fee_value: number
    payment_terms: string
    billing_type: ContractBillingType
    installments: number
    first_due_date: string
    grace_days: number
    late_fee_percent: number
    interest_percent_monthly: number
    status: ContractStatus
    created_at: string
    updated_at: string
  }

  interface Appointment {
    id: string
    title: string
    description: string | null
    created_by: string | null
    created_by_name: string | null
    starts_at: string
    is_hearing: boolean
    created_at: string
    updated_at: string
  }

  // A case as returned in a client's history (issue #21). No client_id field.
  interface ClientHistoryEntry {
    type: 'CASE' | 'LEAD_OBSERVATION'
    id: string
    case_id: string | null
    title: string
    description: string
    status: CaseStatus | null
    created_at: string
    updated_at: string
  }
}

export {}
