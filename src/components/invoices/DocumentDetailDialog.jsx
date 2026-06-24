import React from "react";
import InvoiceDetailDialog from "./InvoiceDetailDialog";
import NFSeDetailDialog from "./NFSeDetailDialog";

/**
 * Abre o diálogo de detalhes correto conforme o tipo do documento:
 * NFS-e (serviço) usa NFSeDetailDialog, NF-e (produto) usa InvoiceDetailDialog.
 */
export default function DocumentDetailDialog({ invoice, open, onClose, onMarkReceived, branches }) {
  if (invoice?.document_type === "nfse") {
    return (
      <NFSeDetailDialog
        invoice={invoice}
        open={open}
        onClose={onClose}
        branches={branches}
      />
    );
  }

  return (
    <InvoiceDetailDialog
      invoice={invoice}
      open={open}
      onClose={onClose}
      onMarkReceived={onMarkReceived}
      branches={branches}
    />
  );
}