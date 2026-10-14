"use client";

import { useRef } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  guestName: string;
  guestEmail: string | null;
  unitNumber: string;
  unitType: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  currency: string;
  ratePerNight: number;
  total: number;
  taxAmount?: number;
  discountAmount?: number;
  isVip?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  data: InvoiceData | null;
}

const LETTERHEAD_URL = "https://eleahodkxilnzqzjpozq.supabase.co/storage/v1/object/public/public-assets/letter%201.jpg";

export function InvoiceModal({ open, onClose, data }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${data?.invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background: #fff; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            @page { margin: 0; size: A4; }
          }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 800);
  }

  if (!data) return null;

  const tax = data.taxAmount ?? 0;
  const discount = data.discountAmount ?? 0;
  const grandTotal = data.total + tax - discount;

  return (
    <Dialog open={open} onClose={onClose} title="Check-in Invoice">
      <div className="flex justify-end gap-2 mb-4">
        <Button onClick={handlePrint} size="sm"><Printer size={14} /> Print / Save PDF</Button>
        <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
      </div>

      <div ref={printRef}>
        <div style={{
          width: "210mm",
          minHeight: "297mm",
          fontFamily: "Arial, sans-serif",
          position: "relative",
          backgroundImage: `url(${LETTERHEAD_URL})`,
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          margin: "0 auto",
        }}>
          {/* Push content down past the letterhead header */}
          <div style={{ padding: "78mm 18mm 70mm 18mm" }}>

            {/* Invoice title + meta */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "7mm" }}>
              <div>
                <p style={{ fontSize: "22px", fontWeight: "bold", color: "#B8863B", letterSpacing: "3px", margin: 0 }}>
                  INVOICE {data.isVip && <span style={{ fontSize: "13px", background: "#B8863B", color: "#fff", borderRadius: "4px", padding: "2px 8px", marginLeft: "8px", letterSpacing: "1px" }}>VIP</span>}
                </p>
                <p style={{ fontSize: "12px", color: "#555", margin: "3px 0 0" }}>Invoice No: <strong style={{ color: "#202020" }}>{data.invoiceNumber}</strong></p>
                <p style={{ fontSize: "12px", color: "#555", margin: "3px 0 0" }}>Date: <strong style={{ color: "#202020" }}>{data.issueDate}</strong></p>
                <p style={{ fontSize: "12px", fontWeight: "bold", color: "#2e7d32", margin: "3px 0 0" }}>✓ PAID</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "11px", color: "#888", margin: 0, textTransform: "uppercase", letterSpacing: "1px" }}>Billed To</p>
                <p style={{ fontSize: "18px", fontWeight: "bold", color: "#202020", margin: "3px 0 0" }}>{data.guestName}</p>
                {data.guestEmail && <p style={{ fontSize: "12px", color: "#666", margin: "3px 0 0" }}>{data.guestEmail}</p>}
              </div>
            </div>

            {/* Divider */}
            <hr style={{ border: "none", borderTop: "2px solid #B8863B", marginBottom: "5mm" }} />

            {/* Stay details table */}
            <table width="100%" style={{ borderCollapse: "collapse", marginBottom: "5mm" }}>
              <thead>
                <tr style={{ background: "#B8863B" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "11px", color: "#fff", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Description</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "11px", color: "#fff", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Nights</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontSize: "11px", color: "#fff", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Rate / Night</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontSize: "11px", color: "#fff", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "#F9F3EB" }}>
                  <td style={{ padding: "12px", fontSize: "13px", color: "#202020", borderBottom: "1px solid #e1d5c4" }}>
                    <strong>Unit {data.unitNumber} — {data.unitType}</strong><br />
                    <span style={{ fontSize: "11px", color: "#888", lineHeight: "2" }}>Check-in: {data.checkInDate} at 2:00 PM</span><br />
                    <span style={{ fontSize: "11px", color: "#888" }}>Check-out: {data.checkOutDate} at 12:00 PM</span>
                  </td>
                  <td style={{ padding: "12px", textAlign: "center", fontSize: "15px", fontWeight: "bold", color: "#202020", borderBottom: "1px solid #e1d5c4" }}>{data.nights}</td>
                  <td style={{ padding: "12px", textAlign: "right", fontSize: "13px", color: "#202020", borderBottom: "1px solid #e1d5c4" }}>{data.currency} {data.ratePerNight.toFixed(2)}</td>
                  <td style={{ padding: "12px", textAlign: "right", fontSize: "14px", fontWeight: "bold", color: "#202020", borderBottom: "1px solid #e1d5c4" }}>{data.currency} {data.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* Total box */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ background: "#202020", borderRadius: "6px", padding: "14px 20px", minWidth: "260px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span style={{ fontSize: "12px", color: "#aaa" }}>Subtotal</span>
                  <span style={{ fontSize: "12px", color: "#fff" }}>{data.currency} {data.total.toFixed(2)}</span>
                </div>
                {tax > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                    <span style={{ fontSize: "12px", color: "#aaa" }}>Tax</span>
                    <span style={{ fontSize: "12px", color: "#fff" }}>{data.currency} {tax.toFixed(2)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                    <span style={{ fontSize: "12px", color: "#aaa" }}>Discount</span>
                    <span style={{ fontSize: "12px", color: "#B8863B" }}>- {data.currency} {discount.toFixed(2)}</span>
                  </div>
                )}
                {(tax === 0 && discount === 0) && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                    <span style={{ fontSize: "12px", color: "#aaa" }}>Tax / Discount</span>
                    <span style={{ fontSize: "12px", color: "#aaa" }}>—</span>
                  </div>
                )}
                <hr style={{ border: "none", borderTop: "1px solid #444", margin: "6px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span style={{ fontSize: "15px", fontWeight: "bold", color: "#B8863B" }}>TOTAL DUE</span>
                  <span style={{ fontSize: "20px", fontWeight: "bold", color: "#B8863B" }}>{data.currency} {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Dialog>
  );
}