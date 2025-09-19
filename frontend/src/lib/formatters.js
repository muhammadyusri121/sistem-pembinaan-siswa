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

export const formatDisplayValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return formatNumericId(value);
};
