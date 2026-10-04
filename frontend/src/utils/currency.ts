export function formatINR(amount: number, showZeroPaise = false): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  const hasFractions = abs % 1 !== 0;
  const minimumFractionDigits = hasFractions || showZeroPaise ? 2 : 0;
  const maximumFractionDigits = 2;

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(abs);

  return `${isNegative ? '-' : ''}₹${formatted}`;
}
