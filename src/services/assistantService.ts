import { env } from "../config/env";

/**
 * Roomie AI Assistant.
 *
 * Two answer paths:
 *  - When an LLM key is configured (ASSISTANT_API_KEY / OPENAI_API_KEY) the
 *    message history is sent to an OpenAI-compatible chat completions endpoint.
 *  - Otherwise (or if the LLM call fails) a keyword/FAQ rule engine answers
 *    offline, so the assistant always works with zero configuration.
 */

export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantReply = {
  reply: string;
  source: "llm" | "offline";
};

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 12;

// ─── Offline knowledge base ───────────────────────────────────────────────────

type FaqEntry = {
  id: string;
  /** Normalized keywords (no diacritics, lowercase) used for matching. */
  keywords: string[];
  answer: string;
};

const FAQ: FaqEntry[] = [
  {
    id: "register",
    keywords: ["dang ky", "dang ki", "tao tai khoan", "register", "sign up", "signup", "tai khoan moi"],
    answer:
      "Để tạo tài khoản: bấm **Đăng nhập** ở góc phải trang chủ, chuyển sang tab **Đăng ký**, nhập họ tên, email và mật khẩu. Bạn cũng có thể đăng ký nhanh bằng Google. Sau khi đăng ký, hãy kiểm tra email để xác minh tài khoản (nếu hệ thống yêu cầu).",
  },
  {
    id: "login",
    keywords: ["dang nhap", "login", "sign in", "quen mat khau", "mat khau", "password", "khong dang nhap duoc"],
    answer:
      "Để đăng nhập: bấm **Đăng nhập** ở góc phải trang chủ và nhập email + mật khẩu, hoặc chọn **Đăng nhập bằng Google**. Nếu quên mật khẩu, hãy dùng liên kết quên mật khẩu ở trang đăng nhập để đặt lại.",
  },
  {
    id: "search",
    keywords: ["tim phong", "tim kiem", "search", "loc phong", "danh sach phong", "xem phong", "tim nha", "thue phong"],
    answer:
      "Vào **Danh sách phòng** (hoặc bấm ô tìm kiếm trên trang chủ) để xem toàn bộ tin đăng. Bạn có thể lọc theo **tỉnh/thành**, **khu vực**, **khoảng giá**, **giới tính** và **sở thích**. Ô tìm kiếm còn hiểu câu như “phòng 2 triệu quận 1 nữ”. Nút **Xem bản đồ** hiển thị các tin có toạ độ.",
  },
  {
    id: "soft-filter",
    keywords: ["bo loc mem", "soft filter", "do tuong thich", "cham diem", "match", "ghep doi", "thoi quen sinh hoat", "diem"],
    answer:
      "**Bộ lọc mềm** giúp ghép đôi theo thói quen sinh hoạt. Bạn điền tiêu chí (giờ giấc, dọn dẹp, thú nuôi, hút thuốc, khách, điều hoà...), chọn bộ lọc cứng (khu vực, giá, diện tích) rồi bấm tìm. Hệ thống chấm **điểm tương thích %** cho từng tin và sắp xếp theo điểm cao nhất. Khách chưa đăng nhập vẫn dùng được tính năng này.",
  },
  {
    id: "auto-match",
    keywords: ["tu dong ghep", "auto match", "bat ghep doi", "cong tac ghep"],
    answer:
      "**Tự động ghép đôi (Auto match)** giúp tự động gợi ý tin phù hợp với hồ sơ của bạn. Bật công tắc ngay cạnh bộ lọc ở trang danh sách phòng hoặc ở trang hồ sơ cá nhân. Khi bật ở hồ sơ, thiết lập được lưu vào tài khoản; ở danh sách phòng thì lưu theo thiết bị.",
  },
  {
    id: "post-listing",
    keywords: ["dang tin", "dang bai", "cho thue", "post", "tao tin", "gui tin", "ban phong", "cho thue phong"],
    answer:
      "Để đăng tin cho thuê: đăng nhập, vào **Tin của tôi** → **Tạo tin đăng**, điền thông tin phòng (tiêu đề, giá, diện tích, địa chỉ, tiện ích, ảnh) rồi gửi. Tin sẽ ở trạng thái **Chờ duyệt** và hiển thị công khai sau khi quản trị viên phê duyệt.",
  },
  {
    id: "manage-listing",
    keywords: ["sua tin", "chinh sua tin", "xoa tin", "quan ly tin", "tin cua toi", "my listings", "an tin"],
    answer:
      "Vào **Tin của tôi** để xem, sửa hoặc ẩn/xoá các tin bạn đã đăng. Mỗi tin hiển thị trạng thái duyệt (Chờ duyệt / Đã duyệt / Bị từ chối) và số lượt xem.",
  },
  {
    id: "contact",
    keywords: ["lien he", "thong tin lien he", "so dien thoai", "xem sdt", "goi chu nha", "contact", "lien lac"],
    answer:
      "Thông tin liên hệ của chủ nhà nằm ở trang chi tiết tin. Một số tin yêu cầu **mua gói lượt xem liên hệ** để xem số điện thoại: gói **5 lượt – 5.000đ** hoặc **20 lượt – 15.000đ**. Sau khi mua, bạn bấm để xem số và liên hệ trực tiếp.",
  },
  {
    id: "payment",
    keywords: ["thanh toan", "mua goi", "nap tien", "payment", "tra tien", "luot xem", "pricing", "gia goi"],
    answer:
      "Roomie dùng gói **lượt xem liên hệ**: 5.000đ cho 5 lượt và 15.000đ cho 20 lượt. Bạn chọn gói ở trang chi tiết tin, xác nhận thanh toán, rồi số lượt sẽ được cộng vào tài khoản để xem số điện thoại chủ nhà.",
  },
  {
    id: "save",
    keywords: ["luu tin", "yeu thich", "save", "tin da luu", "bookmark", "heart"],
    answer:
      "Bấm biểu tượng **trái tim** trên tin đăng để lưu. Danh sách tin đã lưu xem ở mục **Tin đã lưu** trong trang cá nhân (cần đăng nhập).",
  },
  {
    id: "map",
    keywords: ["ban do", "map", "vi tri", "toa do", "ban do khu vuc", "vi tri tren ban do"],
    answer:
      "Trang **Danh sách phòng** có nút **Xem bản đồ**: bản đồ hiển thị ranh giới 34 tỉnh/thành mới và ghim các tin có toạ độ. Khi bạn chọn một tỉnh/thành hoặc khu vực, bản đồ tự căn lại đúng khu vực đó.",
  },
  {
    id: "footer-links",
    keywords: ["gioi thieu", "about", "dieu khoan", "bao mat", "privacy", "terms", "chinh sach"],
    answer:
      "Các trang **Về chúng tôi**, **Liên hệ**, **Chính sách bảo mật** và **Điều khoản dịch vụ** nằm ở chân trang (footer) của website.",
  },
  {
    id: "report",
    keywords: ["bao cao", "report", "tin xau", "lua dao", "spam", "khong dung su that", "to cao"],
    answer:
      "Nếu thấy tin đáng ngờ, mở trang chi tiết tin và bấm **Báo cáo**, chọn lý do rồi gửi. Quản trị viên sẽ xem xét và xử lý tin vi phạm.",
  },
  {
    id: "profile",
    keywords: ["ho so", "profile", "thong tin ca nhan", "cap nhat ho so", "anh dai dien", "avatar"],
    answer:
      "Vào **Hồ sơ** để cập nhật tên, ảnh đại diện, thông tin cá nhân và bật/tắt ghép đôi tự động. Hồ sơ càng đầy đủ thì gợi ý ghép đôi càng chính xác.",
  },
  {
    id: "support",
    keywords: ["ho tro", "help", "tro giup", "hoi dap", "support", "helpdesk", "tro giup"],
    answer:
      "Mình là trợ lý ảo của Roomie, sẵn sàng hướng dẫn bạn dùng website: tìm phòng, lọc, ghép đôi, đăng tin, thanh toán... Bạn cứ hỏi cụ thể nhé. Nếu cần hỗ trợ trực tiếp, hãy dùng trang **Liên hệ** ở chân trang.",
  },
];

const GREETING_KEYWORDS = ["xin chao", "chao", "hello", "hi", "hey", "chao ban", "alo", "hello there"];

const FALLBACK_ANSWER =
  "Mình là trợ lý của Roomie, có thể giúp bạn: tìm & lọc phòng, dùng bộ lọc mềm để chấm điểm tương thích, bật ghép đôi tự động, đăng tin cho thuê, mua lượt xem liên hệ và xem bản đồ khu vực. Bạn muốn hỏi về việc gì?";

const GREETING_ANSWER =
  "Xin chào! Mình là trợ lý của Roomie. Mình có thể giúp bạn tìm phòng, dùng bộ lọc mềm để ghép đôi theo thói quen sinh hoạt, đăng tin cho thuê, mua lượt xem liên hệ hoặc xem bản đồ khu vực. Bạn cần hỗ trợ gì?";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

/** Best-effort offline answer using keyword scoring. */
export function answerOffline(message: string): string {
  const text = normalize(message);
  if (!text.trim()) return FALLBACK_ANSWER;

  if (/\b(xin chao|chao|hello|hi|hey)\b/.test(text) && text.length < 24) {
    return GREETING_ANSWER;
  }

  let best: FaqEntry | null = null;
  let bestScore = 0;

  for (const entry of FAQ) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (text.includes(keyword)) {
        // Longer phrases are stronger signals than single generic words.
        score += keyword.split(" ").length * 2 + keyword.length / 10;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best && bestScore > 0) return best.answer;
  return FALLBACK_ANSWER;
}

// ─── LLM path ─────────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  const faq = FAQ.map((entry) => `- ${entry.answer}`).join("\n");
  return [
    "Bạn là trợ lý ảo của Roomie — nền tảng tìm phòng trọ và ghép đôi bạn ở trọ tại Việt Nam.",
    "Nhiệm vụ: hướng dẫn người dùng sử dụng website Roomie một cách ngắn gọn, thân thiện, chính xác.",
    "Quy tắc:",
    "- Trả lời bằng đúng ngôn ngữ người dùng đang dùng (mặc định tiếng Việt).",
    "- Chỉ trả lời các câu hỏi liên quan đến Roomie và việc tìm/đăng phòng. Nếu ngoài phạm vi, hãy lịch sự nói rằng bạn chỉ hỗ trợ về Roomie.",
    "- Không bịa tính năng không có. Nếu không chắc, hướng dẫn người dùng liên hệ bộ phận hỗ trợ.",
    "- Trả lời ngắn (thường dưới 120 từ), có thể dùng gạch đầu dòng.",
    "",
    "Kiến thức về Roomie:",
    faq,
  ].join("\n");
}

function isConfigured(): boolean {
  return Boolean(env.assistantApiKey);
}

async function answerWithLlm(history: AssistantMessage[]): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${env.assistantApiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.assistantApiKey}`,
      },
      body: JSON.stringify({
        model: env.assistantModel,
        temperature: 0.4,
        max_tokens: 500,
        messages: [{ role: "system", content: buildSystemPrompt() }, ...history],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Assistant LLM responded with ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Assistant LLM returned an empty response");
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function answerAssistant(messages: AssistantMessage[]): Promise<AssistantReply> {
  const history = messages
    .slice(-MAX_HISTORY)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, MAX_MESSAGE_LENGTH),
    }));

  const lastUserMessage = [...history].reverse().find((message) => message.role === "user")?.content ?? "";

  if (isConfigured()) {
    try {
      const reply = await answerWithLlm(history);
      return { reply, source: "llm" };
    } catch (error) {
      console.error("Assistant LLM call failed, falling back to offline answers:", error);
    }
  }

  return { reply: answerOffline(lastUserMessage), source: "offline" };
}

/** Exposed for diagnostics/tests. */
export function isAssistantLlmConfigured(): boolean {
  return isConfigured();
}
