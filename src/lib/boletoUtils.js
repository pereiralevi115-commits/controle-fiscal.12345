export const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export const formatDate = (date) => {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
};

export const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

export const formatCnpjCpf = (value) => {
  const digits = onlyDigits(value);
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return value || "—";
};

const ITF_PATTERNS = {
  0: "00110", 1: "10001", 2: "01001", 3: "11000", 4: "00101",
  5: "10100", 6: "01100", 7: "00011", 8: "10010", 9: "01010",
};

export function barcodeBars(code) {
  const digits = onlyDigits(code);
  if (!digits) return [];
  const evenDigits = digits.length % 2 === 0 ? digits : `0${digits}`;
  const bars = [];
  let x = 0;
  const add = (bar, wide) => {
    const width = wide ? 4 : 1.6;
    if (bar) bars.push({ x, width });
    x += width;
  };
  add(true, false); add(false, false); add(true, false); add(false, false);
  for (let i = 0; i < evenDigits.length; i += 2) {
    const a = ITF_PATTERNS[evenDigits[i]];
    const b = ITF_PATTERNS[evenDigits[i + 1]];
    for (let j = 0; j < 5; j++) {
      add(true, a[j] === "1");
      add(false, b[j] === "1");
    }
  }
  add(true, true); add(false, false); add(true, false);
  return { bars, width: x };
}