import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

function cn(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ')
}

const controlBase =
  'w-full rounded-md border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-2 focus:outline-offset-1 focus:outline-accent disabled:opacity-50'

interface BaseProps {
  label: ReactNode
  helper?: ReactNode
  error?: ReactNode
  /** Visually hide the label (still announced to assistive tech). */
  hideLabel?: boolean
  className?: string
}

function FieldShell({
  id,
  label,
  helper,
  error,
  hideLabel,
  className,
  children,
}: BaseProps & { id: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label
        htmlFor={id}
        className={cn(
          'text-xs font-medium text-text-muted',
          hideLabel && 'sr-only',
        )}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : helper ? (
        <p className="text-xs text-text-muted">{helper}</p>
      ) : null}
    </div>
  )
}

export interface FieldProps
  extends BaseProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  id?: string
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, helper, error, hideLabel, className, id, ...inputProps },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <FieldShell
      id={inputId}
      label={label}
      helper={helper}
      error={error}
      hideLabel={hideLabel}
      className={className}
    >
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(
          controlBase,
          error
            ? 'border-danger focus:border-danger'
            : 'border-border focus:border-border-strong',
        )}
        {...inputProps}
      />
    </FieldShell>
  )
})

export interface TextAreaFieldProps
  extends BaseProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  id?: string
}

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  TextAreaFieldProps
>(function TextAreaField(
  { label, helper, error, hideLabel, className, id, rows, ...textareaProps },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <FieldShell
      id={inputId}
      label={label}
      helper={helper}
      error={error}
      hideLabel={hideLabel}
      className={className}
    >
      <textarea
        ref={ref}
        id={inputId}
        rows={rows ?? 3}
        aria-invalid={error ? true : undefined}
        className={cn(
          controlBase,
          'resize-y',
          error
            ? 'border-danger focus:border-danger'
            : 'border-border focus:border-border-strong',
        )}
        {...textareaProps}
      />
    </FieldShell>
  )
})

export interface SelectFieldProps
  extends BaseProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  id?: string
  children: ReactNode
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField(
    { label, helper, error, hideLabel, className, id, children, ...selectProps },
    ref,
  ) {
    const generatedId = useId()
    const inputId = id ?? generatedId
    return (
      <FieldShell
        id={inputId}
        label={label}
        helper={helper}
        error={error}
        hideLabel={hideLabel}
        className={className}
      >
        <select
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={cn(
            controlBase,
            'appearance-none bg-[length:1rem_1rem] bg-[right_0.625rem_center] bg-no-repeat pr-9',
            error
              ? 'border-danger focus:border-danger'
              : 'border-border focus:border-border-strong',
          )}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%2378716c' stroke-width='1.5'><path d='M6 8l4 4 4-4'/></svg>\")",
          }}
          {...selectProps}
        >
          {children}
        </select>
      </FieldShell>
    )
  },
)
