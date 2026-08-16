interface FieldErrorProps {
  children: string | null | undefined;
}

export function FieldError({ children }: FieldErrorProps) {
  if (!children) {
    return null;
  }
  return (
    <p role="alert" className="mt-1 text-sm text-error-500">
      {children}
    </p>
  );
}
