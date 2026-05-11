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

export interface LoginResponse {
  user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'accessLevel'>
}
