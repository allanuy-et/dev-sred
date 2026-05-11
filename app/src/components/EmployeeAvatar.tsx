interface EmployeeLike {
  firstName: string
  lastName: string
}

export interface EmployeeAvatarProps {
  employee: EmployeeLike
  /** Diameter token. `sm` = 24px, `md` = 32px, `lg` = 40px. */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<EmployeeAvatarProps['size']>, string> = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
}

// Deterministic pastel-ish palette indexed by a cheap hash of the initials.
// Stays in the zinc/indigo family so it sits comfortably inside the existing
// design tokens.
const PALETTE = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
]

function initialsOf(emp: EmployeeLike): string {
  const f = emp.firstName?.[0] ?? ''
  const l = emp.lastName?.[0] ?? ''
  return (f + l).toUpperCase() || '?'
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function EmployeeAvatar({
  employee,
  size = 'md',
  className,
}: EmployeeAvatarProps) {
  const initials = initialsOf(employee)
  const color = PALETTE[hash(initials) % PALETTE.length]
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZE_CLASSES[size]} ${color} ${className ?? ''}`}
    >
      {initials}
    </span>
  )
}
