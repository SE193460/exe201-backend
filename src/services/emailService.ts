import { Resend } from "resend";
import { env } from "../config/env";

const resend = new Resend(env.resendApiKey);

type InvoiceParams = {
  to: string;
  userName: string;
  listingTitle: string;
  packageName: string;
  amount: number;
  transactionId: string;
};

export async function sendInvoiceEmail(params: InvoiceParams) {
  const date = new Date().toLocaleDateString("vi-VN");
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
      <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
        <div style="background:#ff6a3d;padding:24px;text-align:center">
          <h1 style="color:white;margin:0;font-size:20px">HÓA ĐƠN ĐIỆN TỬ</h1>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">RoomMate - Tìm bạn cùng phòng</p>
        </div>
        <div style="padding:24px">
          <p style="font-size:14px;color:#333">Kính gửi: <strong>${params.userName}</strong></p>
          <p style="font-size:14px;color:#333;margin-bottom:16px">Cảm ơn bạn đã sử dụng dịch vụ của RoomMate. Dưới đây là thông tin hóa đơn:</p>

          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333">
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:10px 8px;color:#888;width:140px">Mã giao dịch</td>
              <td style="padding:10px 8px;font-weight:bold">${params.transactionId.slice(0, 8).toUpperCase()}</td>
            </tr>
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:10px 8px;color:#888">Ngày</td>
              <td style="padding:10px 8px">${date}</td>
            </tr>
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:10px 8px;color:#888">Gói dịch vụ</td>
              <td style="padding:10px 8px">${params.packageName}</td>
            </tr>
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:10px 8px;color:#888">Bài đăng</td>
              <td style="padding:10px 8px">${params.listingTitle}</td>
            </tr>
            <tr>
              <td style="padding:10px 8px;color:#888">Số tiền</td>
              <td style="padding:10px 8px;font-size:18px;font-weight:bold;color:#ff6a3d">${params.amount.toLocaleString("vi-VN")}đ</td>
            </tr>
          </table>

          <div style="margin-top:24px;padding:16px;background:#fff7f2;border-radius:12px;font-size:13px;color:#555">
            <p style="margin:0 0 4px">Hóa đơn này được tạo tự động bởi RoomMate.</p>
            <p style="margin:0">Mọi thắc mắc vui lòng liên hệ qua email này.</p>
          </div>
        </div>
        <div style="background:#fafafa;padding:16px;text-align:center;border-top:1px solid #eee;font-size:12px;color:#aaa">
          RoomMate - Nền tảng tìm bạn cùng phòng
        </div>
      </div>
    </body>
    </html>
  `;

  const { error } = await resend.emails.send({
    from: "RoomMate <onboarding@resend.dev>",
    to: params.to,
    subject: `Hóa đơn điện tử - ${params.packageName} - RoomMate`,
    html,
  });

  if (error) {
    console.error("Resend invoice error:", error);
    throw error;
  }
}
