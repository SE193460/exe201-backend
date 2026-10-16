/**
 * Realistic Vietnamese seed data for the Roommate Finder Platform.
 *
 * Creates:
 *   - 1 shared `user` role
 *   - N seeded owner accounts (password: Roomie@123)
 *   - 1 lifestyle profile per owner (so match scoring has data)
 *   - N APPROVED listings spread across HCMC & Hanoi, with real addresses,
 *     coordinates, prices, 2-3 images and amenities
 *   - A mix of very recent listings (highlighted) and 30+ day old ones so the
 *     "old listing" badge (item 10) is visible
 *
 * Idempotent: every seeded account uses a `seed.ownerNN@roomie.vn` email, and
 * the script deletes them (cascades to their listings/profiles) before
 * re-inserting. Safe to run repeatedly.
 *
 * Usage: npm run db:seed
 */
import path from "path";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { Pool } from "pg";

dotenv.config({ path: path.join(__dirname, "../.env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not defined in .env");
  process.exit(1);
}

const needsSsl = databaseUrl.includes("supabase.com");
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

const SEED_PASSWORD = "Roomie@123";
const SEED_EMAIL_DOMAIN = "@roomie.vn";
const SEED_EMAIL_LOCAL = "seed.owner";

// Unsplash photo ids — interior / room oriented, reused across listings.
const IMAGE_IDS = [
  "photo-1522708323590-d24dbb6b0267",
  "photo-1502672260266-1c1ef2d93688",
  "photo-1560448204-e02f11c3d0e2",
  "photo-1493809842364-78817add7ffb",
  "photo-1554995207-c18c203602cb",
  "photo-1512917774080-9991f1c4c750",
  "photo-1502005229762-cf1b2da7c5d6",
  "photo-1484154218962-a197022b5858",
  "photo-1522771739844-6a9f6d5f14af",
  "photo-1560185127-6ed189bf02f4",
  "photo-1616594039964-ae9021a400a0",
  "photo-1567767292278-a4f21aa2d36e",
  "photo-1598928506311-c55ded91a20c",
  "photo-1560448075-bb485b067938",
  "photo-1519643381401-22c77e60520e",
  "photo-1505873242700-f289a29e1e0f",
  "photo-1586023492125-27b2c045efd7",
  "photo-1493663284031-b7e3aefcae8e",
];

function imageUrl(index: number): string {
  const id = IMAGE_IDS[index % IMAGE_IDS.length];
  return `https://images.unsplash.com/${id}?w=900&q=80&auto=format&fit=crop`;
}

type SeedListing = {
  fullName: string;
  phone: string;
  avatarImg: number;
  title: string;
  description: string;
  rentPrice: number;
  city: string;
  district: string;
  ward: string;
  address: string;
  latitude: number;
  longitude: number;
  availableFrom: string;
  preferredGender: "Nam" | "Nữ" | "Nam/Nữ" | "Không yêu cầu";
  roomType: string;
  roomAreaSqm: number;
  maxOccupants: number;
  currentOccupants: number;
  smokingAllowed: boolean;
  petAllowed: boolean;
  ageDays: number;
  amenities: string[];
  imageCount: number;
};

const LISTINGS: SeedListing[] = [
  {
    fullName: "Nguyễn Minh Anh",
    phone: "0901234567",
    avatarImg: 5,
    title: "Phòng riêng gần chợ Bến Thành, Quận 1",
    description:
      "Phòng 22m² có cửa sổ thoáng, nội thất cơ bản gồm giường, tủ quần áo và bàn làm việc. Nhà mới sơn, an ninh tốt, đi bộ 5 phút ra chợ Bến Thành. Điện nước tính theo giá nhà nước.",
    rentPrice: 4200000,
    city: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Thành",
    address: "12 Nguyễn Thị Minh Khai",
    latitude: 10.7735,
    longitude: 106.6981,
    availableFrom: "2026-10-01",
    preferredGender: "Nữ",
    roomType: "Phòng riêng",
    roomAreaSqm: 22,
    maxOccupants: 2,
    currentOccupants: 0,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 2,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Tủ quần áo", "Chỗ để xe"],
    imageCount: 3,
  },
  {
    fullName: "Trần Quốc Huy",
    phone: "0912345678",
    avatarImg: 12,
    title: "Phòng giá rẻ đường Nguyễn Hữu Cầu, Đa Kao",
    description:
      "Phòng 18m² yên tĩnh phù hợp sinh viên hoặc người đi làm. Có máy lạnh, nhà vệ sinh riêng trong phòng. Khu vực ăn uống đầy đủ, thuận tiện di chuyển vào trung tâm.",
    rentPrice: 3500000,
    city: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Đa Kao",
    address: "45 Nguyễn Hữu Cầu",
    latitude: 10.7889,
    longitude: 106.6989,
    availableFrom: "2026-09-20",
    preferredGender: "Nam",
    roomType: "Phòng riêng",
    roomAreaSqm: 18,
    maxOccupants: 1,
    currentOccupants: 0,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 6,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Chỗ để xe", "Camera an ninh"],
    imageCount: 3,
  },
  {
    fullName: "Trần Thị Thu Hà",
    phone: "0902345678",
    avatarImg: 9,
    title: "Phòng ghép nữ Bình Thạnh, gần ĐH Hutech",
    description:
      "Phòng 20m² sạch sẽ tại Bình Thạnh, phù hợp sinh viên nữ. Máy lạnh, nóng lạnh đầy đủ, có ban công phơi đồ. Điện 3.500đ/kWh, nước 20.000đ/m³.",
    rentPrice: 3000000,
    city: "TP. Hồ Chí Minh",
    district: "Bình Thạnh",
    ward: "Phường 22",
    address: "102 Điện Biên Phủ",
    latitude: 10.803,
    longitude: 106.7105,
    availableFrom: "2026-09-25",
    preferredGender: "Nữ",
    roomType: "Phòng ghép",
    roomAreaSqm: 20,
    maxOccupants: 2,
    currentOccupants: 1,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 11,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Ban công", "Máy giặt"],
    imageCount: 2,
  },
  {
    fullName: "Phạm Quốc Bảo",
    phone: "0903456789",
    avatarImg: 12,
    title: "Studio mini Bình Thạnh, có gác lửng",
    description:
      "Studio 16m² có gác lửng tách biệt khu ngủ và khu sinh hoạt. Nội thất đầy đủ, máy lạnh, nóng lạnh, tủ lạnh mini. Hẻm xe hơi, gần nhiều quán ăn đêm.",
    rentPrice: 2800000,
    city: "TP. Hồ Chí Minh",
    district: "Bình Thạnh",
    ward: "Phường 25",
    address: "78 Nguyễn Gia Trí",
    latitude: 10.8065,
    longitude: 106.7142,
    availableFrom: "2026-10-05",
    preferredGender: "Không yêu cầu",
    roomType: "Studio",
    roomAreaSqm: 16,
    maxOccupants: 1,
    currentOccupants: 0,
    smokingAllowed: false,
    petAllowed: true,
    ageDays: 2,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Tủ lạnh", "Bếp"],
    imageCount: 3,
  },
  {
    fullName: "Đỗ Ngọc Lan",
    phone: "0904567890",
    avatarImg: 32,
    title: "Phòng riêng Quận 3, gần Võ Thị Sáu",
    description:
      "Phòng 24m² cửa sổ lớn, ánh sáng tự nhiên. Chung cư cũ nhưng sạch, có thang máy và bảo vệ. Phù hợp nhân viên văn phòng làm việc tại trung tâm.",
    rentPrice: 4500000,
    city: "TP. Hồ Chí Minh",
    district: "Quận 3",
    ward: "Phường Võ Thị Sáu",
    address: "210 Võ Thị Sáu",
    latitude: 10.7823,
    longitude: 106.6902,
    availableFrom: "2026-10-10",
    preferredGender: "Nữ",
    roomType: "Phòng riêng",
    roomAreaSqm: 24,
    maxOccupants: 2,
    currentOccupants: 0,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 1,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Thang máy", "Camera an ninh", "Tủ quần áo"],
    imageCount: 3,
  },
  {
    fullName: "Vũ Hoàng Nam",
    phone: "0905678901",
    avatarImg: 15,
    title: "Phòng Quận 7, gần Lotte Mart",
    description:
      "Phòng 20m² khu yên tĩnh, gần Lotte Mart và nhiều tiện ích. Có chỗ để xe tầng trệt, nước nóng lạnh đầy đủ. Ưu tiên người ít dẫn khách về.",
    rentPrice: 3200000,
    city: "TP. Hồ Chí Minh",
    district: "Quận 7",
    ward: "Phường Tân Phú",
    address: "55 Nguyễn Thị Thập",
    latitude: 10.735,
    longitude: 106.7201,
    availableFrom: "2026-09-30",
    preferredGender: "Không yêu cầu",
    roomType: "Phòng riêng",
    roomAreaSqm: 20,
    maxOccupants: 2,
    currentOccupants: 1,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 38,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Chỗ để xe", "Tủ quần áo"],
    imageCount: 2,
  },
  {
    fullName: "Bùi Thanh Mai",
    phone: "0906789012",
    avatarImg: 44,
    title: "Căn hộ mini Phú Nhuận, full nội thất",
    description:
      "Phòng 22m² mới vào, nội thất cơ bản tông trắng sáng. Có máy giặt dùng chung, ban công phơi đồ. Khu trung tâm, cách sân bay 15 phút.",
    rentPrice: 3800000,
    city: "TP. Hồ Chí Minh",
    district: "Phú Nhuận",
    ward: "Phường 15",
    address: "8 Phan Xích Long",
    latitude: 10.7995,
    longitude: 106.681,
    availableFrom: "2026-09-15",
    preferredGender: "Nữ",
    roomType: "Phòng riêng",
    roomAreaSqm: 22,
    maxOccupants: 2,
    currentOccupants: 1,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 38,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Máy giặt", "Ban công"],
    imageCount: 2,
  },
  {
    fullName: "Lê Văn Hùng",
    phone: "0906789013",
    avatarImg: 13,
    title: "Phòng Tân Bình giá rẻ, gần sân bay",
    description:
      "Phòng 15m² gọn gàng, thích hợp sinh viên hoặc người mới đi làm. Điện 3.500đ/kWh, nước 15.000đ/m³. Hẻm yên tĩnh, camera an ninh 24/7.",
    rentPrice: 2900000,
    city: "TP. Hồ Chí Minh",
    district: "Tân Bình",
    ward: "Phường 4",
    address: "120 Cộng Hòa",
    latitude: 10.8002,
    longitude: 106.654,
    availableFrom: "2026-10-01",
    preferredGender: "Nam",
    roomType: "Phòng riêng",
    roomAreaSqm: 15,
    maxOccupants: 1,
    currentOccupants: 0,
    smokingAllowed: true,
    petAllowed: false,
    ageDays: 45,
    amenities: ["Wifi", "Nóng lạnh", "Chỗ để xe", "Camera an ninh"],
    imageCount: 2,
  },
  {
    fullName: "Nguyễn Thu Trang",
    phone: "0907890123",
    avatarImg: 20,
    title: "Phòng Quận 10 gần ĐH Bách Khoa",
    description:
      "Phòng 18m² sạch sẽ, có máy lạnh và nước nóng lạnh. Đi bộ 10 phút tới ĐH Bách Khoa. Nội thất cơ bản, ưu tiên sinh viên.",
    rentPrice: 3100000,
    city: "TP. Hồ Chí Minh",
    district: "Quận 10",
    ward: "Phường 12",
    address: "300 Cách Mạng Tháng 8",
    latitude: 10.7713,
    longitude: 106.6672,
    availableFrom: "2026-09-28",
    preferredGender: "Không yêu cầu",
    roomType: "Phòng ghép",
    roomAreaSqm: 18,
    maxOccupants: 2,
    currentOccupants: 1,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 52,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Giường"],
    imageCount: 2,
  },
  {
    fullName: "Trịnh Công Sơn",
    phone: "0908901234",
    avatarImg: 33,
    title: "Phòng Thủ Đức gần KCN Hiệp Bình",
    description:
      "Phòng 25m² tại Hiệp Bình Chánh, phù hợp nhân viên công nghiệp. Có chỗ để xe rộng, máy lạnh. Điện nước hợp lý, chủ nhà thân thiện.",
    rentPrice: 2600000,
    city: "TP. Hồ Chí Minh",
    district: "Thủ Đức",
    ward: "Phường Hiệp Bình Chánh",
    address: "27 Phạm Văn Đồng",
    latitude: 10.8428,
    longitude: 106.7287,
    availableFrom: "2026-09-10",
    preferredGender: "Nam",
    roomType: "Phòng riêng",
    roomAreaSqm: 25,
    maxOccupants: 2,
    currentOccupants: 0,
    smokingAllowed: true,
    petAllowed: true,
    ageDays: 60,
    amenities: ["Wifi", "Máy lạnh", "Chỗ để xe", "Nóng lạnh"],
    imageCount: 2,
  },
  {
    fullName: "Bùi Thanh Mai",
    phone: "0909012345",
    avatarImg: 5,
    title: "Căn hộ dịch vụ Quận 1, full nội thất",
    description:
      "Căn hộ dịch vụ 28m² tại Quận 1, dọn phòng 2 lần/tuần. Máy lạnh, tủ lạnh, bếp nhỏ, wifi cáp quang. Giá đã gồm phí dịch vụ, không điện nước.",
    rentPrice: 5000000,
    city: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Nguyễn Thái Bình",
    address: "9 Lý Tự Trọng",
    latitude: 10.773,
    longitude: 106.701,
    availableFrom: "2026-10-15",
    preferredGender: "Nữ",
    roomType: "Căn hộ dịch vụ",
    roomAreaSqm: 28,
    maxOccupants: 2,
    currentOccupants: 0,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 0,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Tủ lạnh", "Bếp", "Thang máy"],
    imageCount: 3,
  },
  {
    fullName: "Hoàng Thị Mai",
    phone: "0910123456",
    avatarImg: 24,
    title: "Phòng Bình Thạnh rộng, gần Landmark 81",
    description:
      "Phòng 20m² có tủ quần áo và bàn làm việc. Gần Landmark 81, siêu thị và nhiều quán cà phê. Chủ nhà cho ở ghép tối đa 2 người.",
    rentPrice: 3300000,
    city: "TP. Hồ Chí Minh",
    district: "Bình Thạnh",
    ward: "Phường 11",
    address: "36 Xô Viết Nghệ Tĩnh",
    latitude: 10.8025,
    longitude: 106.705,
    availableFrom: "2026-10-08",
    preferredGender: "Không yêu cầu",
    roomType: "Phòng riêng",
    roomAreaSqm: 20,
    maxOccupants: 2,
    currentOccupants: 0,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 3,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Tủ quần áo", "Bàn làm việc"],
    imageCount: 3,
  },
  {
    fullName: "Nguyễn Văn Tiến",
    phone: "0901112223",
    avatarImg: 51,
    title: "Phòng trọ Cầu Giấy gần ĐH Sư Phạm",
    description:
      "Phòng 20m² tại Dịch Vọng, cửa sổ thoáng. Máy lạnh, nóng lạnh, tủ quần áo đầy đủ. Khu nhiều quán ăn, đi bộ ra ĐH Sư Phạm 10 phút.",
    rentPrice: 3500000,
    city: "Hà Nội",
    district: "Cầu Giấy",
    ward: "Phường Dịch Vọng",
    address: "17 Trần Duy Hưng",
    latitude: 21.0301,
    longitude: 105.8003,
    availableFrom: "2026-10-01",
    preferredGender: "Không yêu cầu",
    roomType: "Phòng riêng",
    roomAreaSqm: 20,
    maxOccupants: 2,
    currentOccupants: 0,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 2,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Tủ quần áo", "Chỗ để xe"],
    imageCount: 3,
  },
  {
    fullName: "Đặng Thu Phương",
    phone: "0901222333",
    avatarImg: 45,
    title: "Phòng ghép nữ Cầu Giấy, sạch sẽ",
    description:
      "Phòng ghép nữ 20m² tại Nghĩa Đô, đã có 1 bạn nữ. Máy lạnh, nóng lạnh, máy giặt dùng chung. Ưu tiên người sạch sẽ, ít nấu ăn.",
    rentPrice: 3000000,
    city: "Hà Nội",
    district: "Cầu Giấy",
    ward: "Phường Nghĩa Đô",
    address: "82 Hoàng Quốc Việt",
    latitude: 21.0462,
    longitude: 105.795,
    availableFrom: "2026-09-22",
    preferredGender: "Nữ",
    roomType: "Phòng ghép",
    roomAreaSqm: 20,
    maxOccupants: 2,
    currentOccupants: 1,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 9,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Máy giặt", "Ban công"],
    imageCount: 2,
  },
  {
    fullName: "Trần Quang Huy",
    phone: "0901333444",
    avatarImg: 52,
    title: "Phòng Đống Đa, gần ĐH Giao Thông",
    description:
      "Phòng 18m² khu Đống Đa, phù hợp sinh viên nam. Có bàn làm việc và tủ quần áo. Điện 3.500đ/kWh, nước 20.000đ/m³.",
    rentPrice: 3200000,
    city: "Hà Nội",
    district: "Đống Đa",
    ward: "Phường Văn Chương",
    address: "27 Tôn Đức Thắng",
    latitude: 21.0135,
    longitude: 105.8318,
    availableFrom: "2026-09-30",
    preferredGender: "Nam",
    roomType: "Phòng riêng",
    roomAreaSqm: 18,
    maxOccupants: 1,
    currentOccupants: 0,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 4,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Bàn làm việc"],
    imageCount: 3,
  },
  {
    fullName: "Lý Hải Yến",
    phone: "0901444555",
    avatarImg: 47,
    title: "Phòng ghép nữ Đống Đa, gần ĐH Y",
    description:
      "Phòng 22m² tại Văn Chương, đã có 1 bạn nữ làm bệnh viện. Máy giặt, ban công phơi đồ, nấu ăn nhẹ. Ưu tiên người trung thực, ít ồn.",
    rentPrice: 3400000,
    city: "Hà Nội",
    district: "Đống Đa",
    ward: "Phường Văn Chương",
    address: "88 Văn Chương",
    latitude: 21.0172,
    longitude: 105.8321,
    availableFrom: "2026-09-18",
    preferredGender: "Nữ",
    roomType: "Phòng ghép",
    roomAreaSqm: 22,
    maxOccupants: 2,
    currentOccupants: 1,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 40,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Máy giặt", "Ban công", "Bếp"],
    imageCount: 2,
  },
  {
    fullName: "Nguyễn Trí Dũng",
    phone: "0901555666",
    avatarImg: 53,
    title: "Studio Hai Bà Trưng, có ban công",
    description:
      "Studio 18m² khu Bạch Mai, phù hợp người độc thân. Nội thất cơ bản, ban công riêng, gần chợ và bệnh viện. Có thể để xe trong nhà.",
    rentPrice: 3300000,
    city: "Hà Nội",
    district: "Hai Bà Trưng",
    ward: "Phường Bạch Mai",
    address: "15 Phương Mai",
    latitude: 21.0045,
    longitude: 105.8395,
    availableFrom: "2026-10-12",
    preferredGender: "Không yêu cầu",
    roomType: "Studio",
    roomAreaSqm: 18,
    maxOccupants: 1,
    currentOccupants: 0,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 5,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Ban công", "Chỗ để xe"],
    imageCount: 3,
  },
  {
    fullName: "Phan Thị Bích Ngọc",
    phone: "0901666777",
    avatarImg: 27,
    title: "Phòng riêng Hai Bà Trưng, gần Hồ Bảy Mẫu",
    description:
      "Phòng 22m² có cửa sổ lớn hướng Đông. Nội thất cơ bản, khu dân trí cao. Cách công viên Thống Nhất 10 phút đi xe.",
    rentPrice: 3900000,
    city: "Hà Nội",
    district: "Hai Bà Trưng",
    ward: "Phường Lê Đại Hành",
    address: "36 Lò Đúc",
    latitude: 21.0085,
    longitude: 105.8329,
    availableFrom: "2026-10-03",
    preferredGender: "Không yêu cầu",
    roomType: "Phòng riêng",
    roomAreaSqm: 22,
    maxOccupants: 2,
    currentOccupants: 0,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 2,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Tủ quần áo", "Bàn làm việc"],
    imageCount: 3,
  },
  {
    fullName: "Hoàng Anh Tuấn",
    phone: "0901666778",
    avatarImg: 55,
    title: "Phòng Ba Đình gần sân Mỹ Đình",
    description:
      "Phòng 20m² khu Ba Đình, hẻm rộng. Máy lạnh, nóng lạnh đầy đủ. Điện nước theo giá nhà nước, chủ nhà thân thiện.",
    rentPrice: 3600000,
    city: "Hà Nội",
    district: "Cầu Giấy",
    ward: "Phường Nghĩa Đô",
    address: "144 Nguyễn Văn Cừ",
    latitude: 21.0345,
    longitude: 105.814,
    availableFrom: "2026-09-12",
    preferredGender: "Không yêu cầu",
    roomType: "Phòng riêng",
    roomAreaSqm: 20,
    maxOccupants: 2,
    currentOccupants: 0,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 70,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Chỗ để xe", "Tủ quần áo"],
    imageCount: 2,
  },
  {
    fullName: "Nguyễn Thị Hồng",
    phone: "0901666779",
    avatarImg: 44,
    title: "Phòng ghép nữ Cầu Giấy, gần ĐH Quốc Gia",
    description:
      "Phòng 20m² tại Dịch Vọng Hậu, gần ĐH Quốc Gia. Đã có 1 bạn nữ. Ưu tiên sinh viên. Điện 3.500đ/kWh, nước tính theo người.",
    rentPrice: 3100000,
    city: "Hà Nội",
    district: "Cầu Giấy",
    ward: "Phường Dịch Vọng Hậu",
    address: "6 Dịch Vọng Hậu",
    latitude: 21.033,
    longitude: 105.7896,
    availableFrom: "2026-09-12",
    preferredGender: "Nữ",
    roomType: "Phòng ghép",
    roomAreaSqm: 20,
    maxOccupants: 2,
    currentOccupants: 1,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 33,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Máy giặt"],
    imageCount: 2,
  },
  {
    fullName: "Vũ Anh Khoa",
    phone: "0901888999",
    avatarImg: 56,
    title: "Phòng lớn Quận 1, gần phố đi bộ",
    description:
      "Phòng 26m², hai cửa sổ, gần phố đi bộ Nguyễn Huệ. Máy lạnh, nóng lạnh, wifi mạnh. Phù hợp nhân viên văn phòng hoặc làm việc remote.",
    rentPrice: 4800000,
    city: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Nghé",
    address: "101 Hai Bà Trưng",
    latitude: 10.778,
    longitude: 106.704,
    availableFrom: "2026-09-05",
    preferredGender: "Nữ",
    roomType: "Phòng riêng",
    roomAreaSqm: 26,
    maxOccupants: 2,
    currentOccupants: 0,
    smokingAllowed: false,
    petAllowed: true,
    ageDays: 35,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Thang máy", "Camera an ninh"],
    imageCount: 3,
  },
  {
    fullName: "Đoàn Thanh Tùng",
    phone: "0901777888",
    avatarImg: 56,
    title: "Phòng Quận 7, gần Phú Mỹ Hưng",
    description:
      "Phòng 22m² khu Tân Phú, gần Phú Mỹ Hưng. Máy lạnh, nóng lạnh, wifi đầy đủ. Hẻm xe hơi, chỗ để xe riêng.",
    rentPrice: 3400000,
    city: "TP. Hồ Chí Minh",
    district: "Quận 7",
    ward: "Phường Tân Phú",
    address: "65 Nguyễn Thị Thập",
    latitude: 10.7342,
    longitude: 106.7205,
    availableFrom: "2026-10-02",
    preferredGender: "Không yêu cầu",
    roomType: "Phòng riêng",
    roomAreaSqm: 22,
    maxOccupants: 2,
    currentOccupants: 0,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 40,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Chỗ để xe", "Tủ quần áo"],
    imageCount: 2,
  },
  {
    fullName: "Mai Thị Cẩm",
    phone: "0901999000",
    avatarImg: 5,
    title: "Phòng Thủ Đức gần Vincom",
    description:
      "Phòng 20m² tại Hiệp Bình Chánh, gần Vincom Thủ Đức. Máy lạnh, nóng lạnh, bếp dùng chung. Phù hợp nhân viên văn phòng quanh khu vực.",
    rentPrice: 3000000,
    city: "TP. Hồ Chí Minh",
    district: "Thủ Đức",
    ward: "Phường Hiệp Bình Chánh",
    address: "48 Phạm Văn Đồng",
    latitude: 10.8405,
    longitude: 106.7269,
    availableFrom: "2026-10-14",
    preferredGender: "Nữ",
    roomType: "Phòng riêng",
    roomAreaSqm: 20,
    maxOccupants: 2,
    currentOccupants: 0,
    smokingAllowed: false,
    petAllowed: false,
    ageDays: 1,
    amenities: ["Wifi", "Máy lạnh", "Nóng lạnh", "Bếp", "Máy giặt"],
    imageCount: 3,
  },
];

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function availableFromDate(days: number): string {
  // available_from is a DATE column; keep it a plain YYYY-MM-DD.
  const date = new Date(Date.now() - days * 86_400_000);
  return date.toISOString().slice(0, 10);
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Ensure the "user" role exists (seed accounts are regular users).
    const roleRes = await client.query(
      `INSERT INTO roles (name) VALUES ('user')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
    );
    const roleId = roleRes.rows[0].id as string;

    // 2. Remove any previously seeded accounts (cascades to listings/profiles).
    const del = await client.query(
      `DELETE FROM users WHERE email LIKE $1`,
      [`${SEED_EMAIL_LOCAL}%@roomie.vn`],
    );
    if ((del.rowCount ?? 0) > 0) {
      console.log(`- Removed ${del.rowCount} previously seeded account(s)`);
    }

    // 3. Upsert the amenity catalog needed by the listings.
    const amenityIds = new Map<string, string>();
    for (const name of AMENITIES) {
      const res = await client.query(
        `INSERT INTO amenities (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
         RETURNING id`,
        [name],
      );
      amenityIds.set(name, res.rows[0].id as string);
    }

    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

    // 4. Insert owners + listings.
    let index = 0;
    for (const item of LISTINGS) {
      index += 1;
      const email = `${SEED_EMAIL_LOCAL}${String(index).padStart(2, "0")}${SEED_EMAIL_DOMAIN}`;
      const avatarUrl = `https://i.pravatar.cc/150?img=${item.avatarImg}`;

      const userRes = await client.query<{ id: string }>(
        `INSERT INTO users (
           role_id, email, username, password_hash, full_name, phone_number,
           avatar_url, auth_provider, is_email_verified, is_active,
           last_active_at, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, 'local', TRUE, TRUE,
           NOW() - make_interval(days => $8), NOW() - make_interval(days => $9), NOW()
         )
         RETURNING id`,
        [
          roleId,
          email,
          item.phone,
          passwordHash,
          item.fullName,
          item.phone,
          avatarUrl,
          item.ageDays + 5,
          item.ageDays + 10,
        ],
      );
      const userId = userRes.rows[0].id;

      // 5. Lifestyle profile so match scoring has something to compare.
      await client.query(
        `INSERT INTO user_lifestyle_profiles (
           user_id, preferred_district, auto_match_enabled,
           cleanliness, ac_usage, pet_status, smoking_status,
           cooking, guest, home_frequency, work_schedule,
           sharing, noise, call_frequency, game_mic
         ) VALUES (
           $1, $2, TRUE,
           $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11, $12, $13, $14
         )`,
        [
          userId,
          item.district,
          (index % 4) + 1, // cleanliness 1-4
          (index % 5) + 1, // ac_usage 1-5
          index % 2, // pet_status 0/1
          item.smokingAllowed ? 1 : 0,
          (index % 3) + 1, // cooking 1-3
          (index % 3) + 1, // guest 1-3
          (index % 3) + 1, // home_frequency 1-3
          ["DAY", "FLEXIBLE", "NIGHT"][index % 3],
          (index % 3) + 1, // sharing 1-3
          (index % 3) + 1, // noise 1-3
          (index % 4) + 1, // call_frequency 1-4
          (index % 4) + 1, // game_mic 1-4
        ],
      );

      // 6. The listing itself — immediately APPROVED + published.
      const publishedAt = daysAgoIso(item.ageDays);
      const listingRes = await client.query<{ id: string }>(
        `INSERT INTO listings (
           owner_id, source, title, description, rent_price,
           city, district, ward, address, latitude, longitude,
           available_from, preferred_gender, room_type, room_area_sqm,
           max_occupants, current_occupants, smoking_allowed, pet_allowed,
           status, published_at, expires_at, created_at, updated_at
         ) VALUES (
           $1, NULL, $2, $3, $4,
           $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14,
           $15, $16, $17, $18,
           'APPROVED', $19, $20, $19, NOW()
         )
         RETURNING id`,
        [
          userId,
          item.title,
          item.description,
          item.rentPrice,
          item.city,
          item.district,
          item.ward,
          item.address,
          item.latitude,
          item.longitude,
          availableFromDate(item.ageDays),
          item.preferredGender,
          item.roomType,
          item.roomAreaSqm,
          item.maxOccupants,
          item.currentOccupants,
          item.smokingAllowed,
          item.petAllowed,
          publishedAt,
          daysAgoIso(item.ageDays - 90), // published => expires in ~90 days
        ],
      );
      const listingId = listingRes.rows[0].id;

      // 7. Images.
      for (let i = 0; i < item.imageCount; i += 1) {
        await client.query(
          `INSERT INTO listing_images (listing_id, image_url, display_order)
           VALUES ($1, $2, $3)`,
          [listingId, imageUrl(index * 3 + i), i],
        );
      }

      // 8. Amenities.
      for (const name of item.amenities) {
        const amenityId = amenityIds.get(name);
        if (!amenityId) continue;
        await client.query(
          `INSERT INTO listing_amenity (listing_id, amenity_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [listingId, amenityId],
        );
      }
    }

    await client.query("COMMIT");
    console.log(`Seeded ${LISTINGS.length} owner(s) and listing(s) successfully.`);
    console.log(`Demo password for every seeded account: ${SEED_PASSWORD}`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

const AMENITIES = [
  "Wifi",
  "Máy lạnh",
  "Nóng lạnh",
  "Tủ lạnh",
  "Máy giặt",
  "Chỗ để xe",
  "Bếp",
  "Tủ quần áo",
  "Giường",
  "Bàn làm việc",
  "Thang máy",
  "Camera an ninh",
  "Ban công",
  "Nội thất cơ bản",
];

void run();
