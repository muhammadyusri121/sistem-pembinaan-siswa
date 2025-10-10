// Kumpulan helper untuk menormalkan penulisan angka sebelum ditampilkan ke UI
// Utility formatting untuk menghilangkan tailing .0 pada numeric-like string
export const formatNumericId = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+\.0+$/.test(trimmed)) {
      return trimmed.replace(/\.0+$/, '');
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && Number.isInteger(numeric)) {
      return String(numeric);
    }

    return trimmed;
  }

  return String(value);
};

// Wrapper sederhana agar nilai yang ditampilkan konsisten di UI
export const formatDisplayValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return formatNumericId(value);
};
