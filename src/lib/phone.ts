/**
 * Reduces user input to international digits (`79991234567`),
 * or returns null if it can't be a phone number.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, '')
  // Russian numbers are often typed with the trunk prefix 8 or without a country code.
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`
  else if (digits.length === 10 && digits.startsWith('9')) digits = `7${digits}`
  return digits.length >= 10 && digits.length <= 15 ? digits : null
}

export function formatPhone(digits: string): string {
  const ru = /^7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(digits)
  return ru ? `+7 ${ru[1]} ${ru[2]}-${ru[3]}-${ru[4]}` : `+${digits}`
}
