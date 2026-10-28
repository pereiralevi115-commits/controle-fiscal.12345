export function isInvoiceCompleted(invoice) {
  return !!invoice.sigv_recorded && !!invoice.topcon_recorded;
}