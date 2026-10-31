import { env } from "../config/env";

/**
 * Roomie AI Assistant.
 *
 * Two answer paths:
 *  - When an LLM key is configured (ASSISTANT_API_KEY / OPENAI_API_KEY) the
 *    message history is sent to an OpenAI-compatible chat completions endpoint
 *    (OpenAI, OpenRouter, Groq, Together, …).
 *  - Otherwise (or if the LLM call fails) a keyword/FAQ rule engine answers
 *    offline, so the assistant always works with zero configuration.
 *
 * The assistant always answers in the language the visitor is currently using
 * (Vietnamese / English / Japanese).
 */

export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantLocale = "vi" | "en" | "ja";

export type AssistantReply = {
  reply: string;
  source: "llm" | "offline";
  language: AssistantLocale;
};

export const ASSISTANT_LOCALES: AssistantLocale[] = ["vi", "en", "ja"];

/** Map an arbitrary language tag (e.g. i18n `en-US`) to a supported locale. */
export function normalizeAssistantLocale(value: unknown): AssistantLocale {
  if (typeof value !== "string") return "vi";
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("en")) return "en";
  if (normalized.startsWith("ja") || normalized.startsWith("jp")) return "ja";
  return "vi";
}

const LOCALE_LABEL: Record<AssistantLocale, string> = {
  vi: "Vietnamese (Tiếng Việt)",
  en: "English",
  ja: "Japanese (日本語)",
};

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 12;

type LocalizedText = Record<AssistantLocale, string>;

// ─── Offline knowledge base ───────────────────────────────────────────────────

type FaqEntry = {
  id: string;
  /** Normalized keywords (no diacritics, lowercase) used for matching. */
  keywords: string[];
  answers: LocalizedText;
};

const FAQ: FaqEntry[] = [
  {
    id: "find-room",
    keywords: [
      "tim phong", "tim kiem", "tim tro", "thue phong", "danh sach phong",
      "find room", "search room", "rent room", "listing",
      "部屋", "探す", "部屋を探", "賃貸",
    ],
    answers: {
      vi: "Để tìm phòng, vào **Danh sách phòng** ở thanh điều hướng. Bạn có thể lọc theo **tỉnh/thành**, **khu vực**, **giá** và giới tính, hoặc gõ câu tìm kiếm tự nhiên như “phòng 3 triệu quận 1 nữ”. Nút **Xem bản đồ** hiển thị các tin có toạ độ trên bản đồ 34 tỉnh/thành.",
      en: "To find a room, open **Listings** in the navigation bar. You can filter by **province/city**, **area**, **price** and gender, or type a natural query like \u201c3 million district 1 female\u201d. The **View map** button plots listings that have coordinates on the 34-province map.",
      ja: "部屋を探すには、ナビゲーションバーの**物件一覧**を開きます。**省・市**、**エリア**、**家賃**、性別で絞り込めるほか、「300万ドン 1区 女性」のような自然な検索もできます。**地図表示**ボタンで、座標のある投稿を34省の地図上に表示します。",
    },
  },
  {
    id: "soft-filter",
    keywords: [
      "bo loc mem", "soft filter", "do tuong thich", "cham diem", "match",
      "ghep doi", "thoi quen sinh hoat", "diem",
      "soft filter", "compatibility", "match score", "roommate match",
      "ソフトフィルター", "マッチ度", "相性", "マッチング",
    ],
    answers: {
      vi: "**Bộ lọc mềm** ghép đôi theo thói quen sinh hoạt. Bạn điền tiêu chí (giờ giấc, dọn dẹp, thú nuôi, hút thuốc, khách, điều hoà…), chọn bộ lọc cứng (khu vực, giá, diện tích) rồi bấm tìm. Hệ thống chấm **điểm tương thích %** cho từng tin và xếp theo điểm cao nhất. Khách chưa đăng nhập vẫn dùng được.",
      en: "The **Soft filter** matches people by lifestyle habits. Fill in your criteria (schedule, cleanliness, pets, smoking, guests, air-conditioning…), pick the hard filters (area, price, size) and search. Roomie scores a **% compatibility** for every listing and sorts by the highest score. Guests can use it without logging in.",
      ja: "**ソフトフィルター**は生活習慣でマッチングします。条件（生活リズム、掃除、ペット、喫煙、来客、エアコンなど）を入力し、ハード条件（エリア、家賃、広さ）を選んで検索すると、各物件に**相性スコア（%）**が付き、高い順に並びます。未ログインのゲストでも利用できます。",
    },
  },
  {
    id: "auto-match",
    keywords: [
      "tu dong ghep", "auto match", "bat ghep doi", "cong tac ghep", "ghep doi tu dong",
      "auto match", "automatic matching",
      "自動マッチ", "自動マッチング",
    ],
    answers: {
      vi: "**Tự động ghép đôi (Auto match)** tự gợi ý tin phù hợp với hồ sơ của bạn. Bật công tắc cạnh bộ lọc ở trang danh sách phòng hoặc ở trang hồ sơ cá nhân. Bật ở hồ sơ thì thiết lập được lưu vào tài khoản; bật ở danh sách phòng thì lưu theo thiết bị.",
      en: "**Auto match** automatically suggests listings that fit your profile. Turn on the switch next to the filter on the listings page or on your profile page. On the profile page the setting is saved to your account; on the listings page it is saved per device.",
      ja: "**自動マッチング**は、あなたのプロフィールに合う物件を自動で提案します。物件一覧ページの絞り込み横、またはプロフィールページのスイッチをオンにします。プロフィール側はアカウントに保存され、一覧側は端末ごとに保存されます。",
    },
  },
  {
    id: "post-listing",
    keywords: [
      "dang tin", "dang bai", "cho thue", "tao tin", "gui tin", "ban phong", "cho thue phong", "dang phong",
      "post listing", "post a room", "rent out", "create listing",
      "投稿", "掲載", "部屋を出す", "掲載する",
    ],
    answers: {
      vi: "Để đăng tin cho thuê: đăng nhập, vào **Tin của tôi** → **Tạo tin đăng**, điền thông tin phòng (tiêu đề, giá, diện tích, địa chỉ, tiện ích, ảnh) rồi gửi. Tin ở trạng thái **Chờ duyệt** và hiển thị công khai sau khi quản trị viên phê duyệt.",
      en: "To post a rental: log in, open **My listings** → **Create listing**, fill in the room details (title, price, size, address, amenities, photos) and submit. The listing starts as **Pending review** and goes public once an admin approves it.",
      ja: "物件を掲載するには、ログインして**マイ物件** → **新規投稿**を開き、部屋の情報（タイトル、家賃、広さ、住所、設備、写真）を入力して送信します。投稿は**審査待ち**となり、管理者の承認後に公開されます。",
    },
  },
  {
    id: "manage-listing",
    keywords: [
      "sua tin", "chinh sua tin", "xoa tin", "quan ly tin", "tin cua toi", "my listings", "an tin", "sua bai",
      "my listings", "edit listing", "delete listing",
      "自分の物件", "掲載管理", "編集", "削除",
    ],
    answers: {
      vi: "Vào **Tin của tôi** để xem, sửa hoặc ẩn/xoá các tin bạn đã đăng. Mỗi tin hiển thị trạng thái duyệt (**Chờ duyệt / Đã duyệt / Bị từ chối**) và lượt xem.",
      en: "Open **My listings** to view, edit or hide/delete the listings you posted. Each listing shows its moderation status (**Pending / Approved / Rejected**) and view count.",
      ja: "**マイ物件**を開くと、投稿した物件の確認・編集・非表示／削除ができます。各物件には審査状況（**審査待ち／承認済み／却下**）と閲覧数が表示されます。",
    },
  },
  {
    id: "lifestyle-profile",
    keywords: [
      "lien he", "thong tin lien he", "so dien thoai", "xem sdt", "xem lien he",
      "ho so loi song", "luot xem", "mo ho so", "goi chu nha",
      "contact", "phone number", "lifestyle profile", "view profile", "owner profile", "unlock",
      "連絡先", "電話番号", "ライフスタイル", "プロフィール", "閲覧",
    ],
    answers: {
      vi: "Thông tin liên hệ (số điện thoại) của chủ nhà được hiển thị **công khai** ở trang chi tiết tin — bạn bấm **Hiện số điện thoại** là xem được, không mất lượt xem. Tính năng trả phí là **mở hồ sơ lối sống của chủ bài đăng**: mỗi lần mở tốn **1 lượt xem**, bạn có sẵn **3 lượt miễn phí**, hết thì mua thêm gói **5 lượt – 5.000đ** hoặc **20 lượt – 15.000đ**.",
      en: "The owner's contact (phone number) is shown **publicly** on the listing detail page — tap **Show phone number** to see it, at no cost. The paid feature is **opening the owner's lifestyle profile**: each unlock costs **1 view**, you start with **3 free views**, and when they run out you can buy **5 views – 5,000₫** or **20 views – 15,000₫**.",
      ja: "オーナーの連絡先（電話番号）は物件詳細ページに**公開**されており、**電話番号を表示**を押せば無料で確認できます。有料機能は**投稿者のライフスタイルプロフィールを開く**ことです。1件につき**1回分の閲覧**を消費し、最初は**3回分が無料**、なくなったら**5回 – 5,000₫**または**20回 – 15,000₫**のパッケージを購入できます。",
    },
  },
  {
    id: "payment",
    keywords: [
      "thanh toan", "mua goi", "nap tien", "tra tien", "gia goi", "pricing", "bang gia",
      "payment", "buy views", "pricing", "package",
      "支払い", "購入", "料金", "パッケージ",
    ],
    answers: {
      vi: "Roomie bán **gói lượt xem hồ sơ lối sống**: **5 lượt – 5.000đ** và **20 lượt – 15.000đ**. Bạn chọn gói ở trang **Mua lượt xem** (hoặc từ trang chi tiết tin), quét mã QR/chuyển khoản, rồi bấm xác nhận. Số lượt sẽ được cộng vào tài khoản sau khi quản trị viên duyệt giao dịch.",
      en: "Roomie sells **lifestyle-profile view packages**: **5 views – 5,000₫** and **20 views – 15,000₫**. Pick a package on the **Buy views** page (or from a listing), scan the QR / transfer the money, then confirm. Views are added to your account once an admin approves the transaction.",
      ja: "Roomieでは**ライフスタイルプロフィール閲覧パッケージ**を販売しています：**5回 – 5,000₫**、**20回 – 15,000₫**。**閲覧を購入**ページ（または物件ページ）でパッケージを選び、QRコードで送金して確認します。管理者が承認すると閲覧回数がアカウントに加算されます。",
    },
  },
  {
    id: "save",
    keywords: [
      "luu tin", "yeu thich", "tin da luu", "bookmark", "heart", "luu bai",
      "save listing", "saved", "favorite", "bookmark",
      "お気に入り", "保存", "ブックマーク",
    ],
    answers: {
      vi: "Bấm biểu tượng **trái tim** trên tin đăng để lưu. Xem lại ở mục **Tin đã lưu** trong trang cá nhân (cần đăng nhập).",
      en: "Tap the **heart** icon on a listing to save it. Find saved rooms under **Saved listings** in your account (login required).",
      ja: "物件の**ハート**アイコンを押すと保存できます。保存した物件はアカウントの**お気に入り**から確認できます（要ログイン）。",
    },
  },
  {
    id: "map",
    keywords: [
      "ban do", "map", "vi tri", "toa do", "ban do khu vuc",
      "map", "location", "coordinates",
      "地図", "位置", "マップ",
    ],
    answers: {
      vi: "Trang **Danh sách phòng** có nút **Xem bản đồ**: bản đồ hiển thị ranh giới 34 tỉnh/thành mới và ghim các tin có toạ độ. Khi bạn chọn một tỉnh/thành hoặc khu vực, bản đồ tự căn đúng khu vực đó.",
      en: "The **Listings** page has a **View map** button: the map shows the boundaries of the 34 new provinces and pins listings that have coordinates. When you pick a province or area, the map fits that region automatically.",
      ja: "**物件一覧**ページの**地図を見る**ボタンで、新しい34省・市の境界と座標付きの物件が地図に表示されます。省・市やエリアを選ぶと、地図がその範囲に自動で合わせられます。",
    },
  },
  {
    id: "footer-links",
    keywords: [
      "gioi thieu", "about", "dieu khoan", "bao mat", "privacy", "terms", "chinh sach", "lien lac",
      "about", "terms", "privacy", "policy", "contact us",
      "会社概要", "利用規約", "プライバシー", "お問い合わせ",
    ],
    answers: {
      vi: "Các trang **Về chúng tôi**, **Liên hệ**, **Chính sách bảo mật** và **Điều khoản dịch vụ** nằm ở chân trang (footer) của website.",
      en: "The **About us**, **Contact**, **Privacy Policy** and **Terms of Service** pages are in the website footer.",
      ja: "**会社概要**、**お問い合わせ**、**プライバシーポリシー**、**利用規約**のページは、サイトのフッターにあります。",
    },
  },
  {
    id: "report",
    keywords: [
      "bao cao", "tin xau", "lua dao", "spam", "to cao", "khong dung su that",
      "report", "scam", "fraud", "spam",
      "通報", "報告", "詐欺", "スパム",
    ],
    answers: {
      vi: "Nếu thấy tin đáng ngờ, mở trang chi tiết tin và bấm **Báo cáo**, chọn lý do rồi gửi. Quản trị viên sẽ xem xét và xử lý tin vi phạm.",
      en: "If a listing looks suspicious, open it and tap **Report**, pick a reason and submit. An admin will review and handle violating listings.",
      ja: "怪しい物件を見つけたら、物件詳細で**通報**を押し、理由を選んで送信してください。管理者が確認し、違反物件に対応します。",
    },
  },
  {
    id: "profile",
    keywords: [
      "ho so", "thong tin ca nhan", "cap nhat ho so", "anh dai dien", "avatar",
      "profile", "account", "avatar", "update profile",
      "プロフィール", "アカウント", "アイコン", "更新",
    ],
    answers: {
      vi: "Vào **Hồ sơ** để cập nhật tên, ảnh đại diện, thông tin cá nhân và bật/tắt ghép đôi tự động. Hồ sơ càng đầy đủ thì gợi ý ghép đôi càng chính xác.",
      en: "Open **Profile** to update your name, avatar, personal info and the auto-match switch. The fuller your profile, the more accurate your matches.",
      ja: "**プロフィール**で名前・アイコン・個人情報の更新や自動マッチングのオン／オフができます。プロフィールが充実しているほど、マッチングの精度が上がります。",
    },
  },
  {
    id: "support",
    keywords: [
      "ho tro", "tro giup", "hoi dap", "helpdesk", "lien he ho tro", "giup",
      "help", "support", "support contact",
      "サポート", "ヘルプ", "問い合わせ", "助け",
    ],
    answers: {
      vi: "Mình là trợ lý ảo của Roomie, sẵn sàng hướng dẫn bạn dùng website: tìm phòng, lọc, ghép đôi, đăng tin, thanh toán… Nếu cần hỗ trợ trực tiếp, vui lòng liên hệ **support.roomie@gmail.com** (8:00–20:00).",
      en: "I'm the Roomie virtual assistant and can guide you through the site: finding rooms, filtering, matching, posting, payments… For direct help, contact **support.roomie@gmail.com** (8:00–20:00).",
      ja: "私はRoomieのバーチャルアシスタントです。物件探し・絞り込み・マッチング・投稿・支払いなどをご案内します。直接のサポートは **support.roomie@gmail.com**（8:00〜20:00）までご連絡ください。",
    },
  },
];

const GREETING: LocalizedText = {
  vi: "Xin chào! Mình là trợ lý Roomie. Bạn cần hỗ trợ gì? Mình có thể hướng dẫn tìm phòng, bộ lọc mềm, đăng tin, mở hồ sơ lối sống của chủ bài đăng hoặc xem bản đồ khu vực.",
  en: "Hi! I'm the Roomie assistant. How can I help? I can guide you through finding rooms, the soft filter, posting a listing, opening an owner's lifestyle profile, or the area map.",
  ja: "こんにちは！Roomieのアシスタントです。どのようなご用件でしょうか？物件探し、ソフトフィルター、投稿、投稿者のライフスタイルプロフィールの確認、エリア地図などをご案内できます。",
};

const FALLBACK: LocalizedText = {
  vi: "Mình là trợ lý ảo của Roomie, chuyên hướng dẫn sử dụng website: tìm phòng, bộ lọc mềm & điểm tương thích, đăng tin cho thuê, mua lượt xem để mở hồ sơ lối sống của chủ bài đăng, xem bản đồ khu vực… Bạn muốn hỏi về phần nào?",
  en: "I'm the Roomie assistant and I help you use the site: finding rooms, the soft filter & compatibility score, posting a listing, buying views to open an owner's lifestyle profile, the area map… Which part would you like help with?",
  ja: "私はRoomieのアシスタントで、サイトの使い方をご案内します：物件探し、ソフトフィルターと相性スコア、物件の投稿、閲覧を購入して投稿者のライフスタイルプロフィールを開く、エリア地図など。どれについてお調べしますか？",
};

const GREETING_PATTERN = /(^|\s)(xin chao|chao|hello|hi|hey|こんにちは|はじめまして)(\s|$|！|!|。)/;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

/** Best-effort offline answer using keyword scoring, in the requested locale. */
export function answerOffline(message: string, locale: AssistantLocale = "vi"): string {
  const text = normalize(message);
  if (!text.trim()) return FALLBACK[locale];

  if (GREETING_PATTERN.test(text) && text.length < 30) {
    return GREETING[locale];
  }

  let best: FaqEntry | null = null;
  let bestScore = 0;
  for (const entry of FAQ) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (text.includes(normalize(keyword))) {
        // Longer phrases are stronger signals than single tokens.
        score += keyword.trim().split(/\s+/).length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return best ? best.answers[locale] : FALLBACK[locale];
}

// ─── LLM path ─────────────────────────────────────────────────────────────────

function buildSystemPrompt(locale: AssistantLocale): string {
  const knowledge = FAQ.map((entry) => `- ${entry.answers[locale]}`).join("\n");
  return [
    "You are the virtual assistant of Roomie, a Vietnamese room-rental and roommate-matching website.",
    "Your job: guide users through the Roomie website briefly, warmly and accurately.",
    "Rules:",
    `- Always answer in ${LOCALE_LABEL[locale]}. Do not switch languages unless the user does.`,
    "- Only answer questions about Roomie and finding/posting rooms. For anything else, politely say you only help with Roomie.",
    "- Never invent features. If unsure, point the user to support.roomie@gmail.com.",
    "- Keep answers short (usually under 120 words); bullet points are fine.",
    "",
    "Roomie knowledge:",
    ...FAQ.map((entry) => `- ${entry.answers[locale]}`),
  ].join("\n");
}

function isConfigured(): boolean {
  return Boolean(env.assistantApiKey);
}

async function answerWithLlm(history: AssistantMessage[], locale: AssistantLocale): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${env.assistantApiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.assistantApiKey}`,
        // OpenRouter uses these for attribution; harmless for other providers.
        "HTTP-Referer": env.frontendUrl,
        "X-Title": "Roomie Assistant",
      },
      body: JSON.stringify({
        model: env.assistantModel,
        temperature: 0.4,
        max_tokens: 500,
        messages: [{ role: "system", content: buildSystemPrompt(locale) }, ...history],
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

export async function answerAssistant(
  messages: AssistantMessage[],
  locale: AssistantLocale = "vi"
): Promise<AssistantReply> {
  const history = messages
    .slice(-MAX_HISTORY)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, MAX_MESSAGE_LENGTH),
    }));

  const lastUserMessage = [...history].reverse().find((message) => message.role === "user")?.content ?? "";

  if (isConfigured()) {
    try {
      const reply = await answerWithLlm(history, locale);
      return { reply, source: "llm", language: locale };
    } catch (error) {
      console.error("Assistant LLM call failed, falling back to offline answers:", error);
    }
  }

  return { reply: answerOffline(lastUserMessage, locale), source: "offline", language: locale };
}

/** Exposed for diagnostics/tests. */
export function isAssistantLlmConfigured(): boolean {
  return isConfigured();
}
