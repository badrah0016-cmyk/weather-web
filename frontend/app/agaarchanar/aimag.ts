// Станцын аймгийг тодорхойлно.
// 1) API-ийн талбар (aimag гэх мэт) 2) станцын нэрийн угтвар 3) үлдсэн нь Улаанбаатар

export const UB = "Улаанбаатар";

// [станцын нэрийн угтвар, аймаг]
const NAME_TO_AIMAG: [string, string][] = [
  ["Баруун-Урт", "Сүхбаатар"],
  ["Баян-Өлгий", "Баян-Өлгий"],
  ["Баянхонгор", "Баянхонгор"],
  ["Даланзадгад", "Өмнөговь"],
  ["Мандалговь", "Дундговь"],
  ["Сайншанд", "Дорноговь"],
  ["Чойбалсан", "Дорнод"],
  ["Арвайхээр", "Өвөрхангай"],
  ["Улаангом", "Увс"],
  ["Улиастай", "Завхан"],
  ["Өндөрхаан", "Хэнтий"],
  ["Цэцэрлэг", "Архангай"],
  ["Сүхбаатар", "Сэлэнгэ"],
  ["Зуунмод", "Төв"],
  ["Эрдэнэт", "Орхон"],
  ["Дархан", "Дархан-Уул"],
  ["Булган", "Булган"],
  ["Мөрөн", "Хөвсгөл"],
  ["Алтай", "Говь-Алтай"],
  ["Ховд", "Ховд"],
  ["Чойр", "Говьсүмбэр"],
];

const FIELDS = ["aimag", "aimag_ner", "aimagNer", "aimag_name", "aimagName", "province"];

export function getAimag(station: object): string {
  const item = station as Record<string, unknown>;

  for (const key of FIELDS) {
    const v = item[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  const name = String(item.ner ?? item.ner_en ?? "").trim().toLocaleLowerCase("mn-MN");

  for (const [prefix, aimag] of NAME_TO_AIMAG) {
    if (name.startsWith(prefix.toLocaleLowerCase("mn-MN"))) return aimag;
  }

  return UB;
}