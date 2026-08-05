interface FieldErrorProps {
  children: string | null | undefined;
}

export function FieldError({ children }: FieldErrorProps) {
  if (!children) {
    return null;
  }
  return <p className="mt-1 text-sm text-error-500">{children}</p>;
}
