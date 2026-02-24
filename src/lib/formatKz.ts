/**
 * Formata um valor numérico no padrão angolano de moeda.
 * Ex: 135200 → "135.200 Kz"
 */
export const formatKz = (valor: number): string =>
  new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor) + ' Kz';
