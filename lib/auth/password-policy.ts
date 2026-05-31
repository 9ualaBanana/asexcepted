/** Mirrors supabase/config.toml minimum_password_length. */
export function validatePassword(password: string): string | null {
  const minLength = Number(process.env.NEXT_PUBLIC_MIN_PASSWORD_LENGTH);
  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters.`;
  }
  return null;
}
