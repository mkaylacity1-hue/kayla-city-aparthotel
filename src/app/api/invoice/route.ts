import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

const LOGO_URL = "https://eleahodkxilnzqzjpozq.supabase.co/storage/v1/object/public/public-assets/Kayla%20City%20Logo%20Design.png";
const STAMP_URL = "https://eleahodkxilnzqzjpozq.supabase.co/storage/v1/object/public/public-assets/KaylaCity.png";

export async function POST(req: Request) {
  try {
    const { reservationId } = await req.json();
    if (!reservationId) return NextResponse.json({ error: "Missing reservationId" }, { status: 400 });

    const supabase = createClient();

    const { data: reservation, error } = await supabase
      .from("reservations")
      .select(`*, guest:guest_id(full_name, email), unit:unit_id(unit_number, unit_type:unit_type_id(name))`)
      .eq("id", reservationId)
      .single();

    if (error || !reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });

    const guest = reservation.guest as any;
    const unit = reservation.unit as any;

    if (!guest?.email) return NextResponse.json({ error: "Guest has no email address" }, { status: 400 });

    const nights = Math.ceil(
      (new Date(reservation.check_out_date).getTime() - new Date(reservation.check_in_date).getTime()) /
      (1000 * 60 * 60 * 24)
    );

    const invoiceNumber = `KCA-${Date.now().toString().slice(-6)}`;
    const checkInDate = new Date(reservation.check_in_date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const checkOutDate = new Date(reservation.check_out_date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const issueDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const rate = reservation.currency === "GHS" ? reservation.rate_ghs : reservation.rate_usd;
    const total = reservation.total_amount;

    console.log("Sending invoice to:", guest.email);

    const { error: emailError } = await resend.emails.send({
      from: "M'Kayla City ApartHotel <onboarding@resend.dev>",
      to: guest.email,
      subject: `Invoice ${invoiceNumber} — M'Kayla City ApartHotel`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 0;">
  <tr><td align="center">
    <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">

      <!-- HEADER WITH LOGO -->
      <tr>
        <td style="background:#0a0a0a;padding:24px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;">
                <img src="${LOGO_URL}" alt="M'Kayla City ApartHotel" height="70" style="display:block;">
              </td>
              <td align="right" style="vertical-align:middle;">
                <p style="margin:0;color:#b76e79;font-size:30px;font-weight:bold;letter-spacing:3px;">INVOICE</p>
                <p style="margin:4px 0 0;color:#888;font-size:11px;letter-spacing:1px;">M'KAYLA CITY APARTHOTEL</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ROSE GOLD BAR -->
      <tr>
        <td style="background:#b76e79;padding:10px 40px;">
          <p style="margin:0;color:#fff;font-size:12px;">
            Maxima, City of Kumasi School, Kumasi - Ghana &nbsp;&bull;&nbsp; kaylacitylux@gmail.com
          </p>
        </td>
      </tr>

      <!-- INVOICE META -->
      <tr>
        <td style="padding:30px 40px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:top;">
                <p style="margin:0 0 6px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Billed To</p>
                <p style="margin:0;font-size:20px;font-weight:bold;color:#1a1a1a;">${guest.full_name}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#666;">${guest.email}</p>
              </td>
              <td align="right" style="vertical-align:top;">
                <table cellpadding="5" cellspacing="0">
                  <tr>
                    <td style="font-size:12px;color:#aaa;text-align:right;">Invoice No:</td>
                    <td style="font-size:12px;font-weight:bold;color:#1a1a1a;text-align:right;padding-left:12px;">${invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#aaa;text-align:right;">Date Issued:</td>
                    <td style="font-size:12px;color:#1a1a1a;text-align:right;padding-left:12px;">${issueDate}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#aaa;text-align:right;">Payment:</td>
                    <td style="font-size:12px;font-weight:bold;color:#2e7d32;text-align:right;padding-left:12px;">✓ PAID</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #eee;margin:0;"></td></tr>

      <!-- STAY TABLE -->
      <tr>
        <td style="padding:24px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;">
            <tr style="background:#0a0a0a;">
              <th style="padding:12px 16px;text-align:left;font-size:11px;color:#b76e79;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Description</th>
              <th style="padding:12px 16px;text-align:center;font-size:11px;color:#b76e79;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Nights</th>
              <th style="padding:12px 16px;text-align:right;font-size:11px;color:#b76e79;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Rate / Night</th>
              <th style="padding:12px 16px;text-align:right;font-size:11px;color:#b76e79;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Total</th>
            </tr>
            <tr style="background:#fafafa;">
              <td style="padding:16px;font-size:13px;color:#1a1a1a;border-top:1px solid #eee;">
                <strong>Unit ${unit?.unit_number} — ${unit?.unit_type?.name}</strong><br>
                <span style="font-size:12px;color:#888;line-height:2;">Check-in: ${checkInDate} at 2:00 PM</span><br>
                <span style="font-size:12px;color:#888;">Check-out: ${checkOutDate} at 12:00 PM</span>
              </td>
              <td style="padding:16px;text-align:center;font-size:15px;font-weight:bold;color:#1a1a1a;border-top:1px solid #eee;">${nights}</td>
              <td style="padding:16px;text-align:right;font-size:13px;color:#1a1a1a;border-top:1px solid #eee;">${reservation.currency} ${Number(rate).toFixed(2)}</td>
              <td style="padding:16px;text-align:right;font-size:14px;font-weight:bold;color:#1a1a1a;border-top:1px solid #eee;">${reservation.currency} ${Number(total).toFixed(2)}</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- TOTAL BOX -->
      <tr>
        <td style="padding:16px 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td></td>
              <td width="260" style="background:#0a0a0a;border-radius:6px;padding:16px 20px;">
                <table width="100%" cellpadding="4" cellspacing="0">
                  <tr>
                    <td style="font-size:12px;color:#888;">Subtotal</td>
                    <td align="right" style="font-size:12px;color:#ccc;">${reservation.currency} ${Number(total).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#888;">Tax</td>
                    <td align="right" style="font-size:12px;color:#ccc;">—</td>
                  </tr>
                  <tr><td colspan="2"><hr style="border:none;border-top:1px solid #333;margin:6px 0;"></td></tr>
                  <tr>
                    <td style="font-size:15px;font-weight:bold;color:#b76e79;">TOTAL DUE</td>
                    <td align="right" style="font-size:20px;font-weight:bold;color:#b76e79;">${reservation.currency} ${Number(total).toFixed(2)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- STAMP + NOTE -->
      <tr>
        <td style="padding:10px 40px 30px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:bottom;">
                <p style="margin:0;font-size:12px;color:#999;font-style:italic;line-height:1.8;">
                  Thank you for choosing M'Kayla City ApartHotel.<br>
                  We look forward to welcoming you again.<br>
                  Contact us: kaylacitylux@gmail.com
                </p>
              </td>
              <td align="right" style="vertical-align:bottom;">
                <img src="${STAMP_URL}" alt="Official Stamp" width="110" style="display:block;opacity:0.9;">
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#0a0a0a;padding:14px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#666;">
            M'Kayla City ApartHotel &bull; Maxima, City of Kumasi School, Kumasi, Ghana
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>
      `,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }

    await supabase.from("reservations").update({ invoice_sent: true }).eq("id", reservationId);
    return NextResponse.json({ success: true });

  } catch (e: any) {
    console.error("Invoice error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}