const onlyDigitsRegex = /\D/g

export function onlyDigits(value: string): string {
  return value.replace(onlyDigitsRegex, '')
}

export function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)

  if (digits.length <= 3) {
    return digits
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function formatPhoneBr(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)

  if (digits.length === 0) {
    return ''
  }

  if (digits.length < 3) {
    return `(${digits}`
  }

  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)

  if (rest.length <= 4) {
    return `(${ddd}) ${rest}`
  }

  if (rest.length <= 8) {
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
  }

  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`
}

export function formatRg(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)

  if (digits.length <= 3) {
    return digits
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function formatCepRn(value: string): string {
  const digits = onlyDigits(value).slice(0, 8)

  if (digits.length === 0) {
    return ''
  }

  if (digits.length <= 5) {
    return digits
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export const cpfPattern = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/
export const phonePattern = /^\(\d{2}\)\s\d{4,5}-\d{4}$/
export const rgPattern = /^\d{3}\.\d{3}\.\d{3}(-\d{2})?$/
export const cepRnPattern = /^59\d{3}-\d{3}$/

export function isValidCpf(value: string): boolean {
  return cpfPattern.test(value)
}

export function isValidPhoneBr(value: string): boolean {
  return phonePattern.test(value)
}

export function isValidRg(value: string): boolean {
  return rgPattern.test(value)
}

export function isValidCepRn(value: string): boolean {
  return cepRnPattern.test(value)
}
