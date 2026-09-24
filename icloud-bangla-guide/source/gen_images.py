"""Generate illustrative figures (phone mock-ups and diagrams) for the Bangla iCloud guide."""
import math, os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "img")
os.makedirs(OUT, exist_ok=True)
S = 2  # supersampling for print quality

LAT = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
LATB = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
BN = "/root/.fonts/NotoSansBengali-VF.ttf"


def font(size, bold=False, bn=False):
    if bn:
        f = ImageFont.truetype(BN, size * S, layout_engine=ImageFont.Layout.RAQM)
        try:
            f.set_variation_by_name("Bold" if bold else "Regular")
        except Exception:
            pass
        return f
    return ImageFont.truetype(LATB if bold else LAT, size * S)


BLUE = (0, 122, 255)
GREEN = (52, 199, 89)
RED = (255, 59, 48)
ORANGE = (255, 149, 0)
PURPLE = (175, 82, 222)
TEAL = (48, 176, 199)
GRAY = (142, 142, 147)
DARK = (28, 28, 30)
BG = (242, 242, 247)
WHITE = (255, 255, 255)
YELLOW = (255, 204, 0)
INDIGO = (88, 86, 214)
PINK = (255, 45, 85)


def P(*v):
    return tuple(int(x * S) for x in v)


DJ = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def text(d, xy, s, f, fill=DARK, anchor="la"):
    if "Bengali" in f.path:
        s = s.replace("→", ">")
    if s == "✓":
        f = ImageFont.truetype(DJ, f.size)
        fill = BLUE
    d.text(P(*xy), s, font=f, fill=fill, anchor=anchor)


def rrect(d, box, r, fill=None, outline=None, width=1):
    d.rounded_rectangle(P(*box), radius=r * S, fill=fill, outline=outline, width=width * S)


def cloud(d, cx, cy, w, fill):
    """Simple cloud glyph centred at (cx, cy) with width w."""
    h = w * 0.6
    circles = [(-0.22, 0.08, 0.26), (0.05, -0.08, 0.34), (0.28, 0.1, 0.22)]
    for ox, oy, r in circles:
        x, y, rr = cx + ox * w, cy + oy * w, r * w
        d.ellipse(P(x - rr, y - rr, x + rr, y + rr), fill=fill)
    d.rounded_rectangle(P(cx - 0.45 * w, cy + 0.02 * w, cx + 0.48 * w, cy + 0.32 * w), radius=int(0.15 * w * S), fill=fill)


def icon(d, x, y, color, kind, size=29):
    rrect(d, (x, y, x + size, y + size), 7, fill=color)
    c = (x + size / 2, y + size / 2)
    if kind == "cloud":
        cloud(d, c[0], c[1] - 2, size * 0.62, WHITE)
    elif kind == "photo":
        for i, col in enumerate([(255, 204, 0), (255, 59, 48), (175, 82, 222), (0, 122, 255), (52, 199, 89), (255, 149, 0)]):
            a = i * math.pi / 3
            px, py = c[0] + 5 * math.cos(a), c[1] + 5 * math.sin(a)
            d.ellipse(P(px - 4.5, py - 4.5, px + 4.5, py + 4.5), fill=col)
    elif kind == "folder":
        rrect(d, (x + 6, y + 9, x + size - 6, y + size - 7), 2, fill=WHITE)
        rrect(d, (x + 6, y + 7, x + 14, y + 11), 1, fill=WHITE)
    elif kind == "key":
        d.ellipse(P(x + 6, y + 8, x + 16, y + 18), outline=WHITE, width=3 * S)
        d.line(P(x + 15, y + 15, x + 24, y + 22), fill=WHITE, width=3 * S)
    elif kind == "backup":
        d.arc(P(x + 6, y + 6, x + size - 6, y + size - 6), 40, 330, fill=WHITE, width=3 * S)
        d.polygon(P(x + size - 8, y + 10, x + size - 4, y + 16, x + size - 12, y + 15), fill=WHITE)
    elif kind == "mail":
        rrect(d, (x + 5, y + 8, x + size - 5, y + size - 8), 2, fill=WHITE)
        d.line(P(x + 5, y + 9, c[0], c[1] + 1, x + size - 5, y + 9), fill=color, width=2 * S)
    elif kind == "relay":
        d.ellipse(P(x + 6, y + 6, x + size - 6, y + size - 6), outline=WHITE, width=2 * S)
        d.line(P(c[0], y + 6, c[0], y + size - 6), fill=WHITE, width=2 * S)
        d.line(P(x + 6, c[1], x + size - 6, c[1]), fill=WHITE, width=2 * S)
    elif kind == "find":
        d.ellipse(P(x + 5, y + 5, x + size - 5, y + size - 5), outline=WHITE, width=3 * S)
        d.ellipse(P(c[0] - 3, c[1] - 3, c[0] + 3, c[1] + 3), fill=WHITE)
    elif kind == "msg":
        d.ellipse(P(x + 5, y + 6, x + size - 5, y + size - 8), fill=WHITE)
        d.polygon(P(x + 8, y + size - 11, x + 6, y + size - 5, x + 13, y + size - 9), fill=WHITE)
    elif kind == "note":
        rrect(d, (x + 7, y + 5, x + size - 7, y + size - 5), 2, fill=WHITE)
        for k in range(3):
            d.line(P(x + 10, y + 11 + k * 5, x + size - 10, y + 11 + k * 5), fill=color, width=2 * S)
    elif kind == "lock":
        rrect(d, (x + 8, y + 13, x + size - 8, y + size - 6), 2, fill=WHITE)
        d.arc(P(x + 10, y + 5, x + size - 10, y + 19), 180, 360, fill=WHITE, width=3 * S)
    elif kind == "shield":
        d.polygon(P(c[0], y + 5, x + size - 7, y + 9, x + size - 8, y + 18, c[0], y + size - 4, x + 8, y + 18, x + 7, y + 9), fill=WHITE)
    elif kind == "safari":
        d.ellipse(P(x + 5, y + 5, x + size - 5, y + size - 5), outline=WHITE, width=2 * S)
        d.polygon(P(c[0] + 6, c[1] - 6, c[0] + 2, c[1] + 2, c[0] - 6, c[1] + 6, c[0] - 2, c[1] - 2), fill=WHITE)
    elif kind == "people":
        for ox in (-5, 5):
            d.ellipse(P(c[0] + ox - 3.5, y + 7, c[0] + ox + 3.5, y + 14), fill=WHITE)
            d.pieslice(P(c[0] + ox - 7, y + 15, c[0] + ox + 7, y + 29), 180, 360, fill=WHITE)
    elif kind == "home":
        d.polygon(P(c[0], y + 6, x + size - 5, c[1], x + 5, c[1]), fill=WHITE)
        d.rectangle(P(x + 9, c[1], x + size - 9, y + size - 6), fill=WHITE)
    elif kind == "person":
        d.ellipse(P(c[0] - 5, y + 5, c[0] + 5, y + 15), fill=WHITE)
        d.pieslice(P(c[0] - 10, y + 16, c[0] + 10, y + 36), 180, 360, fill=WHITE)
    else:
        text(d, c, kind, font(13, True), WHITE, "mm")


def toggle(d, x, y, on=True):
    rrect(d, (x, y, x + 46, y + 28), 14, fill=GREEN if on else (229, 229, 234))
    kx = x + 20 if on else x + 2
    d.ellipse(P(kx, y + 2, kx + 24, y + 26), fill=WHITE)


def chevron(d, x, y):
    d.line(P(x, y - 5, x + 5, y, x, y + 5), fill=(196, 196, 199), width=2 * S)


def badge(d, x, y, n, color=RED):
    d.ellipse(P(x - 13, y - 13, x + 13, y + 13), fill=color, outline=WHITE, width=2 * S)
    text(d, (x, y + 1), str(n), font(15, True), WHITE, "mm")


class Phone:
    W, H = 390, 800

    def __init__(self, title, back=None, large=True, H=800):
        self.H = H
        self.img = Image.new("RGB", P(self.W + 40, self.H + 40), WHITE)
        self.d = ImageDraw.Draw(self.img)
        d = self.d
        rrect(d, (4, 4, self.W + 36, self.H + 36), 58, fill=(30, 30, 32))
        rrect(d, (16, 16, self.W + 24, self.H + 24), 48, fill=BG)
        self.ox, self.oy = 20, 20
        rrect(d, (self.W / 2 - 42 + 20, 30, self.W / 2 + 42 + 20, 58), 14, fill=(0, 0, 0))
        text(d, (60, 45), "9:41", font(15, True), DARK, "lm")
        for i in range(4):
            d.rectangle(P(self.W - 40 + i * 5, 48 - i * 2.5, self.W - 37 + i * 5, 52), fill=DARK)
        rrect(d, (self.W - 14, 40, self.W + 10, 52), 3, outline=DARK)
        d.rectangle(P(self.W - 12, 42, self.W + 4, 50), fill=DARK)
        y = 72
        if back:
            text(d, (44, y + 10), "‹ " + back, font(16), BLUE, "lm")
            y += 26
        if large:
            text(d, (40, y + 18), title, font(30, True), DARK, "lm")
            y += 50
        else:
            text(d, (self.W / 2 + 20, y - 6), title, font(16, True), DARK, "mm")
        self.y = y + 6

    def header(self, s):
        text(self.d, (52, self.y + 14), s.upper(), font(12), GRAY, "lm")
        self.y += 26

    def group(self, rows, note=None):
        """rows: list of dict(label, icon=(color,kind), value, toggle, chevron, sub, badge, blue)."""
        d = self.d
        h = sum(58 if r.get("sub") else 46 for r in rows)
        x0, x1 = 36, self.W + 4
        rrect(d, (x0, self.y, x1, self.y + h), 12, fill=WHITE)
        yy = self.y
        for i, r in enumerate(rows):
            rh = 58 if r.get("sub") else 46
            lx = x0 + 14
            if r.get("icon"):
                icon(d, lx, yy + (rh - 29) / 2, *r["icon"])
                lx += 42
            col = BLUE if r.get("blue") else DARK
            if r.get("sub"):
                text(d, (lx, yy + 20), r["label"], font(16), col, "lm")
                text(d, (lx, yy + 40), r["sub"], font(12), GRAY, "lm")
            else:
                text(d, (lx, yy + rh / 2), r["label"], font(16), col, "lm")
            rx = x1 - 14
            if "toggle" in r:
                toggle(d, rx - 46, yy + (rh - 28) / 2, r["toggle"])
            else:
                if r.get("chevron", True) and not r.get("blue"):
                    chevron(d, rx - 6, yy + rh / 2)
                    rx -= 18
                if r.get("value"):
                    text(d, (rx, yy + rh / 2), r["value"], font(15), GRAY, "rm")
            if r.get("badge"):
                badge(d, x1 + 6, yy + rh / 2, r["badge"])
            if i < len(rows) - 1:
                d.line(P(lx, yy + rh, x1, yy + rh), fill=(220, 220, 224), width=1 * S)
            yy += rh
        self.y = yy + 8
        if note:
            for line in note:
                text(d, (52, self.y + 8), line, font(12), GRAY, "lm")
                self.y += 17
        self.y += 14

    def storage_bar(self, parts, total_label, used_label):
        d = self.d
        x0, x1 = 36, self.W + 4
        rrect(d, (x0, self.y, x1, self.y + 96), 12, fill=WHITE)
        text(d, (x0 + 14, self.y + 22), "iCloud", font(16, True), DARK, "lm")
        text(d, (x1 - 14, self.y + 22), used_label, font(14), GRAY, "rm")
        bx0, bx1, by = x0 + 14, x1 - 14, self.y + 42
        rrect(d, (bx0, by, bx1, by + 16), 4, fill=(229, 229, 234))
        cx = bx0
        for frac, col, _ in parts:
            w = (bx1 - bx0) * frac
            d.rectangle(P(cx, by, cx + w, by + 16), fill=col)
            cx += w
        lx = bx0
        for _, col, lab in parts:
            d.ellipse(P(lx, by + 30, lx + 9, by + 39), fill=col)
            text(d, (lx + 13, by + 35), lab, font(11), GRAY, "lm")
            lx += 13 + d.textlength(lab, font=font(11)) / S + 12
        self.y += 110

    def save(self, name):
        self.img.save(os.path.join(OUT, name + ".png"))


# ---------- Phone mock-ups ----------
def fig_icloud_main():
    p = Phone("iCloud", back="Apple Account", H=930)
    p.storage_bar([(0.38, YELLOW, "Photos"), (0.22, (90, 200, 250), "Backups"), (0.12, BLUE, "Drive"), (0.06, ORANGE, "Mail")],
                  "", "156 GB of 200 GB")
    p.rows_note = None
    p.group([{"label": "Manage Account Storage", "blue": True, "chevron": False, "badge": 1}])
    p.header("Saved to iCloud")
    p.group([
        {"label": "Photos", "icon": (WHITE, "photo"), "value": "On", "badge": 2},
        {"label": "iCloud Drive", "icon": (BLUE, "folder"), "value": "On"},
        {"label": "Passwords", "icon": (GRAY, "key"), "value": "On"},
        {"label": "iCloud Mail", "icon": (BLUE, "mail"), "value": "On"},
        {"label": "See All", "chevron": True, "badge": 3},
    ])
    p.header("Device Backups")
    p.group([{"label": "iCloud Backup", "icon": (TEAL, "backup"), "value": "On", "badge": 4}])
    p.header("iCloud+")
    p.group([
        {"label": "Private Relay", "icon": (BLUE, "relay"), "value": "On", "badge": 5},
    ])
    p.group([{"label": "Advanced Data Protection", "value": "Off", "badge": 6},
             {"label": "Access iCloud Data on the Web", "toggle": True}])
    # photo icon has white bg; add border
    p.save("phone_icloud_main")


def fig_photos():
    p = Phone("Photos", back="Settings")
    p.group([{"label": "iCloud Photos", "toggle": True, "badge": 1}],
            note=["Automatically upload and safely store all your", "photos and videos in iCloud."])
    p.group([
        {"label": "Optimize iPhone Storage", "chevron": False, "value": "✓", "badge": 2},
        {"label": "Download and Keep Originals", "chevron": False},
    ], note=["Smaller, device-sized versions stay on iPhone;", "full-resolution originals stay in iCloud."])
    p.header("Library")
    p.group([{"label": "Shared Library", "value": "Set Up", "badge": 3}])
    p.group([{"label": "Shared Albums", "toggle": True, "badge": 4}],
            note=["Shared Albums do NOT use your iCloud storage."])
    p.group([
        {"label": "Show Hidden Album", "toggle": True},
        {"label": "Use Face ID", "toggle": True, "badge": 5},
    ], note=["Face ID required to view Hidden and", "Recently Deleted albums."])
    p.save("phone_photos")


def fig_backup():
    p = Phone("iCloud Backup", back="iCloud", large=True)
    p.group([
        {"label": "Back Up This iPhone", "toggle": True, "badge": 1},
        {"label": "Back Up Over Cellular", "toggle": False, "badge": 2},
    ], note=["Backs up automatically when iPhone is locked,", "connected to power and Wi-Fi."])
    p.group([{"label": "Back Up Now", "blue": True, "chevron": False, "badge": 3}],
            note=["Last successful backup: Today 2:14 AM"])
    p.header("All Device Backups")
    p.group([
        {"label": "This iPhone", "sub": "12.4 GB", "icon": (DARK, "i")},
        {"label": "Old iPad (2021)", "sub": "8.9 GB  ·  not used 7 months", "icon": (GRAY, "i"), "badge": 4},
    ])
    p.header("Choose data to back up")
    p.group([
        {"label": "WhatsApp", "toggle": False, "icon": (GREEN, "msg"), "badge": 5},
        {"label": "Games (large)", "toggle": False, "icon": (PURPLE, "G")},
    ])
    p.save("phone_backup")


def fig_passwords():
    p = Phone("Passwords")
    rrect(p.d, (36, p.y, p.W + 4, p.y + 36), 10, fill=(227, 227, 232))
    text(p.d, (56, p.y + 18), "Search", font(15), GRAY, "lm")
    p.y += 52
    d = p.d
    tiles = [("All", BLUE, "key", "148"), ("Passkeys", GREEN, "person", "12"), ("Codes", GRAY, "lock", "9"),
             ("Wi-Fi", BLUE, "relay", "21"), ("Security", RED, "shield", "3"), ("Deleted", ORANGE, "backup", "2")]
    for i, (lab, col, k, n) in enumerate(tiles):
        cx = 36 + (i % 2) * 188
        cy = p.y + (i // 2) * 82
        rrect(d, (cx, cy, cx + 178, cy + 72), 12, fill=WHITE)
        icon(d, cx + 12, cy + 10, col, k, 30)
        text(d, (cx + 12, cy + 56), lab, font(15, True), DARK, "lm")
        text(d, (cx + 166, cy + 24), n, font(20, True), DARK, "rm")
    badge(d, 36 + 178, p.y + 82 + 4, 1)
    badge(d, 36 + 188 + 178, p.y + 82 * 2 + 4, 2)
    badge(d, 36 + 188 + 178, p.y + 4, 3)
    p.y += 82 * 3 + 10
    p.header("Shared Groups")
    p.group([{"label": "Family", "sub": "4 people  ·  37 passwords", "icon": (PURPLE, "people"), "badge": 4},
             {"label": "New Group", "blue": True, "chevron": False}])
    p.save("phone_passwords")


def fig_icloudplus():
    p = Phone("Hide My Email", back="iCloud")
    d = p.d
    rrect(d, (36, p.y, p.W + 4, p.y + 118), 12, fill=WHITE)
    icon(d, 50, p.y + 14, BLUE, "mail", 40)
    text(d, (102, p.y + 26), "Keep your personal email", font(15, True), DARK, "lm")
    text(d, (102, p.y + 46), "address private", font(15, True), DARK, "lm")
    text(d, (50, p.y + 78), "Unique, random addresses forward to", font(12), GRAY, "lm")
    text(d, (50, p.y + 96), "your real inbox.", font(12), GRAY, "lm")
    p.y += 132
    p.group([{"label": "Create New Address", "blue": True, "chevron": False, "badge": 1}])
    p.header("Addresses")
    p.group([
        {"label": "shop.daraz", "sub": "wavy-owl.4m@icloud.com"},
        {"label": "Sign in with Apple: Food app", "sub": "x7k2p9@privaterelay.appleid.com", "badge": 2},
        {"label": "newsletter", "sub": "deactivated", "badge": 3},
    ])
    p.header("Forward To")
    p.group([{"label": "Forward To", "value": "you@gmail.com", "badge": 4}])
    p.save("phone_hme")


def fig_findmy():
    p = Phone("Find My iPhone", back="Find My")
    p.group([{"label": "Find My iPhone", "toggle": True, "badge": 1}],
            note=["Locate, lock or erase this iPhone. Required for", "Activation Lock."])
    p.group([{"label": "Find My network", "toggle": True, "badge": 2}],
            note=["Locate this iPhone even when offline or", "powered off (for a limited time)."])
    p.group([{"label": "Send Last Location", "toggle": True, "badge": 3}],
            note=["Send location to Apple when battery is", "critically low."])
    # map card
    d = p.d
    y = p.y
    rrect(d, (36, y, p.W + 4, y + 200), 12, fill=(214, 232, 208))
    for k in range(6):
        d.line(P(36, y + 20 + k * 34, p.W + 4, y + 10 + k * 30), fill=WHITE, width=5 * S)
    d.line(P(150, y, 220, y + 200), fill=(255, 230, 150), width=8 * S)
    d.ellipse(P(190, y + 80, 230, y + 120), fill=(0, 122, 255, 60), outline=BLUE, width=3 * S)
    d.ellipse(P(203, y + 93, 217, y + 107), fill=BLUE)
    text(d, (210, y + 140), "My iPhone · Now", font(13, True), DARK, "mm")
    badge(d, p.W + 4, y + 10, 4)
    p.save("phone_findmy")


def fig_security():
    p = Phone("Sign-In & Security", back="Apple Account")
    p.group([
        {"label": "Email & Phone Numbers", "value": ""},
        {"label": "Change Password", "blue": True, "chevron": False},
    ])
    p.group([
        {"label": "Two-Factor Authentication", "value": "On", "badge": 1},
        {"label": "Get Verification Code", "blue": True, "chevron": False, "badge": 2},
    ])
    p.group([
        {"label": "Security Keys", "value": "Add", "badge": 3},
        {"label": "Account Recovery", "value": "1 contact", "badge": 4},
        {"label": "Legacy Contact", "value": "", "badge": 5},
    ])
    p.header("Apps using Apple Account")
    p.group([{"label": "Sign in with Apple", "value": "23 apps", "badge": 6}])
    p.save("phone_security")


# ---------- Diagrams ----------
def canvas(w, h, bg=WHITE):
    im = Image.new("RGB", P(w, h), bg)
    return im, ImageDraw.Draw(im)


def device(d, cx, cy, kind, label, col):
    if kind == "phone":
        rrect(d, (cx - 22, cy - 40, cx + 22, cy + 40), 8, fill=DARK)
        rrect(d, (cx - 18, cy - 35, cx + 18, cy + 35), 5, fill=col)
    elif kind == "tablet":
        rrect(d, (cx - 38, cy - 48, cx + 38, cy + 48), 8, fill=DARK)
        rrect(d, (cx - 33, cy - 43, cx + 33, cy + 43), 4, fill=col)
    elif kind == "mac":
        rrect(d, (cx - 55, cy - 40, cx + 55, cy + 25), 6, fill=DARK)
        d.rectangle(P(cx - 49, cy - 34, cx + 49, cy + 19), fill=col)
        d.polygon(P(cx - 65, cy + 28, cx + 65, cy + 28, cx + 58, cy + 38, cx - 58, cy + 38), fill=(160, 160, 165))
    elif kind == "watch":
        rrect(d, (cx - 12, cy - 48, cx + 12, cy + 48), 6, fill=(120, 120, 125))
        rrect(d, (cx - 26, cy - 30, cx + 26, cy + 30), 12, fill=DARK)
        rrect(d, (cx - 21, cy - 25, cx + 21, cy + 25), 9, fill=col)
    elif kind == "pc":
        d.rectangle(P(cx - 55, cy - 40, cx + 55, cy + 25), fill=DARK)
        d.rectangle(P(cx - 50, cy - 35, cx + 50, cy + 20), fill=col)
        for i in range(2):
            for j in range(2):
                d.rectangle(P(cx - 14 + i * 15, cy - 20 + j * 15, cx - 2 + i * 15, cy - 8 + j * 15), fill=WHITE)
        d.rectangle(P(cx - 6, cy + 25, cx + 6, cy + 35), fill=DARK)
        d.rectangle(P(cx - 25, cy + 35, cx + 25, cy + 40), fill=DARK)
    elif kind == "web":
        rrect(d, (cx - 55, cy - 40, cx + 55, cy + 35), 6, fill=WHITE, outline=DARK, width=2)
        d.rectangle(P(cx - 55, cy - 40, cx + 55, cy - 26), fill=(220, 220, 225))
        for i, c in enumerate([RED, YELLOW, GREEN]):
            d.ellipse(P(cx - 50 + i * 10, cy - 37, cx - 43 + i * 10, cy - 30), fill=c)
        text(d, (cx, cy + 5), "icloud.com", font(13, True), BLUE, "mm")
    text(d, (cx, cy + 62), label, font(15, True, bn=True), DARK, "mm")


def fig_ecosystem():
    im, d = canvas(900, 620)
    cx, cy = 450, 300
    d.ellipse(P(cx - 120, cy - 120, cx + 120, cy + 120), fill=(230, 242, 255))
    cloud(d, cx, cy - 10, 170, BLUE)
    text(d, (cx, cy + 20), "iCloud", font(26, True), WHITE, "mm")
    text(d, (cx, cy + 92), "এক অ্যাপল অ্যাকাউন্ট", font(14, True, bn=True), BLUE, "mm")
    devs = [("phone", "আইফোন", 90), ("tablet", "আইপ্যাড", 30), ("mac", "ম্যাক", -30),
            ("watch", "অ্যাপল ওয়াচ", -90), ("pc", "উইন্ডোজ পিসি", -150), ("web", "যেকোনো ব্রাউজার", 150)]
    R = 260
    cols = [(90, 200, 250), (255, 214, 102), (175, 215, 255), (255, 170, 170), (80, 150, 230), WHITE]
    for (k, lab, ang), col in zip(devs, cols):
        a = math.radians(ang - 90)
        dx, dy = cx + R * 1.25 * math.cos(a), cy + R * 0.95 * math.sin(a)
        sx, sy = cx + 128 * math.cos(a) * 1.05, cy + 128 * math.sin(a)
        ex, ey = cx + (R * 1.25 - 80) * math.cos(a), cy + (R * 0.95 - 70) * math.sin(a)
        for t in range(0, 100, 8):
            f0, f1 = t / 100, (t + 4) / 100
            d.line(P(sx + (ex - sx) * f0, sy + (ey - sy) * f0, sx + (ex - sx) * f1, sy + (ey - sy) * f1), fill=BLUE, width=3 * S)
        device(d, dx, dy - 10, k, lab, col)
    text(d, (450, 600), "ছবি · ফাইল · পাসওয়ার্ড · নোট · মেসেজ · ক্যালেন্ডার · ব্যাকআপ — সব ডিভাইসে স্বয়ংক্রিয়ভাবে একই", font(14, bn=True), GRAY, "mm")
    im.save(os.path.join(OUT, "diagram_ecosystem.png"))


def fig_cover():
    im, d = canvas(900, 560, (236, 245, 255))
    for i in range(0, 560, 4):
        t = i / 560
        col = tuple(int(a + (b - a) * t) for a, b in zip((10, 132, 255), (94, 92, 230)))
        d.line(P(0, i, 900, i), fill=col, width=4 * S)
    cloud(d, 450, 230, 420, WHITE)
    text(d, (450, 290), "iCloud", font(64, True), BLUE, "mm")
    ic = [("photo", WHITE), ("folder", BLUE), ("key", GRAY), ("backup", TEAL), ("find", GREEN), ("mail", BLUE), ("lock", ORANGE), ("note", YELLOW)]
    for i, (k, c) in enumerate(ic):
        x = 450 - 4 * 62 + i * 62 + 8
        icon(d, x, 450, c, k, 46)
    im.save(os.path.join(OUT, "cover.png"))


def fig_plans():
    im, d = canvas(900, 420)
    tiers = [("5 GB", "Free", 5), ("50 GB", "iCloud+", 50), ("200 GB", "iCloud+", 200), ("2 TB", "iCloud+", 2000),
             ("6 TB", "iCloud+", 6000), ("12 TB", "iCloud+", 12000)]
    who = [("শুধু পরিচিতি,", "নোট"), ("একক,", "হালকা ব্যবহার"), ("ভারী ব্যবহার/", "ছোট পরিবার"), ("পরিবার", "(৬ জন পর্যন্ত)"), ("প্রফেশনাল", "ভিডিও/ছবি"), ("বৃহৎ", "আর্কাইভ")]
    cols = [GRAY, TEAL, BLUE, INDIGO, PURPLE, PINK]
    base = 330
    for i, ((cap, kind, v), w, col) in enumerate(zip(tiers, who, cols)):
        x = 60 + i * 140
        h = 40 + math.log10(v) / math.log10(12000) * 220
        rrect(d, (x, base - h, x + 100, base), 10, fill=col)
        text(d, (x + 50, base - h - 20), cap, font(20, True), DARK, "mm")
        text(d, (x + 50, base - 22), kind, font(13, True), WHITE, "mm")
        text(d, (x + 50, base + 22), w[0], font(13, bn=True), DARK, "mm")
        text(d, (x + 50, base + 42), w[1], font(13, bn=True), DARK, "mm")
    d.line(P(40, base, 870, base), fill=GRAY, width=2 * S)
    text(d, (450, 400), "স্টোরেজ ধাপসমূহ (লগারিদমিক স্কেল) — iCloud+ প্ল্যান পরিবারের সাথে শেয়ার করা যায়", font(14, bn=True), GRAY, "mm")
    im.save(os.path.join(OUT, "diagram_plans.png"))


def flow(name, steps, title_color=BLUE, w=900, box_w=190, colors=None):
    n = len(steps)
    h = 250
    im, d = canvas(w, h)
    gap = (w - 40 - n * box_w) / max(n - 1, 1)
    for i, (head, body) in enumerate(steps):
        x = 20 + i * (box_w + gap)
        col = colors[i] if colors else title_color
        rrect(d, (x, 30, x + box_w, 220), 16, fill=(245, 248, 255), outline=col, width=3)
        d.ellipse(P(x + box_w / 2 - 24, 8, x + box_w / 2 + 24, 56), fill=col)
        text(d, (x + box_w / 2, 32), "০১২৩৪৫৬৭৮৯"[i + 1], font(24, True, bn=True), WHITE, "mm")
        text(d, (x + box_w / 2, 84), head, font(17, True, bn=True), col, "mm")
        for j, line in enumerate(body):
            text(d, (x + box_w / 2, 120 + j * 26), line, font(14, bn=True), DARK, "mm")
        if i < n - 1:
            ax = x + box_w + 4
            d.polygon(P(ax + gap / 2 - 10, 115, ax + gap - 10, 125, ax + gap / 2 - 10, 135), fill=col)
            d.line(P(ax, 125, ax + gap / 2 - 10, 125), fill=col, width=4 * S)
    im.save(os.path.join(OUT, name + ".png"))


def fig_security_layers():
    im, d = canvas(900, 470)
    layers = [("পাসকোড + Face ID", "ডিভাইস স্তর", (90, 200, 250)),
              ("টু-ফ্যাক্টর অথেন্টিকেশন", "অ্যাকাউন্ট স্তর", BLUE),
              ("রিকভারি কন্টাক্ট / রিকভারি কি", "পুনরুদ্ধার স্তর", INDIGO),
              ("সিকিউরিটি কি (ফিজিক্যাল)", "উন্নত স্তর", PURPLE),
              ("অ্যাডভান্সড ডেটা প্রোটেকশন", "সর্বোচ্চ স্তর (E2E)", PINK)]
    for i, (a, b, col) in enumerate(layers):
        inset = i * 32
        y = 20 + i * 86
        rrect(d, (60 + inset, y, 840 - inset, y + 76), 14, fill=col)
        text(d, (90 + inset, y + 38), a, font(19, True, bn=True), WHITE, "lm")
        text(d, (810 - inset, y + 38), b, font(15, True, bn=True), WHITE, "rm")
    im.save(os.path.join(OUT, "diagram_security.png"))


def fig_web_recovery():
    im, d = canvas(900, 470, WHITE)
    rrect(d, (10, 10, 890, 460), 14, fill=(250, 250, 252), outline=(200, 200, 205), width=2)
    d.rectangle(P(12, 12, 888, 56), fill=(232, 232, 237))
    for i, c in enumerate([RED, YELLOW, GREEN]):
        d.ellipse(P(30 + i * 22, 26, 44 + i * 22, 40), fill=c)
    rrect(d, (250, 20, 650, 48), 8, fill=WHITE)
    text(d, (450, 34), "icloud.com/settings", font(14), GRAY, "mm")
    text(d, (50, 90), "Data Recovery", font(26, True), DARK, "lm")
    text(d, (50, 122), "Restore data deleted within the last 30 days or restore earlier versions.", font(14), GRAY, "lm")
    cards = [("Restore Files", BLUE, "folder", "1"), ("Restore Bookmarks", BLUE, "safari", "2"),
             ("Restore Contacts", GRAY, "person", "3"), ("Restore Calendars", RED, "note", "4")]
    for i, (lab, col, k, n) in enumerate(cards):
        x = 50 + i * 205
        rrect(d, (x, 160, x + 190, 330), 14, fill=WHITE, outline=(220, 220, 225), width=2)
        icon(d, x + 70, 185, col, k, 50)
        text(d, (x + 95, 270), lab, font(15, True), DARK, "mm")
        text(d, (x + 95, 298), "Restore ›", font(13), BLUE, "mm")
        badge(d, x + 180, 170, n)
    text(d, (450, 380), "iCloud.com  →  প্রোফাইল ছবি  →  iCloud Settings  →  Data Recovery", font(16, True, bn=True), BLUE, "mm")
    text(d, (450, 415), "ভুলে মুছে ফেলা ফাইল, বুকমার্ক, কন্টাক্ট ও ক্যালেন্ডার ফিরিয়ে আনুন", font(14, bn=True), GRAY, "mm")
    im.save(os.path.join(OUT, "web_recovery.png"))


def fig_mac_drive():
    im, d = canvas(900, 470, WHITE)
    rrect(d, (10, 10, 890, 460), 14, fill=(246, 246, 248), outline=(200, 200, 205), width=2)
    for i, c in enumerate([RED, YELLOW, GREEN]):
        d.ellipse(P(30 + i * 22, 26, 44 + i * 22, 40), fill=c)
    d.rectangle(P(12, 56, 250, 458), fill=(236, 236, 240))
    side = ["Apple Account", "iCloud", "Wi-Fi", "Bluetooth", "General", "Desktop & Dock"]
    for i, s in enumerate(side):
        if i == 1:
            rrect(d, (22, 70 + i * 36, 240, 100 + i * 36), 6, fill=BLUE)
        text(d, (40, 85 + i * 36), s, font(14, i == 1), WHITE if i == 1 else DARK, "lm")
    text(d, (280, 80), "iCloud Drive", font(22, True), DARK, "lm")
    rows = [("Sync this Mac", True, "1"), ("Desktop & Documents Folders", True, "2"), ("Optimize Mac Storage", True, "3")]
    y = 115
    for lab, on, n in rows:
        rrect(d, (280, y, 860, y + 56), 10, fill=WHITE)
        text(d, (300, y + 28), lab, font(16), DARK, "lm")
        rrect(d, (800, y + 15, 842, y + 41), 13, fill=GREEN if on else (229, 229, 234))
        d.ellipse(P(818, y + 17, 840, y + 39), fill=WHITE)
        badge(d, 862, y + 6, n)
        y += 66
    text(d, (300, y + 10), "Keep Downloaded: Finder-এ ফাইলে রাইট-ক্লিক → Keep Downloaded", font(14, bn=True), DARK, "lm")
    badge(d, 286, y + 10, 4)
    text(d, (300, y + 50), "System Settings  →  [আপনার নাম]  →  iCloud  →  Drive", font(14, True, bn=True), BLUE, "lm")
    im.save(os.path.join(OUT, "mac_drive.png"))


def fig_sync_fix():
    im, d = canvas(900, 330)
    steps = [("সাইন-ইন যাচাই", "একই Apple Account?"), ("নেটওয়ার্ক", "Wi-Fi / Low Data Off"),
             ("স্টোরেজ", "iCloud পূর্ণ নয় তো?"), ("টগল রিসেট", "Off → ৩০ সে. → On"),
             ("রিস্টার্ট ও আপডেট", "iOS / macOS সর্বশেষ"), ("সিস্টেম স্ট্যাটাস", "apple.com/support/systemstatus")]
    cols = [BLUE, TEAL, ORANGE, INDIGO, PURPLE, GREEN]
    for i, ((a, b), c) in enumerate(zip(steps, cols)):
        col_i, row_i = i % 3, i // 3
        x = 20 + col_i * 295
        y = 20 + row_i * 155
        rrect(d, (x, y, x + 270, y + 130), 16, fill=c)
        text(d, (x + 24, y + 30), "০১২৩৪৫৬৭৮৯"[i + 1], font(28, True, bn=True), WHITE, "mm")
        text(d, (x + 135, y + 55), a, font(19, True, bn=True), WHITE, "mm")
        text(d, (x + 135, y + 92), b, font(14, bn=True), WHITE, "mm")
    im.save(os.path.join(OUT, "diagram_syncfix.png"))


if __name__ == "__main__":
    fig_cover(); fig_ecosystem(); fig_plans(); fig_icloud_main(); fig_photos(); fig_backup()
    fig_passwords(); fig_icloudplus(); fig_findmy(); fig_security(); fig_security_layers()
    fig_web_recovery(); fig_mac_drive(); fig_sync_fix()
    flow("flow_backup", [("প্রস্তুতি", ["Wi-Fi ও চার্জারে", "সংযুক্ত করুন"]),
                         ("ব্যাকআপ", ["Back Up Now", "চাপুন"]),
                         ("নতুন ডিভাইস", ["সেটআপে Restore from", "iCloud Backup"]),
                         ("সম্পন্ন", ["অ্যাপ ও ছবি ধীরে", "ডাউনলোড হবে"])],
         colors=[TEAL, BLUE, INDIGO, GREEN])
    flow("flow_adp", [("প্রস্তুতি", ["সব ডিভাইস সর্বশেষ", "সফটওয়্যারে আপডেট"]),
                      ("রিকভারি", ["রিকভারি কন্টাক্ট বা", "রিকভারি কি সেট"]),
                      ("চালু করুন", ["Advanced Data", "Protection → On"]),
                      ("সংরক্ষণ", ["রিকভারি কি কাগজে", "লিখে নিরাপদে রাখুন"])],
         colors=[BLUE, INDIGO, PURPLE, PINK])
    print(sorted(os.listdir(OUT)))
