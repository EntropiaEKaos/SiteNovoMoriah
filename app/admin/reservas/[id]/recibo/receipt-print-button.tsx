"use client";

export default function ReceiptPrintButton(){
  return <button className="receiptPrintButton" type="button" onClick={()=>window.print()}>
    Imprimir / salvar PDF
  </button>;
}
