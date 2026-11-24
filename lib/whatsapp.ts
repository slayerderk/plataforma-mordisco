export function normalizarTelefonoPeru(telefono: string) {
  const clean = telefono.replace(/\D/g, '');
  if (clean.startsWith('51')) return clean;
  if (clean.length === 9) return `51${clean}`;
  return clean;
}
