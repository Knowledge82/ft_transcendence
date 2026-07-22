// These rules mirror the backend DTOs (RegisterDto/LoginDto) exactly.
// Keeping them in sync matters: frontend validation is for fast user feedback,
// backend validation is the real security boundary — the frontend can be bypassed.

// regex - A regular expression, a pattern for checking text.
// ^ is the beginning of a line, [^\s@]+ is one or more characters that aren't a space (\s) or @, then a literal @, then another [^\s@]+, then a literal ., then another [^\s@]+, and $ is the end of the line.
// This is a simple, not perfectly strict, email format check (it doesn't catch all the edge cases of the actual email RFC standard, but it's sufficient for a registration form—don't confuse it with a real check for "does such an email exist?"; this is purely a text format check).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email) {
    return 'El email es obligatorio';
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'El email no tiene un formato válido';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return 'La contraseña es obligatoria';
  }
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  if (password.length > 72) {
    return 'La contraseña no puede superar los 72 caracteres';
  }
  return null;
}

export function validateDisplayName(displayName: string): string | null {
  if (!displayName) {
    return 'El nombre es obligatorio';
  }
  if (displayName.length < 2) {
    return 'El nombre debe tener al menos 2 caracteres';
  }
  if (displayName.length > 30) {
    return 'El nombre no puede superar los 30 caracteres';
  }
  return null;
}
