export type AccessLevel = 'admin' | 'standard' | 'limited'
export type PaidType = 'hourly' | 'salary'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string | null
  accessLevel: AccessLevel
  companyId: string
  startDate: string | null
  paid: PaidType
  hoursPerYear: number
  regularRate: number
  overtimeRate: number
  holidayRate: number
  specifiedEmployee: boolean
  qualifications: string | null
  status: 'active' | 'inactive'
  language: string
  timezone: string
  createdAt: string
  updatedAt: string
}

export interface AuthUser {
  userId: string
  email: string
  accessLevel: AccessLevel
}

export interface LoginRequest {
  email: string
  password: string
}

// Public-safe session shape — what the API returns from /auth/login, /auth/me,
// and what the frontend keeps in its session context. Includes the
// localization preferences (timezone, language) so every rendered date can
// respect the user's tz from anywhere in the app.
export type SessionUser = Pick<
  User,
  | 'id'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'accessLevel'
  | 'timezone'
  | 'language'
>

export interface LoginResponse {
  user: SessionUser
}

export interface MeResponse {
  user: SessionUser
}

export interface CreateEmployeeInput {
  email: string
  password: string
  firstName: string
  lastName: string
  accessLevel: AccessLevel
  role?: string | null
  startDate?: string | null
  paid?: PaidType
  hoursPerYear?: number
  regularRate?: number
  overtimeRate?: number
  holidayRate?: number
  specifiedEmployee?: boolean
  qualifications?: string | null
}

export type UpdateEmployeeInput = Partial<Omit<CreateEmployeeInput, 'password'>>

export interface EmployeeResponse {
  employee: User
}

export interface EmployeeListResponse {
  employees: User[]
}
