const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 2,
});
const integer = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
export const money = (value: number | null | undefined) =>
  value == null ? "N/A" : gbp.format(value);
export const number = (value: number | null | undefined) =>
  value == null ? "N/A" : integer.format(value);
export const percent = (value: number | null | undefined) =>
  value == null ? "N/A" : `${value.toFixed(1)}%`;
const axisNumber = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
export const shortMoney = (value: number) => {
  const absolute = Math.abs(value);
  const divisor = absolute >= 1e6 ? 1e6 : absolute >= 1e3 ? 1e3 : 1;
  return `${value < 0 ? "-" : ""}£${axisNumber.format(absolute / divisor)}${divisor === 1e6 ? "m" : divisor === 1e3 ? "k" : ""}`;
};
export const dateLabel = (value: string) =>
  new Date(value + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
