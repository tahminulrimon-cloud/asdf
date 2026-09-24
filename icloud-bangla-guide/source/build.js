const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, AlignmentType, HeadingLevel, PageBreak, Header, Footer, PageNumber, LevelFormat,
  VerticalAlign, TableLayoutType, LineRuleType,
} = require("docx");

const IMG = path.join(__dirname, "img");
const FONT = "Nirmala UI";
const F = { ascii: FONT, hAnsi: FONT, cs: FONT, eastAsia: FONT };
const W = 9866; // content width (A4, 1.8 cm margins)

const C = {
  blue: "0A5FD1", navy: "12325B", teal: "0E8A9E", green: "1E8E3E", orange: "C25E00", red: "C62828",
  purple: "6A3FB5", gray: "5F6368", light: "EEF4FD", greenBg: "E8F5EC", orangeBg: "FFF3E0", redBg: "FDECEC",
  purpleBg: "F3EDFB", grayBg: "F4F5F7", tealBg: "E4F5F8",
};

// ---------- text helpers ----------
function runs(s, o = {}) {
  // **bold** segments
  return s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((seg) => {
    const b = seg.startsWith("**");
    const t = b ? seg.slice(2, -2) : seg;
    return new TextRun({
      text: t, font: F, size: o.size || 22, sizeComplexScript: o.size || 22,
      bold: b || o.bold, boldComplexScript: b || o.bold, color: o.color || (b ? o.boldColor : undefined),
      italics: o.italics, italicsComplexScript: o.italics,
    });
  });
}
const p = (s, o = {}) => new Paragraph({
  children: runs(s, o), alignment: o.align || AlignmentType.JUSTIFIED,
  spacing: { after: o.after ?? 120, before: o.before ?? 0, line: 300, lineRule: LineRuleType.AUTO }, keepNext: o.keepNext,
});
const bullet = (s, lvl = 0) => new Paragraph({
  numbering: { reference: "bul", level: lvl }, children: runs(s), spacing: { after: 60, line: 290, lineRule: LineRuleType.AUTO },
});
const h1 = (s) => { const x = new Paragraph({
  heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: runs(s, { size: 34, bold: true, color: C.navy }),
  spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: C.blue, space: 6 } },
}); H1S.add(x); return x; };
const h2 = (s) => new Paragraph({
  heading: HeadingLevel.HEADING_2, children: runs(s, { size: 27, bold: true, color: C.blue }),
  spacing: { before: 260, after: 120 }, keepNext: true,
});
const h3 = (s) => new Paragraph({
  heading: HeadingLevel.HEADING_3, children: runs(s, { size: 23, bold: true, color: C.teal }),
  spacing: { before: 160, after: 80 }, keepNext: true,
});

const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
const thin = (c = "C9D3E0") => ({ style: BorderStyle.SINGLE, size: 4, color: c });

function cell(children, width, o = {}) {
  return new TableCell({
    children: Array.isArray(children) ? children : [children],
    width: { size: width, type: WidthType.DXA },
    shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
    margins: { top: o.mt ?? 90, bottom: o.mb ?? 90, left: o.ml ?? 140, right: o.mr ?? 140 },
    verticalAlign: o.valign || VerticalAlign.CENTER, borders: o.borders, columnSpan: o.span,
  });
}

// Callout box: kind = tip | warn | info | secret
const BOX = {
  tip: ["টিপস", C.green, C.greenBg], warn: ["সতর্কতা", C.red, C.redBg],
  info: ["জেনে রাখুন", C.blue, C.light], secret: ["গোপন কৌশল", C.purple, C.purpleBg],
};
function box(kind, lines, title) {
  const [label, col, bg] = BOX[kind];
  const kids = [new Paragraph({ children: runs(title ? `${label}: ${title}` : label, { bold: true, color: col, size: 22 }), spacing: { after: 60 } })];
  (Array.isArray(lines) ? lines : [lines]).forEach((l) => kids.push(new Paragraph({ children: runs(l, { size: 21 }), spacing: { after: 50, line: 280, lineRule: LineRuleType.AUTO } })));
  return [new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    rows: [new TableRow({ cantSplit: true, children: [cell(kids, W, {
      fill: bg, ml: 220, borders: { left: { style: BorderStyle.SINGLE, size: 36, color: col }, top: none, bottom: none, right: none },
    })] })],
  }), spacer(80)];
}
const SPACERS = new Set();
const spacer = (after = 120) => { const x = new Paragraph({ children: [], spacing: { after, before: 0, line: 200, lineRule: LineRuleType.AUTO } }); SPACERS.add(x); return x; };

// Settings path strip
function pathBox(label, pth) {
  return [new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [1700, W - 1700],
    rows: [new TableRow({ cantSplit: true, children: [
      cell(new Paragraph({ children: runs(label, { bold: true, color: "FFFFFF", size: 20 }), alignment: AlignmentType.CENTER }), 1700, { fill: C.navy, borders: noBorders }),
      cell(new Paragraph({ children: runs(pth, { bold: true, color: C.navy, size: 21 }) }), W - 1700, { fill: "E3ECF8", borders: noBorders }),
    ] })],
  }), spacer(100)];
}

// Numbered steps with coloured number chips
const BN = "০১২৩৪৫৬৭৮৯";
const bn = (n) => String(n).split("").map((d) => BN[+d] ?? d).join("");
function steps(list, col = C.blue) {
  return [new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [700, W - 700],
    rows: list.map((s, i) => new TableRow({ cantSplit: true, children: [
      cell(new Paragraph({ children: runs(bn(i + 1), { bold: true, color: "FFFFFF", size: 26 }), alignment: AlignmentType.CENTER }), 700, {
        fill: col, borders: { top: thin("FFFFFF"), bottom: thin("FFFFFF"), left: none, right: none },
      }),
      cell(new Paragraph({ children: runs(s), spacing: { line: 280, lineRule: LineRuleType.AUTO } }), W - 700, {
        fill: i % 2 ? "FFFFFF" : C.grayBg, borders: { top: thin("FFFFFF"), bottom: thin("FFFFFF"), left: none, right: none },
      }),
    ] })),
  }), spacer(120)];
}

function image(file, wpx) {
  const buf = fs.readFileSync(path.join(IMG, file));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  return new ImageRun({ type: "png", data: buf, transformation: { width: wpx, height: Math.round((wpx * h) / w) },
    altText: { title: file, description: file, name: file } });
}
let figNo = 0;
function caption(s) {
  figNo++;
  return new Paragraph({ children: runs(`চিত্র ${bn(figNo)}: ${s}`, { size: 19, italics: true, color: C.gray }), alignment: AlignmentType.CENTER, spacing: { after: 200 } });
}
function figure(file, wpx, cap) {
  return [new Paragraph({ children: [image(file, wpx)], alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 80, after: 60, line: 240, lineRule: LineRuleType.AUTO } }), caption(cap)];
}

// Phone mock-up on the left, numbered legend on the right
function phoneFig(file, cap, legend, wpx = 215) {
  const L = 3700, R = W - L;
  const rows = legend.map((t, i) => new TableRow({ cantSplit: true, children: [
    cell(new Paragraph({ children: runs(bn(i + 1), { bold: true, color: "FFFFFF", size: 22 }), alignment: AlignmentType.CENTER }), 520, { fill: "E53935", ml: 40, mr: 40, borders: noBorders }),
    cell(new Paragraph({ children: runs(t, { size: 21 }), spacing: { line: 270, lineRule: LineRuleType.AUTO } }), R - 520 - 280, { borders: { bottom: thin("E1E5EA"), top: none, left: none, right: none } }),
  ] }));
  const legendTable = new Table({ width: { size: R - 280, type: WidthType.DXA }, columnWidths: [520, R - 520 - 280], rows });
  return [new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [L, R], layout: TableLayoutType.FIXED,
    rows: [new TableRow({ cantSplit: true, children: [
      cell([new Paragraph({ children: [image(file, wpx)], alignment: AlignmentType.CENTER })], L, { borders: noBorders, ml: 0, mr: 0 }),
      cell([new Paragraph({ children: runs("ছবিতে চিহ্নিত অংশসমূহ", { bold: true, color: C.navy, size: 22 }), spacing: { after: 100 } }), legendTable, spacer(0)], R, { borders: noBorders, valign: VerticalAlign.CENTER, mr: 0 }),
    ] })],
  }), caption(cap)];
}

// Generic data table
function table(headers, data, widths, o = {}) {
  const head = new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => cell(
    new Paragraph({ children: runs(h, { bold: true, color: "FFFFFF", size: 21 }), alignment: AlignmentType.CENTER }), widths[i], { fill: o.head || C.navy, borders: { top: thin(), bottom: thin(), left: thin(), right: thin() } })) });
  const body = data.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((v, i) => cell(
    new Paragraph({ children: runs(String(v), { size: o.size || 20, bold: i === 0 && o.firstBold }), alignment: (o.center || []).includes(i) ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { line: 270, lineRule: LineRuleType.AUTO } }),
    widths[i], { fill: ri % 2 ? "FFFFFF" : C.grayBg, mt: 70, mb: 70, ml: 110, mr: 110, borders: { top: thin(), bottom: thin(), left: thin(), right: thin() } })) }));
  return [new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows: [head, ...body] }), spacer(160)];
}

// ======================= CONTENT =======================
const body = [];
const H1S = new Set();
const add = (...xs) => xs.flat().forEach((x) => {
  // drop a trailing spacer before a page-breaking heading so it cannot spill onto a blank page
  if (H1S.has(x) && SPACERS.has(body[body.length - 1])) body.pop();
  body.push(x);
});

// ---------- Cover ----------
add(
  new Paragraph({ children: [image("cover.png", 640)], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
  new Paragraph({ children: runs("আইক্লাউড (iCloud)", { size: 64, bold: true, color: C.navy }), alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
  new Paragraph({ children: runs("সম্পূর্ণ সচিত্র ব্যবহার নির্দেশিকা", { size: 40, bold: true, color: C.blue }), alignment: AlignmentType.CENTER, spacing: { after: 240 } }),
  new Paragraph({ children: runs("সেরা, সর্বোত্তম ও একচেটিয়া ব্যবহার — গোপন টিপস ও ট্রিকস সহ", { size: 26, color: C.gray }), alignment: AlignmentType.CENTER, spacing: { after: 500 } }),
);
add(table(["এই নির্দেশিকায় যা পাবেন", ""], [
  ["সচিত্র ধাপ", "প্রতিটি গুরুত্বপূর্ণ সেটিংসের মক-আপ ছবি ও নম্বরযুক্ত ব্যাখ্যা"],
  ["স্টোরেজ সাশ্রয়", "টাকা খরচ না করে আইক্লাউড জায়গা খালি করার কার্যকর কৌশল"],
  ["নিরাপত্তা", "অ্যাকাউন্ট সুরক্ষার পাঁচ স্তর — পাসকোড থেকে অ্যাডভান্সড ডেটা প্রোটেকশন"],
  ["৩০টি গোপন কৌশল", "খুব কম ব্যবহারকারী জানেন এমন কাজের টিপস"],
  ["দ্রুত রেফারেন্স", "সেটিংস পথ, সমস্যা সমাধান টেবিল ও মাসিক চেকলিস্ট — প্রিন্ট করে হাতের কাছে রাখুন"],
], [2600, W - 2600], { firstBold: true }));
add(p("ভিত্তি: iOS/iPadOS ১৭–১৮ ও পরবর্তী, macOS Sonoma/Sequoia ও পরবর্তী এবং iCloud.com। সফটওয়্যার সংস্করণভেদে মেনুর নাম সামান্য ভিন্ন হতে পারে; ছবিগুলো বোঝানোর সুবিধার্থে তৈরি নমুনা চিত্র।", { size: 18, color: C.gray, align: AlignmentType.CENTER }));

// ---------- Contents ----------
const chapters = [
  "আইক্লাউড পরিচিতি", "প্রথম সেটআপ: সঠিক শুরু", "স্টোরেজ ব্যবস্থাপনা ও সঠিক প্ল্যান নির্বাচন", "আইক্লাউড ফটোস",
  "আইক্লাউড ড্রাইভ ও ফাইলস", "আইক্লাউড ব্যাকআপ ও রিস্টোর", "পাসওয়ার্ড, পাসকি ও কিচেইন", "iCloud+ এর একচেটিয়া সুবিধা",
  "ফাইন্ড মাই: হারানো ডিভাইস খোঁজা", "ফ্যামিলি শেয়ারিং", "নিরাপত্তা ও গোপনীয়তা", "iCloud.com ও ডেটা রিকভারি",
  "৩০টি গোপন টিপস ও ট্রিকস", "সমস্যা ও সমাধান",
];
add(new Paragraph({ pageBreakBefore: true, children: runs("সূচিপত্র", { size: 34, bold: true, color: C.navy }), spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: C.blue, space: 6 } } }));
add(table(["অধ্যায়", "বিষয়"], [
  ...chapters.map((c, i) => [bn(i + 1), c]),
  ["পরিশিষ্ট ক", "দ্রুত রেফারেন্স: গুরুত্বপূর্ণ সেটিংসের পথ"],
  ["পরিশিষ্ট খ", "মাসিক রক্ষণাবেক্ষণ চেকলিস্ট"],
  ["পরিশিষ্ট গ", "শব্দকোষ"],
], [1600, W - 1600], { center: [0], size: 22 }));
add(box("info", [
  "ছবিতে লাল বৃত্তের **নম্বর** (১, ২, ৩ …) পাশের ব্যাখ্যা-তালিকার একই নম্বরের সাথে মিলিয়ে পড়ুন।",
  "**পথ** লেখা নীল ফিতায় মেনুর ধাপগুলো “>” চিহ্ন দিয়ে দেখানো হয়েছে; মেনুর নাম ডিভাইসে ইংরেজিতে যেমন দেখায় তেমনই রাখা হয়েছে।",
  "“**[আপনার নাম]**” মানে সেটিংস অ্যাপের একেবারে উপরে আপনার নাম ও ছবিযুক্ত Apple Account অংশ।",
], "এই বইটি কীভাবে পড়বেন"));

// ---------- Ch 1 ----------
add(h1("অধ্যায় ১: আইক্লাউড পরিচিতি"));
add(p("আইক্লাউড (iCloud) হলো অ্যাপলের ক্লাউড সেবা, যা আপনার ছবি, ফাইল, পাসওয়ার্ড, নোট, মেসেজ, ক্যালেন্ডার ও ডিভাইসের ব্যাকআপ নিরাপদে অনলাইনে সংরক্ষণ করে এবং একই **Apple Account** (পূর্বে Apple ID) দিয়ে সাইন-ইন করা সব ডিভাইসে স্বয়ংক্রিয়ভাবে একই রাখে। আইফোনে তোলা ছবি মুহূর্তেই ম্যাক বা আইপ্যাডে পাওয়া যায়, আবার ফোন হারালেও ডেটা হারায় না।"));
add(figure("diagram_ecosystem.png", 600, "এক অ্যাপল অ্যাকাউন্টের মাধ্যমে সব ডিভাইসে আইক্লাউড সিঙ্ক"));
add(h2("১.১ আইক্লাউড বনাম iCloud+"));
add(table(["বিষয়", "বিনামূল্যের iCloud", "iCloud+ (সাবস্ক্রিপশন)"], [
  ["স্টোরেজ", "৫ GB", "৫০ GB থেকে ১২ TB পর্যন্ত"],
  ["ফটোস, ড্রাইভ, ব্যাকআপ, পাসওয়ার্ড, ফাইন্ড মাই", "আছে", "আছে"],
  ["Private Relay (ব্রাউজিং গোপনীয়তা)", "নেই", "আছে"],
  ["Hide My Email (অসীম ছদ্ম ইমেইল)", "সীমিত (শুধু Sign in with Apple)", "আছে"],
  ["নিজস্ব ডোমেইনে ইমেইল (Custom Email Domain)", "নেই", "আছে"],
  ["HomeKit Secure Video (সিসি ক্যামেরা রেকর্ডিং)", "নেই", "আছে"],
  ["পরিবারের সাথে স্টোরেজ শেয়ার", "নেই", "সর্বোচ্চ ৫ জন সদস্যের সাথে"],
], [3900, 2900, W - 6800], { firstBold: true }));
add(box("info", "আইক্লাউড কোনো আলাদা অ্যাপ নয়; এটি আইফোন/ম্যাকের ভেতরে থাকা একটি সেবা। ফটোস, ফাইলস, নোটস, পাসওয়ার্ডস ইত্যাদি অ্যাপ নিজেই আইক্লাউড ব্যবহার করে সিঙ্ক করে।"));

// ---------- Ch 2 ----------
add(h1("অধ্যায় ২: প্রথম সেটআপ — সঠিক শুরু"));
add(p("সঠিকভাবে শুরু করলে পরে স্টোরেজ সমস্যা, ডুপ্লিকেট ছবি বা হারানো ডেটার ঝামেলা হয় না। নিচের ছবিটি আইফোনের মূল আইক্লাউড পাতা — এই নির্দেশিকার প্রায় সব কাজ এখান থেকেই শুরু।"));
add(pathBox("পথ", "Settings > [আপনার নাম] > iCloud"));
add(phoneFig("phone_icloud_main.png", "আইফোনের আইক্লাউড সেটিংস পাতা (নমুনা)", [
  "**Manage Account Storage** — কোন অ্যাপ কত জায়গা নিচ্ছে দেখুন, পুরনো ব্যাকআপ মুছুন ও প্ল্যান বদলান।",
  "**Photos** — আইক্লাউড ফটোস চালু/বন্ধ ও স্টোরেজ অপ্টিমাইজ (অধ্যায় ৪)।",
  "**See All** — নোটস, মেসেজ, কন্টাক্টস, সাফারি, হেলথসহ সব অ্যাপের সিঙ্ক আলাদাভাবে চালু/বন্ধ করুন।",
  "**iCloud Backup** — স্বয়ংক্রিয় ব্যাকআপ (অধ্যায় ৬)।",
  "**Private Relay** ও Hide My Email — iCloud+ সুবিধা (অধ্যায় ৮)।",
  "**Advanced Data Protection** — সর্বোচ্চ এন্ড-টু-এন্ড এনক্রিপশন (অধ্যায় ১১)।",
], 205));
add(h2("২.১ আইফোন/আইপ্যাডে সেটআপ"));
add(steps([
  "**Settings** অ্যাপ খুলে উপরে **Sign in to your iPhone** চাপুন এবং Apple Account-এর ইমেইল ও পাসওয়ার্ড দিন।",
  "টু-ফ্যাক্টর যাচাইয়ের ৬ অঙ্কের কোড দিন (অন্য অ্যাপল ডিভাইস বা এসএমএসে আসবে)।",
  "**[আপনার নাম] > iCloud** এ গিয়ে প্রয়োজনীয় অ্যাপগুলো চালু করুন — অন্তত Photos, iCloud Drive, Passwords, Contacts, Notes।",
  "**Find My > Find My iPhone** চালু আছে কিনা নিশ্চিত করুন (চুরি/হারানো প্রতিরোধে অপরিহার্য)।",
  "**iCloud Backup** চালু করে প্রথমবার **Back Up Now** চাপুন।",
]));
add(h2("২.২ ম্যাকে সেটআপ"));
add(pathBox("পথ", "Apple মেনু > System Settings > [আপনার নাম] > iCloud"));
add(steps([
  "একই Apple Account দিয়ে সাইন-ইন করুন।",
  "**iCloud Drive** খুলে **Sync this Mac** চালু করুন; চাইলে **Desktop & Documents Folders** চালু করুন (অধ্যায় ৫)।",
  "**Photos** অ্যাপ > Settings > iCloud থেকে **iCloud Photos** চালু করুন।",
  "**Passwords & Keychain** চালু রাখুন, যাতে আইফোনের পাসওয়ার্ড ম্যাকেও পাওয়া যায়।",
], C.teal));
add(h2("২.৩ উইন্ডোজ পিসি ও অ্যান্ড্রয়েডে আইক্লাউড"));
add(bullet("**উইন্ডোজ:** Microsoft Store থেকে **iCloud for Windows** ইনস্টল করুন। এতে File Explorer-এ iCloud Drive, Photos সিঙ্ক, Passwords অ্যাপ, Chrome/Edge-এর জন্য iCloud Passwords এক্সটেনশন এবং Outlook-এ মেইল/কন্টাক্ট/ক্যালেন্ডার সিঙ্ক পাওয়া যায়।"));
add(bullet("**অ্যান্ড্রয়েড/যেকোনো কম্পিউটার:** ব্রাউজারে **icloud.com** খুলে ফটোস, ড্রাইভ, মেইল, নোটস, রিমাইন্ডার ও Find Devices ব্যবহার করা যায়। অ্যান্ড্রয়েডে Chrome দিয়ে icloud.com খুলে “Add to Home screen” করলে অ্যাপের মতো ব্যবহার করা যায়।"));
add(box("warn", "সব ডিভাইসে **একই Apple Account** ব্যবহার করুন। পরিবারের সবাই এক অ্যাকাউন্ট শেয়ার করলে ছবি, মেসেজ ও কন্টাক্ট মিশে যায় — এর বদলে প্রত্যেকের নিজস্ব অ্যাকাউন্ট খুলে **ফ্যামিলি শেয়ারিং** (অধ্যায় ১০) ব্যবহার করুন।"));

// ---------- Ch 3 ----------
add(h1("অধ্যায় ৩: স্টোরেজ ব্যবস্থাপনা ও সঠিক প্ল্যান নির্বাচন"));
add(p("বিনামূল্যে পাওয়া ৫ GB জায়গা একটি আইফোনের ব্যাকআপ ও ছবির জন্য সাধারণত যথেষ্ট নয়। তবে প্ল্যান কেনার আগে অপ্রয়োজনীয় ডেটা সরিয়ে নিলে অনেক সময় ছোট প্ল্যানেই কাজ চলে।"));
add(figure("diagram_plans.png", 600, "iCloud+ স্টোরেজ ধাপ ও কার জন্য কোনটি উপযোগী"));
add(h2("৩.১ কোন প্ল্যান আপনার জন্য"));
add(table(["প্ল্যান", "উপযোগী ব্যবহারকারী", "মার্কিন মূল্য (মাসিক, রেফারেন্স)"], [
  ["৫ GB (ফ্রি)", "শুধু কন্টাক্ট, নোট, ক্যালেন্ডার ও পাসওয়ার্ড সিঙ্ক", "বিনামূল্যে"],
  ["৫০ GB", "একজন, অল্প ছবি; ছবি অন্যত্র ব্যাকআপ রাখেন", "$0.99"],
  ["২০০ GB", "একজন ভারী ব্যবহারকারী বা ২–৩ জনের ছোট পরিবার", "$2.99"],
  ["২ TB", "পুরো পরিবার (৬ জন পর্যন্ত), প্রচুর ৪K ভিডিও", "$9.99"],
  ["৬ TB", "ফটোগ্রাফার/কনটেন্ট নির্মাতা", "$29.99"],
  ["১২ TB", "বৃহৎ আর্কাইভ ও পেশাদার কাজ", "$59.99"],
], [1900, 5100, W - 7000], { firstBold: true, center: [2] }));
add(p("মূল্য দেশ ও মুদ্রাভেদে ভিন্ন হয় এবং পরিবর্তনশীল; আপনার দেশের সঠিক মূল্য **Settings > [আপনার নাম] > iCloud > Manage Account Storage > Change Storage Plan** পাতায় দেখুন।", { size: 19, color: C.gray }));
add(box("secret", [
  "অ্যাপল মিউজিক, টিভি+, আর্কেড ইত্যাদি ব্যবহার করলে **Apple One** বান্ডেলে iCloud+ স্টোরেজ অন্তর্ভুক্ত থাকে — আলাদা আলাদা কেনার চেয়ে সাশ্রয়ী হতে পারে।",
  "পরিবারের ২–৩ জন আলাদা ৫০ GB কেনার চেয়ে একজন ২০০ GB কিনে ফ্যামিলি শেয়ারিংয়ে ভাগ করা সাধারণত সস্তা।",
], "প্ল্যানে টাকা বাঁচান"));
add(h2("৩.২ টাকা খরচ না করে জায়গা খালি করার ৮টি কৌশল"));
add(table(["কৌশল", "কোথায় করবেন", "প্রভাব"], [
  ["পুরনো ডিভাইসের ব্যাকআপ মুছুন", "Manage Account Storage > Backups > পুরনো ডিভাইস > Delete", "অনেক বেশি"],
  ["ব্যাকআপ থেকে বড় অ্যাপ বাদ দিন", "Manage Account Storage > Backups > এই ডিভাইস > অ্যাপ টগল বন্ধ", "বেশি"],
  ["WhatsApp ব্যাকআপে ভিডিও বাদ দিন", "WhatsApp > Settings > Chats > Chat Backup > Include Videos বন্ধ", "বেশি"],
  ["মুছে ফেলা ছবি স্থায়ীভাবে মুছুন", "Photos > Recently Deleted > Delete All", "মাঝারি"],
  ["ডুপ্লিকেট ছবি একত্র করুন", "Photos > Utilities > Duplicates > Merge", "মাঝারি"],
  ["বড় ভিডিও খুঁজে সরান", "Photos > Media Types > Videos (বড় ফাইল আগে দেখুন)", "বেশি"],
  ["মেসেজের বড় সংযুক্তি মুছুন", "Settings > General > iPhone Storage > Messages > Review Large Attachments", "মাঝারি"],
  ["iCloud Drive-এর Recently Deleted খালি করুন", "Files > Browse > Recently Deleted > Delete All", "কম–মাঝারি"],
], [3200, 5000, W - 8200], { firstBold: true, center: [2] }));
add(box("warn", "ব্যাকআপ মুছলে তা আর ফেরত আনা যায় না। নিশ্চিত হোন যে ডিভাইসটি আর ব্যবহার করছেন না বা তার নতুন ব্যাকআপ আছে। উল্লেখ্য, কোনো ডিভাইস ১৮০ দিন ব্যাকআপ না নিলে অ্যাপল নিজেই সেই ব্যাকআপ মুছে দিতে পারে।"));

// ---------- Ch 4 ----------
add(h1("অধ্যায় ৪: আইক্লাউড ফটোস"));
add(p("আইক্লাউড ফটোস আপনার সব ছবি ও ভিডিও মূল রেজোলিউশনে আইক্লাউডে রাখে এবং সব ডিভাইসে একই লাইব্রেরি দেখায়। একটি ডিভাইসে কোনো ছবি সম্পাদনা বা মুছলে সব ডিভাইসে তা প্রতিফলিত হয়।"));
add(pathBox("পথ", "Settings > [আপনার নাম] > iCloud > Photos"));
add(phoneFig("phone_photos.png", "আইক্লাউড ফটোস সেটিংস (নমুনা)", [
  "**iCloud Photos** — চালু করলে পুরো লাইব্রেরি আইক্লাউডে আপলোড হয়।",
  "**Optimize iPhone Storage** — ফোনে ছোট সংস্করণ থাকে, মূল কপি আইক্লাউডে; ফোনের জায়গা বাঁচাতে এটিই সেরা।",
  "**Shared Library** — পরিবারের সর্বোচ্চ ৬ জন মিলে একটি যৌথ লাইব্রেরি।",
  "**Shared Albums** — নির্বাচিত ছবি শেয়ার; এর জায়গা আপনার কোটা থেকে কাটে না।",
  "**Use Face ID** — Hidden ও Recently Deleted অ্যালবাম খুলতে ফেস আইডি লাগবে।",
]));
add(h2("৪.১ অপ্টিমাইজ বনাম ডাউনলোড — কোনটি বেছে নেবেন"));
add(table(["বিকল্প", "ফোনে কী থাকে", "কখন বেছে নেবেন"], [
  ["Optimize iPhone Storage", "ছোট প্রিভিউ; প্রয়োজনে মূল ছবি নামে", "ফোনের স্টোরেজ কম, ইন্টারনেট সাধারণত আছে"],
  ["Download and Keep Originals", "সব ছবির পূর্ণ মূল কপি", "ফোনে যথেষ্ট জায়গা আছে, অফলাইনে সম্পাদনা করেন, বা একটি অতিরিক্ত স্থানীয় কপি চান"],
], [3000, 3200, W - 6200], { firstBold: true }));
add(box("tip", [
  "একটি ম্যাক বা পিসিতে **Download Originals** চালু রাখুন — এতে আইক্লাউডের বাইরে আপনার ছবির একটি সম্পূর্ণ স্থানীয় কপি থাকবে।",
  "**শেয়ার্ড অ্যালবামে** ছবি কিছুটা কম রেজোলিউশনে (দীর্ঘ প্রান্তে প্রায় ২০৪৮ পিক্সেল) সংরক্ষিত হয়; তাই মূল কপি হিসেবে এর ওপর নির্ভর করবেন না।",
]));
add(h2("৪.২ শেয়ার্ড লাইব্রেরি সেটআপ"));
add(steps([
  "**Settings > [আপনার নাম] > iCloud > Photos > Shared Library > Get Started** চাপুন।",
  "সর্বোচ্চ ৫ জন অংশগ্রহণকারী যোগ করুন (Messages বা ইমেইলে আমন্ত্রণ যাবে)।",
  "কোন ছবি যাবে ঠিক করুন — সব ছবি, নির্দিষ্ট তারিখের পরের ছবি, অথবা নির্দিষ্ট ব্যক্তিদের ছবি।",
  "ক্যামেরা অ্যাপে উপরের **দুই-মানুষ আইকন** চালু থাকলে তোলা ছবি সরাসরি শেয়ার্ড লাইব্রেরিতে যায়।",
], C.purple));
add(box("info", "শেয়ার্ড লাইব্রেরির জায়গা কাটে শুধু **যিনি লাইব্রেরিটি তৈরি করেছেন** তাঁর আইক্লাউড কোটা থেকে। তাই বড় প্ল্যানধারী সদস্যকে দিয়ে তৈরি করান।"));

// ---------- Ch 5 ----------
add(h1("অধ্যায় ৫: আইক্লাউড ড্রাইভ ও ফাইলস"));
add(p("আইক্লাউড ড্রাইভ হলো আপনার ব্যক্তিগত অনলাইন ফোল্ডার। আইফোনের **Files** অ্যাপ, ম্যাকের **Finder**, উইন্ডোজের **File Explorer** এবং **icloud.com** — সব জায়গা থেকে একই ফাইল পাওয়া যায়।"));
add(h2("৫.১ ম্যাকের ডেস্কটপ ও ডকুমেন্টস স্বয়ংক্রিয় সিঙ্ক"));
add(figure("mac_drive.png", 600, "ম্যাকে iCloud Drive সেটিংস (নমুনা)"));
add(table(["নম্বর", "সেটিং", "কাজ ও পরামর্শ"], [
  ["১", "Sync this Mac", "ম্যাকে iCloud Drive চালু করে।"],
  ["২", "Desktop & Documents Folders", "ডেস্কটপ ও ডকুমেন্টস ফোল্ডার সব ডিভাইসে পাওয়া যায়; অফিসের ফাইল আইফোন থেকেও খুলতে পারবেন।"],
  ["৩", "Optimize Mac Storage", "জায়গা কমে গেলে পুরনো ফাইলের শুধু আইকন রেখে মূল ফাইল আইক্লাউডে রাখে।"],
  ["৪", "Keep Downloaded", "গুরুত্বপূর্ণ ফাইল/ফোল্ডার সবসময় অফলাইনে রাখতে রাইট-ক্লিক > Keep Downloaded।"],
], [1000, 3300, W - 4300], { center: [0] }));
add(h2("৫.২ আইফোনের Files অ্যাপে দক্ষ ব্যবহার"));
add(bullet("**ডকুমেন্ট স্ক্যান:** Files > iCloud Drive > উপরের **•••** > **Scan Documents** — কাগজ সরাসরি PDF হয়ে আইক্লাউডে সেভ হয়।"));
add(bullet("**অফলাইনে রাখা:** ফাইল বা ফোল্ডারে লং-প্রেস > **Keep Downloaded** (iOS 18 থেকে)।"));
add(bullet("**ফোল্ডার শেয়ার:** ফোল্ডারে লং-প্রেস > **Share** > শেয়ারিং অপশনে “Only invited people” ও “Can make changes / View only” নির্ধারণ করুন।"));
add(bullet("**সংকুচন (Zip):** একাধিক ফাইল নির্বাচন > **•••** > **Compress** — ইমেইলে পাঠাতে সুবিধা।"));
add(bullet("**মুছে ফেলা ফাইল:** Files > Browse > **Recently Deleted** — ৩০ দিন পর্যন্ত ফেরত আনা যায়।"));
add(box("secret", "Files অ্যাপে কোনো ফোল্ডারকে **Favorites**-এ টেনে আনুন (লং-প্রেস > Favorite)। সাইডবারে সবসময় দেখা যাবে, বারবার খুঁজতে হবে না।"));

// ---------- Ch 6 ----------
add(h1("অধ্যায় ৬: আইক্লাউড ব্যাকআপ ও রিস্টোর"));
add(p("আইক্লাউড ব্যাকআপ আপনার আইফোন/আইপ্যাডের সেটিংস, অ্যাপের ডেটা, হোম স্ক্রিন বিন্যাস, মেসেজ (যদি Messages in iCloud বন্ধ থাকে), রিংটোন ইত্যাদি সংরক্ষণ করে। ফোন হারালে বা নতুন ফোন কিনলে কয়েক ধাপে সবকিছু আগের মতো ফিরে আসে।"));
add(pathBox("পথ", "Settings > [আপনার নাম] > iCloud > iCloud Backup"));
add(phoneFig("phone_backup.png", "iCloud Backup পাতা (নমুনা)", [
  "**Back Up This iPhone** — ফোন লক, চার্জে ও Wi-Fi-তে থাকলে প্রতিদিন স্বয়ংক্রিয় ব্যাকআপ।",
  "**Back Up Over Cellular** — Wi-Fi না থাকলে মোবাইল ডেটায় ব্যাকআপ (ডেটা খরচ হবে)।",
  "**Back Up Now** — এখনই হাতে ব্যাকআপ নিন (ফোন রিসেট/বিক্রির আগে অবশ্যই)।",
  "**পুরনো ডিভাইসের ব্যাকআপ** — অব্যবহৃত হলে মুছে জায়গা খালি করুন।",
  "**অ্যাপভিত্তিক বাছাই** — বড় বা অপ্রয়োজনীয় অ্যাপ ব্যাকআপ থেকে বাদ দিন।",
]));
add(h2("৬.১ কী ব্যাকআপে থাকে, কী থাকে না"));
add(table(["ব্যাকআপে থাকে", "ব্যাকআপে থাকে না (কারণ)"], [
  ["অ্যাপের ডেটা ও সেটিংস", "যা আগেই আইক্লাউডে সিঙ্ক হয় — কন্টাক্টস, ক্যালেন্ডার, নোটস, আইক্লাউড ফটোস ইত্যাদি (আলাদা করে লাগে না)"],
  ["হোম স্ক্রিন ও অ্যাপ বিন্যাস", "অ্যাপ স্টোর থেকে কেনা অ্যাপ নিজে (আবার ডাউনলোড হয়)"],
  ["iMessage/SMS (Messages in iCloud বন্ধ থাকলে)", "Face ID/Touch ID ও Apple Pay কার্ডের তথ্য (নিরাপত্তার কারণে)"],
  ["ডিভাইস সেটিংস, রিংটোন, ভিজ্যুয়াল ভয়েসমেইল পাসওয়ার্ড", "অন্য ক্লাউডে থাকা ডেটা — যেমন Gmail, Google Photos"],
], [W / 2, W / 2]));
add(h2("৬.২ ব্যাকআপ থেকে নতুন ফোনে রিস্টোর"));
add(figure("flow_backup.png", 620, "ব্যাকআপ ও রিস্টোরের চার ধাপ"));
add(box("secret", [
  "নতুন আইফোন কেনার সময় **Settings > General > Transfer or Reset iPhone > Get Started** চাপুন। আপনার প্ল্যান ছোট হলেও অ্যাপল সাময়িকভাবে (প্রায় ২১ দিন) **বিনামূল্যে অতিরিক্ত আইক্লাউড জায়গা** দেয়, যাতে পুরো ব্যাকআপ নিয়ে নতুন ফোনে স্থানান্তর করা যায়।",
], "নতুন ফোনের জন্য বিনামূল্যে অস্থায়ী স্টোরেজ"));

// ---------- Ch 7 ----------
add(h1("অধ্যায় ৭: পাসওয়ার্ড, পাসকি ও কিচেইন"));
add(p("iOS 18 ও macOS Sequoia থেকে **Passwords** নামে আলাদা অ্যাপ এসেছে, যা আইক্লাউড কিচেইনের মাধ্যমে সব পাসওয়ার্ড, পাসকি, ওয়াই-ফাই পাসওয়ার্ড ও টু-ফ্যাক্টর যাচাই কোড এন্ড-টু-এন্ড এনক্রিপ্টেড অবস্থায় সব ডিভাইসে সিঙ্ক করে। আলাদা পাসওয়ার্ড ম্যানেজার অ্যাপের প্রয়োজন প্রায় থাকে না।"));
add(phoneFig("phone_passwords.png", "Passwords অ্যাপ (নমুনা)", [
  "**Codes** — ওয়েবসাইটের টু-ফ্যাক্টর কোড (Google Authenticator-এর বিকল্প) এখানেই তৈরি হয় এবং অটো-ফিল হয়।",
  "**Security** — দুর্বল, পুনর্ব্যবহৃত বা ফাঁস হওয়া পাসওয়ার্ডের সতর্কতা; দ্রুত বদলে ফেলুন।",
  "**Passkeys** — পাসওয়ার্ড ছাড়াই Face ID দিয়ে লগইন; ফিশিং-প্রতিরোধী।",
  "**Shared Groups** — পরিবার বা সহকর্মীদের সাথে নির্দিষ্ট পাসওয়ার্ড নিরাপদে শেয়ার।",
]));
add(h2("৭.১ সর্বোত্তম ব্যবহারের নিয়ম"));
add(bullet("নতুন অ্যাকাউন্ট খোলার সময় আইফোনের প্রস্তাবিত **Strong Password** গ্রহণ করুন — মনে রাখার দরকার নেই।"));
add(bullet("যে সাইট **Passkey** সমর্থন করে (Google, Microsoft, Amazon, WhatsApp ইত্যাদি), সেখানে পাসকি চালু করুন।"));
add(bullet("মাসে একবার **Security** তালিকা দেখে ঝুঁকিপূর্ণ পাসওয়ার্ড বদলান।"));
add(bullet("উইন্ডোজে **iCloud for Windows**-এর Passwords অ্যাপ বা Chrome/Edge-এর **iCloud Passwords** এক্সটেনশন দিয়ে একই পাসওয়ার্ড ব্যবহার করুন।"));
add(box("secret", "Passwords অ্যাপ > **Wi-Fi** > নেটওয়ার্ক নির্বাচন > **Show Network QR Code** — অতিথিকে পাসওয়ার্ড না বলে শুধু QR কোড স্ক্যান করতে দিন।", "ওয়াই-ফাই পাসওয়ার্ড QR কোডে"));

// ---------- Ch 8 ----------
add(h1("অধ্যায় ৮: iCloud+ এর একচেটিয়া সুবিধা"));
add(p("যেকোনো পেইড স্টোরেজ প্ল্যান নিলেই আপনি iCloud+ গ্রাহক। অধিকাংশ ব্যবহারকারী শুধু বাড়তি জায়গার জন্য টাকা দেন, কিন্তু নিচের একচেটিয়া গোপনীয়তা সুবিধাগুলো ব্যবহার করেন না।"));
add(h2("৮.১ Hide My Email — ছদ্ম ইমেইল ঠিকানা"));
add(phoneFig("phone_hme.png", "Hide My Email পাতা (নমুনা)", [
  "**Create New Address** — এলোমেলো ইউনিক ঠিকানা তৈরি, যা আপনার আসল ইনবক্সে ফরওয়ার্ড হয়।",
  "**Sign in with Apple** — অ্যাপে “Hide My Email” বেছে নিলে স্বয়ংক্রিয়ভাবে তৈরি ঠিকানা।",
  "**Deactivate** — স্প্যাম আসা শুরু হলে ঠিকানাটি বন্ধ করে দিন; আসল ইমেইল অক্ষত থাকে।",
  "**Forward To** — কোন ইনবক্সে মেইল যাবে (Gmail-ও হতে পারে)।",
]));
add(p("**ব্যবহারের ক্ষেত্র:** অনলাইন শপিং, অফার/নিউজলেটার সাইন-আপ, অপরিচিত অ্যাপে রেজিস্ট্রেশন। মেইল অ্যাপে নতুন মেইল লেখার সময় **From** ঘরে ট্যাপ করে সরাসরি **Hide My Email** বেছে নেওয়া যায়।"));
add(h2("৮.২ Private Relay — নিরাপদ ব্রাউজিং"));
add(p("Private Relay সাফারির ট্রাফিককে দুটি আলাদা রিলের মধ্য দিয়ে পাঠায়, ফলে ওয়েবসাইট আপনার আসল আইপি ঠিকানা ও নির্দিষ্ট অবস্থান জানতে পারে না, আবার ইন্টারনেট সেবাদাতাও দেখতে পায় না আপনি কোন সাইটে যাচ্ছেন। এটি পূর্ণাঙ্গ VPN নয়; মূলত সাফারি ও কিছু অনিরাপদ অ্যাপ-ট্রাফিকে কাজ করে।"));
add(pathBox("পথ", "Settings > [আপনার নাম] > iCloud > Private Relay"));
add(bullet("**IP Address Location > Maintain General Location** — স্থানীয় খবর ও সার্চ ফলাফল ঠিক থাকে (সুপারিশকৃত)।"));
add(bullet("কোনো নির্দিষ্ট অফিস/স্কুল Wi-Fi-তে সমস্যা হলে শুধু সেই নেটওয়ার্কের জন্য বন্ধ করুন: **Settings > Wi-Fi > (i) > iCloud Private Relay** বন্ধ।"));
add(box("info", "কিছু দেশ ও কিছু মোবাইল অপারেটরে Private Relay সীমিত বা অনুপলব্ধ হতে পারে।"));
add(h2("৮.৩ অন্যান্য একচেটিয়া সুবিধা"));
add(table(["সুবিধা", "কী করে", "কোথা থেকে চালু করবেন"], [
  ["Custom Email Domain", "নিজের ডোমেইনে (যেমন name@yourdomain.com) iCloud Mail; সর্বোচ্চ ৫টি ডোমেইন, পরিবারের সাথে শেয়ারযোগ্য", "icloud.com > Mail > Settings > Custom Email Domain"],
  ["HomeKit Secure Video", "হোম ক্যামেরার ভিডিও এনক্রিপ্টেড অবস্থায় আইক্লাউডে; এর জায়গা কোটা থেকে কাটে না। ৫০ GB-তে ১টি, ২০০ GB-তে ৫টি, ২ TB বা তার বেশিতে অসীম ক্যামেরা", "Home অ্যাপ > ক্যামেরা > Recording Options"],
  ["iCloud Mail উপনাম (Alias)", "মূল ঠিকানা গোপন রেখে সর্বোচ্চ ৩টি অতিরিক্ত @icloud.com ঠিকানা", "icloud.com > Mail > Settings > Accounts"],
], [2500, 4400, W - 6900], { firstBold: true }));

// ---------- Ch 9 ----------
add(h1("অধ্যায় ৯: ফাইন্ড মাই — হারানো ডিভাইস খোঁজা"));
add(p("ফাইন্ড মাই শুধু ফোন খোঁজার অ্যাপ নয়; এটি **Activation Lock** চালু রাখে, ফলে চোর ফোন রিসেট করেও আপনার Apple Account-এর পাসওয়ার্ড ছাড়া ব্যবহার করতে পারে না।"));
add(pathBox("পথ", "Settings > [আপনার নাম] > Find My > Find My iPhone"));
add(phoneFig("phone_findmy.png", "Find My iPhone সেটিংস (নমুনা)", [
  "**Find My iPhone** — অবশ্যই চালু রাখুন; Activation Lock এর ওপর নির্ভর করে।",
  "**Find My network** — ফোন অফলাইন বা বন্ধ থাকলেও আশেপাশের অ্যাপল ডিভাইসের মাধ্যমে সীমিত সময় পর্যন্ত অবস্থান জানা যায়।",
  "**Send Last Location** — ব্যাটারি প্রায় শেষ হলে শেষ অবস্থান অ্যাপলকে পাঠায়।",
  "**মানচিত্র** — সাউন্ড বাজানো, Lost Mode, বা দূর থেকে মুছে ফেলার অপশন।",
]));
add(h2("৯.১ ফোন হারালে সঙ্গে সঙ্গে যা করবেন"));
add(steps([
  "অন্য কারও ফোন বা কম্পিউটারে **icloud.com/find** খুলুন — এখানে শুধু পাসওয়ার্ডেই সাইন-ইন করা যায়, যাচাই কোড লাগে না।",
  "কাছাকাছি থাকলে **Play Sound** চাপুন।",
  "না পেলে **Mark As Lost** চালু করুন — ফোন লক হবে, অ্যাপল পে বন্ধ হবে এবং পর্দায় আপনার যোগাযোগ নম্বর দেখাবে।",
  "চুরি নিশ্চিত হলে থানায় জিডি করুন এবং মোবাইল অপারেটরকে সিম বন্ধ করতে বলুন।",
  "ফেরত পাওয়ার আশা না থাকলে **Erase This Device** — মুছে ফেলার পরও Activation Lock থাকে।",
], C.red));
add(box("warn", "হারানো ফোনটি **Find My থেকে Remove** করবেন না। রিমুভ করলে Activation Lock উঠে যায় এবং চোর ফোনটি ব্যবহার করতে পারে।"));
add(box("secret", "AirTag বা Find My-সমর্থিত জিনিসপত্রের অবস্থান এয়ারলাইন বা অন্য কারও সাথে সাময়িকভাবে শেয়ার করতে Find My > Items > আইটেম > **Share Item Location** ব্যবহার করুন (iOS 18.2 থেকে)। হারানো লাগেজ খুঁজতে কার্যকর।"));

// ---------- Ch 10 ----------
add(h1("অধ্যায় ১০: ফ্যামিলি শেয়ারিং"));
add(p("ফ্যামিলি শেয়ারিংয়ে আপনি ও আরও সর্বোচ্চ **৫ জন** সদস্য একটি iCloud+ প্ল্যান, অ্যাপ/গেম কেনাকাটা, Apple Music ইত্যাদি শেয়ার করতে পারেন — অথচ প্রত্যেকের ছবি, মেসেজ ও ফাইল সম্পূর্ণ আলাদা ও ব্যক্তিগত থাকে।"));
add(pathBox("পথ", "Settings > [আপনার নাম] > Family"));
add(steps([
  "**Family > Set Up Family** চাপুন এবং সদস্যদের Messages বা সরাসরি আমন্ত্রণ পাঠান।",
  "শিশুর জন্য **Create Child Account** — বয়সভিত্তিক নিয়ন্ত্রণ ও **Ask to Buy** চালু হয়।",
  "**Subscriptions > iCloud+** এ গিয়ে স্টোরেজ শেয়ার চালু করুন।",
  "প্রয়োজনে **Location Sharing** চালু করে পরিবারের সদস্যদের অবস্থান Find My-তে দেখুন।",
], C.green));
add(box("tip", [
  "প্রত্যেক সদস্য কতটা জায়গা ব্যবহার করছেন তা প্ল্যানধারী দেখতে পান, কিন্তু তাঁদের ফাইল বা ছবি দেখতে পান না।",
  "কোনো সদস্য চাইলে নিজের আলাদা প্ল্যান কিনতে পারেন; তখন তাঁর জায়গা পরিবারের প্ল্যান থেকে কাটবে না।",
]));

// ---------- Ch 11 ----------
add(h1("অধ্যায় ১১: নিরাপত্তা ও গোপনীয়তা"));
add(p("আইক্লাউডে আপনার জীবনের প্রায় সব তথ্য থাকে, তাই অ্যাকাউন্টের নিরাপত্তা সর্বোচ্চ অগ্রাধিকার। নিচের পাঁচ স্তরের সুরক্ষা ধাপে ধাপে প্রয়োগ করুন।"));
add(figure("diagram_security.png", 590, "আইক্লাউড অ্যাকাউন্ট সুরক্ষার পাঁচ স্তর"));
add(pathBox("পথ", "Settings > [আপনার নাম] > Sign-In & Security"));
add(phoneFig("phone_security.png", "Sign-In & Security পাতা (নমুনা)", [
  "**Two-Factor Authentication** — নতুন ডিভাইসে লগইনে কোড লাগবে; সবসময় চালু রাখুন।",
  "**Get Verification Code** — নেটওয়ার্ক না থাকলেও এই ডিভাইস থেকে কোড নিন।",
  "**Security Keys** — ফিজিক্যাল FIDO কি (কমপক্ষে ২টি) দিয়ে সর্বোচ্চ সুরক্ষা।",
  "**Account Recovery** — বিশ্বস্ত রিকভারি কন্টাক্ট (সর্বোচ্চ ৫ জন) বা রিকভারি কি।",
  "**Legacy Contact** — আপনার মৃত্যুর পর যিনি ডেটা পাবেন।",
  "**Sign in with Apple** — কোন অ্যাপে অ্যাপল দিয়ে লগইন করেছেন; অপ্রয়োজনীয়গুলো বন্ধ করুন।",
]));
add(h2("১১.১ অ্যাডভান্সড ডেটা প্রোটেকশন (ADP)"));
add(p("সাধারণ অবস্থায় পাসওয়ার্ড ও হেলথ ডেটার মতো কিছু তথ্য এন্ড-টু-এন্ড এনক্রিপ্টেড থাকে। **ADP** চালু করলে ব্যাকআপ, ফটোস, নোটস, iCloud Drive-সহ প্রায় সব আইক্লাউড ডেটা এন্ড-টু-এন্ড এনক্রিপ্টেড হয় — অ্যাপলও তা পড়তে পারে না। তবে iCloud Mail, কন্টাক্টস ও ক্যালেন্ডার অন্য সেবার সাথে কাজ করার প্রয়োজনে এর আওতার বাইরে থাকে।"));
add(figure("flow_adp.png", 620, "অ্যাডভান্সড ডেটা প্রোটেকশন চালুর ধাপ"));
add(pathBox("পথ", "Settings > [আপনার নাম] > iCloud > Advanced Data Protection"));
add(box("warn", [
  "ADP চালু থাকলে পাসওয়ার্ড ভুলে গেলে **অ্যাপল আপনার ডেটা পুনরুদ্ধার করতে পারবে না**। রিকভারি কন্টাক্ট বা রিকভারি কি হারালে ডেটা স্থায়ীভাবে হারাবে।",
  "রিকভারি কি (২৮ অক্ষরের) কাগজে লিখে নিরাপদ স্থানে রাখুন; স্ক্রিনশট নিয়ে একই ফোনে রাখবেন না।",
]));
add(h2("১১.২ অতিরিক্ত নিরাপত্তা কৌশল"));
add(bullet("**Stolen Device Protection:** Settings > Face ID & Passcode > Stolen Device Protection চালু করুন। পরিচিত স্থানের বাইরে পাসওয়ার্ড বদলের মতো সংবেদনশীল কাজে Face ID ও নির্দিষ্ট সময় অপেক্ষা লাগবে — চোর পাসকোড জানলেও অ্যাকাউন্ট দখল করতে পারবে না।"));
add(bullet("**Access iCloud Data on the Web:** ব্রাউজারে আইক্লাউড ব্যবহার না করলে এটি বন্ধ রাখুন।"));
add(bullet("**ডিভাইস তালিকা:** Settings > [আপনার নাম] পাতার নিচে সাইন-ইন করা সব ডিভাইস দেখায়; অচেনা বা বিক্রি করা ডিভাইস **Remove from Account** করুন।"));
add(bullet("**Safety Check:** Settings > Privacy & Security > Safety Check — কার সাথে অবস্থান, ছবি বা পাসওয়ার্ড শেয়ার করছেন এক জায়গায় দেখে দ্রুত বন্ধ করা যায়।"));
add(bullet("**ফিশিং থেকে সাবধান:** অ্যাপল কখনো এসএমএস বা ফোনে আপনার পাসওয়ার্ড বা যাচাই কোড চায় না।"));

// ---------- Ch 12 ----------
add(h1("অধ্যায় ১২: iCloud.com ও ডেটা রিকভারি"));
add(p("যেকোনো ব্রাউজার থেকে **icloud.com** এ গিয়ে ছবি, ফাইল, মেইল, নোটস ও ডিভাইস খোঁজার পাশাপাশি একটি প্রায় অজানা কিন্তু অত্যন্ত কার্যকর সুবিধা আছে — **Data Recovery**।"));
add(figure("web_recovery.png", 600, "icloud.com এর Data Recovery পাতা (নমুনা)"));
add(table(["নম্বর", "অপশন", "কী ফেরত আনে"], [
  ["১", "Restore Files", "গত ৩০ দিনে iCloud Drive থেকে মুছে ফেলা ফাইল"],
  ["২", "Restore Bookmarks", "সাফারি বুকমার্কের আগের সংস্করণ"],
  ["৩", "Restore Contacts", "কন্টাক্টসের স্বয়ংক্রিয় আর্কাইভ থেকে আগের পূর্ণ তালিকা"],
  ["৪", "Restore Calendars", "ক্যালেন্ডার ও রিমাইন্ডারের আগের সংস্করণ"],
], [1000, 2800, W - 3800], { center: [0] }));
add(box("warn", "কন্টাক্টস বা ক্যালেন্ডার রিস্টোর করলে বর্তমান তালিকা পুরনো সংস্করণ দিয়ে প্রতিস্থাপিত হয় (বর্তমানটিও একটি আর্কাইভ হিসেবে রাখা হয়)। রিস্টোরের পরে যোগ করা এন্ট্রিগুলো আবার যোগ করতে হতে পারে।"));
add(h2("১২.১ icloud.com এর আরও কিছু কাজের সুবিধা"));
add(bullet("**মূল ছবি ডাউনলোড:** Photos > ছবি নির্বাচন > ডাউনলোড আইকন চেপে ধরে **Unmodified Original**।"));
add(bullet("**মেইল নিয়ম (Rules):** Mail > Settings > Rules — নির্দিষ্ট প্রেরকের মেইল স্বয়ংক্রিয়ভাবে ফোল্ডারে সরান।"));
add(bullet("**স্বয়ংক্রিয় উত্তর ও ফরওয়ার্ডিং:** Mail > Settings থেকে ছুটির সময় অটো-রিপ্লাই চালু করুন।"));
add(bullet("**সব ডেটার কপি:** privacy.apple.com থেকে **Request a copy of your data** — আপনার আইক্লাউড ডেটার সম্পূর্ণ কপি ডাউনলোড করা যায়; সেখান থেকে ছবি অন্য সেবায় (যেমন Google Photos) স্থানান্তরের অনুরোধও করা যায়।"));

// ---------- Ch 13 ----------
add(h1("অধ্যায় ১৩: ৩০টি গোপন টিপস ও ট্রিকস"));
add(p("নিচের কৌশলগুলো অধিকাংশ ব্যবহারকারী জানেন না, অথচ এগুলো জায়গা, সময় ও নিরাপত্তা — তিনটিই বাঁচায়।"));
add(table(["নং", "কৌশল", "কীভাবে / কোথায়"], [
  ["১", "শেয়ার্ড অ্যালবাম বিনামূল্যে", "Shared Albums-এর ছবি আপনার আইক্লাউড কোটা থেকে কাটে না — পুরনো অনুষ্ঠানের ছবি রাখার সাশ্রয়ী উপায় (রেজোলিউশন কিছুটা কম)।"],
  ["২", "নতুন ফোনে ফ্রি অস্থায়ী স্টোরেজ", "Settings > General > Transfer or Reset iPhone > Get Started।"],
  ["৩", "পুরনো ব্যাকআপ মুছুন", "Manage Account Storage > Backups।"],
  ["৪", "বড় অ্যাপ ব্যাকআপ থেকে বাদ", "Backups > এই ডিভাইস > অ্যাপের টগল বন্ধ।"],
  ["৫", "অফলাইনে ফাইল রাখুন", "Files/Finder > রাইট-ক্লিক বা লং-প্রেস > Keep Downloaded।"],
  ["৬", "মুছে ফেলা ফাইল ফেরত", "icloud.com > Settings > Data Recovery > Restore Files।"],
  ["৭", "মেইল অ্যাপে ছদ্ম ইমেইল", "নতুন মেইল > From > Hide My Email।"],
  ["৮", "অফলাইনে যাচাই কোড", "Settings > [নাম] > Sign-In & Security > Get Verification Code।"],
  ["৯", "ওয়াই-ফাই পাসওয়ার্ড QR", "Passwords > Wi-Fi > নেটওয়ার্ক > Show Network QR Code।"],
  ["১০", "পরিবারের সাথে পাসওয়ার্ড শেয়ার", "Passwords > Shared Groups > New Group।"],
  ["১১", "নির্দিষ্ট Wi-Fi-তে Private Relay বন্ধ", "Settings > Wi-Fi > (i) > iCloud Private Relay।"],
  ["১২", "শেষ অবস্থান পাঠানো", "Find My iPhone > Send Last Location চালু।"],
  ["১৩", "কোড ছাড়াই ফোন খোঁজা", "icloud.com/find — শুধু পাসওয়ার্ডে সাইন-ইন।"],
  ["১৪", "সরাসরি PDF স্ক্যান", "Files > ••• > Scan Documents।"],
  ["১৫", "ফোল্ডার শেয়ার ও অনুমতি", "Files > ফোল্ডারে লং-প্রেস > Share > শেয়ারিং অপশন।"],
  ["১৬", "পুরনো মেসেজ স্বয়ংক্রিয় মুছুন", "Settings > Apps > Messages > Keep Messages > 1 Year।"],
  ["১৭", "মেসেজের বড় সংযুক্তি খুঁজুন", "Settings > General > iPhone Storage > Messages > Review Large Attachments।"],
  ["১৮", "সব ডিভাইসে সাফারি ট্যাব", "সাফারি > ট্যাব ওভারভিউ — অন্য ডিভাইসের খোলা ট্যাব ও Tab Groups পাওয়া যায়।"],
  ["১৯", "নোট লক ও শেয়ার", "Notes > নোট > ••• > Lock; শেয়ার করে একসাথে সম্পাদনা।"],
  ["২০", "সব ডেটার কপি ডাউনলোড", "privacy.apple.com > Request a copy of your data।"],
  ["২১", "ডুপ্লিকেট ছবি একত্র", "Photos > Utilities > Duplicates > Merge।"],
  ["২২", "ম্যাকের ডেস্কটপ সর্বত্র", "System Settings > [নাম] > iCloud > Drive > Desktop & Documents।"],
  ["২৩", "ইউনিভার্সাল ক্লিপবোর্ড", "একই অ্যাকাউন্ট, Bluetooth, Wi-Fi ও Handoff চালু থাকলে আইফোনে কপি করে ম্যাকে পেস্ট।"],
  ["২৪", "মেইল স্বয়ংক্রিয় সাজানো", "icloud.com > Mail > Settings > Rules।"],
  ["২৫", "ক্যামেরা থেকে সরাসরি শেয়ার্ড লাইব্রেরি", "ক্যামেরা অ্যাপের দুই-মানুষ আইকন চালু।"],
  ["২৬", "উত্তরাধিকারী নির্ধারণ", "Sign-In & Security > Legacy Contact।"],
  ["২৭", "রিকভারি কি প্রিন্ট", "Account Recovery > Recovery Key — কাগজে লিখে নিরাপদে রাখুন।"],
  ["২৮", "নিজের ডোমেইনে ইমেইল", "icloud.com > Mail > Settings > Custom Email Domain।"],
  ["২৯", "Safety Check", "Settings > Privacy & Security > Safety Check।"],
  ["৩০", "ডেটা সাশ্রয়ে সিঙ্ক বিরতি", "Low Data Mode বা Low Power Mode চালু থাকলে আইক্লাউড ফটোস সিঙ্ক সাময়িক থামে — মোবাইল ডেটা বাঁচাতে কাজে লাগান।"],
], [800, 3300, W - 4100], { center: [0], size: 19 }));

// ---------- Ch 14 ----------
add(h1("অধ্যায় ১৪: সমস্যা ও সমাধান"));
add(p("প্রায় সব সিঙ্ক সমস্যার সমাধান নিচের ছয় ধাপের মধ্যেই পাওয়া যায়। ক্রম অনুসারে পরীক্ষা করুন।"));
add(figure("diagram_syncfix.png", 600, "সিঙ্ক সমস্যা সমাধানের ছয় ধাপ"));
add(table(["সমস্যা", "সম্ভাব্য কারণ", "সমাধান"], [
  ["“iCloud Storage Full” বার্তা", "ব্যাকআপ ও ছবিতে জায়গা শেষ", "অধ্যায় ৩.২-এর কৌশল প্রয়োগ করুন অথবা প্ল্যান বাড়ান।"],
  ["ছবি সিঙ্ক হচ্ছে না", "Low Power/Low Data Mode, দুর্বল Wi-Fi, জায়গা নেই", "মোড বন্ধ করুন, Wi-Fi-তে চার্জে রাখুন, ফটোস লাইব্রেরির নিচে স্ট্যাটাস দেখুন।"],
  ["ব্যাকআপ ব্যর্থ", "জায়গা কম, নেটওয়ার্ক বিচ্ছিন্ন", "বড় অ্যাপ বাদ দিন, পুরনো ব্যাকআপ মুছুন, Wi-Fi রিসেট করুন।"],
  ["ফাইল “Waiting to Upload”", "নেটওয়ার্ক বা সাময়িক সার্ভার সমস্যা", "Files অ্যাপ বন্ধ করে খুলুন, ডিভাইস রিস্টার্ট করুন।"],
  ["যাচাই কোড আসছে না", "বিশ্বস্ত ডিভাইস কাছে নেই", "“Didn't get a code?” > এসএমএস বা ফোন কল; অথবা অন্য ডিভাইস থেকে Get Verification Code।"],
  ["পাসওয়ার্ড ভুলে গেছেন", "—", "বিশ্বস্ত ডিভাইসে Settings > [নাম] > Sign-In & Security > Change Password, অথবা iforgot.apple.com।"],
  ["ভুলে ফাইল/কন্টাক্ট মুছে গেছে", "—", "Recently Deleted (৩০ দিন) বা icloud.com > Data Recovery।"],
  ["iCloud Mail আসছে না", "স্টোরেজ পূর্ণ হলে মেইল গ্রহণ বন্ধ হয়", "জায়গা খালি করুন; স্প্যাম (Junk) ফোল্ডার ও Rules পরীক্ষা করুন।"],
  ["উইন্ডোজে সিঙ্ক হচ্ছে না", "পুরনো সংস্করণ বা সাইন-ইন সমস্যা", "Microsoft Store থেকে আপডেট করুন, সাইন-আউট করে আবার সাইন-ইন করুন।"],
  ["সব ঠিক থাকার পরও সমস্যা", "অ্যাপলের সার্ভার বিভ্রাট", "apple.com/support/systemstatus এ সবুজ চিহ্ন আছে কিনা দেখুন।"],
], [2700, 2900, W - 5600], { firstBold: true, size: 19 }));
add(box("warn", "আইক্লাউড থেকে **সাইন-আউট** শেষ উপায় হিসেবে করুন। সাইন-আউটের সময় “Keep a copy on this iPhone” বেছে নিন, এবং আগে নিশ্চিত হোন ছবি ও ফাইল সম্পূর্ণ আপলোড হয়েছে।"));

// ---------- Appendix A ----------
add(h1("পরিশিষ্ট ক: দ্রুত রেফারেন্স — গুরুত্বপূর্ণ সেটিংসের পথ"));
add(table(["কাজ", "আইফোন/আইপ্যাডে পথ"], [
  ["আইক্লাউডের মূল পাতা", "Settings > [নাম] > iCloud"],
  ["স্টোরেজ দেখা ও প্ল্যান বদল", "Settings > [নাম] > iCloud > Manage Account Storage"],
  ["অ্যাপভিত্তিক সিঙ্ক চালু/বন্ধ", "Settings > [নাম] > iCloud > See All"],
  ["আইক্লাউড ফটোস", "Settings > [নাম] > iCloud > Photos"],
  ["আইক্লাউড ব্যাকআপ", "Settings > [নাম] > iCloud > iCloud Backup"],
  ["Private Relay", "Settings > [নাম] > iCloud > Private Relay"],
  ["Hide My Email", "Settings > [নাম] > iCloud > Hide My Email"],
  ["Advanced Data Protection", "Settings > [নাম] > iCloud > Advanced Data Protection"],
  ["টু-ফ্যাক্টর, রিকভারি, লিগ্যাসি কন্টাক্ট", "Settings > [নাম] > Sign-In & Security"],
  ["ফাইন্ড মাই", "Settings > [নাম] > Find My"],
  ["ফ্যামিলি শেয়ারিং", "Settings > [নাম] > Family"],
  ["চুরি প্রতিরোধ", "Settings > Face ID & Passcode > Stolen Device Protection"],
  ["নতুন ফোনের প্রস্তুতি", "Settings > General > Transfer or Reset iPhone"],
  ["ম্যাকে আইক্লাউড", "System Settings > [নাম] > iCloud"],
  ["ওয়েবে ডেটা রিকভারি", "icloud.com > প্রোফাইল ছবি > iCloud Settings > Data Recovery"],
], [3600, W - 3600], { firstBold: true, size: 20 }));

// ---------- Appendix B ----------
add(h1("পরিশিষ্ট খ: মাসিক রক্ষণাবেক্ষণ চেকলিস্ট"));
add(p("এই পাতাটি প্রিন্ট করে প্রতি মাসে টিক দিন।", { color: C.gray }));
const months = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন"];
const checks = [
  "আইক্লাউড স্টোরেজ ৮০%-এর নিচে আছে কি?",
  "শেষ সফল ব্যাকআপ গত ৭ দিনের মধ্যে কি?",
  "Photos > Recently Deleted খালি করা হয়েছে",
  "Passwords > Security সতর্কতা দেখা হয়েছে",
  "অচেনা ডিভাইস অ্যাকাউন্ট থেকে সরানো হয়েছে",
  "Hide My Email-এর অপ্রয়োজনীয় ঠিকানা বন্ধ",
  "iOS/macOS সর্বশেষ সংস্করণে হালনাগাদ",
  "রিকভারি কন্টাক্ট/রিকভারি কি হালনাগাদ আছে",
  "ম্যাক/পিসিতে ছবির স্থানীয় কপি হালনাগাদ",
];
const cw = [3766, ...months.map(() => 1016)];
add(table(["করণীয়", ...months], checks.map((c) => [c, ...months.map(() => "☐")]), cw, { center: [1, 2, 3, 4, 5, 6], size: 20 }));
add(box("tip", "**৩-২-১ নিয়ম:** গুরুত্বপূর্ণ ছবি ও ফাইলের ৩টি কপি রাখুন — ২টি ভিন্ন মাধ্যমে (যেমন আইক্লাউড ও এক্সটার্নাল হার্ডডিস্ক) এবং অন্তত ১টি ভিন্ন স্থানে। আইক্লাউড সিঙ্ক একটি ব্যাকআপ হলেও, ভুলে মুছলে তা সব ডিভাইস থেকেই মুছে যায়।"));

// ---------- Appendix C ----------
add(h1("পরিশিষ্ট গ: শব্দকোষ"));
add(table(["শব্দ", "অর্থ"], [
  ["Apple Account", "অ্যাপলের সব সেবায় প্রবেশের একক অ্যাকাউন্ট (পূর্বনাম Apple ID)।"],
  ["সিঙ্ক (Sync)", "সব ডিভাইসে একই তথ্য স্বয়ংক্রিয়ভাবে হালনাগাদ রাখা।"],
  ["ব্যাকআপ", "নির্দিষ্ট সময়ের ডিভাইসের একটি সম্পূর্ণ কপি, যা থেকে রিস্টোর করা যায়।"],
  ["এন্ড-টু-এন্ড এনক্রিপশন (E2E)", "তথ্য শুধু আপনার ডিভাইসেই খোলা যায়; সার্ভার বা অ্যাপলও পড়তে পারে না।"],
  ["পাসকি (Passkey)", "পাসওয়ার্ডের বদলে Face ID/Touch ID দিয়ে নিরাপদ লগইন পদ্ধতি।"],
  ["Activation Lock", "Find My চালু থাকলে Apple Account পাসওয়ার্ড ছাড়া ডিভাইস রিসেট/ব্যবহার বন্ধ রাখার ব্যবস্থা।"],
  ["রিকভারি কন্টাক্ট", "বিশ্বস্ত ব্যক্তি, যিনি অ্যাকাউন্টে প্রবেশ হারালে যাচাই কোড দিয়ে সাহায্য করতে পারেন; তিনি আপনার ডেটা দেখতে পান না।"],
  ["লিগ্যাসি কন্টাক্ট", "মৃত্যুর পর যিনি নির্দিষ্ট প্রক্রিয়ায় আপনার আইক্লাউড ডেটা পেতে পারেন।"],
  ["iCloud+", "পেইড আইক্লাউড প্ল্যান, যাতে বাড়তি স্টোরেজ ও গোপনীয়তা সুবিধা থাকে।"],
], [3200, W - 3200], { firstBold: true }));
add(spacer(300));
add(new Paragraph({ children: runs("— সমাপ্ত —", { size: 24, bold: true, color: C.blue }), alignment: AlignmentType.CENTER }));

// ======================= DOCUMENT =======================
const doc = new Document({
  creator: "iCloud Bangla Guide", title: "আইক্লাউড সম্পূর্ণ সচিত্র ব্যবহার নির্দেশিকা",
  styles: {
    default: { document: { run: { font: F, size: 22, sizeComplexScript: 22 }, paragraph: { spacing: { line: 300, lineRule: LineRuleType.AUTO } } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: F, size: 34, bold: true, color: C.navy }, paragraph: { outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: F, size: 27, bold: true, color: C.blue }, paragraph: { outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: F, size: 23, bold: true, color: C.teal }, paragraph: { outlineLevel: 2 } },
    ],
  },
  numbering: { config: [{ reference: "bul", levels: [
    { level: 0, format: LevelFormat.BULLET, text: "●", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 300 } }, run: { color: C.blue, size: 16 } } },
    { level: 1, format: LevelFormat.BULLET, text: "○", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 950, hanging: 300 } } } },
  ] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1020, bottom: 1020, left: 1020, right: 1020, header: 500, footer: 500 } }, titlePage: true },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "C9D3E0", space: 4 } }, children: runs("আইক্লাউড সম্পূর্ণ সচিত্র ব্যবহার নির্দেশিকা", { size: 17, color: C.gray }) })] }),
      first: new Header({ children: [new Paragraph({ children: [] })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: "পৃষ্ঠা ", font: F, size: 18, sizeComplexScript: 18, color: C.gray }),
        new TextRun({ children: [PageNumber.CURRENT], font: F, size: 18, sizeComplexScript: 18, color: C.gray }),
      ] })] }),
      first: new Footer({ children: [new Paragraph({ children: [] })] }),
    },
    children: body,
  }],
});

Packer.toBuffer(doc).then((b) => {
  const out = process.argv[2] || path.join(__dirname, "out.docx");
  fs.writeFileSync(out, b);
  console.log("wrote", out, b.length);
});
