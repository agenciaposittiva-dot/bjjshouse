"""Renderiza o vídeo 'Em Movimento' (vertical 1080x1920) a partir de fotos, vídeo, logo e música."""
import subprocess, sys, os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps, ImageEnhance, ImageChops

W, H, FPS = 1080, 1920, 30
A = sys.argv[1]            # pasta de assets (fotos 2-5.jpg, clip.mp4, logo.png, music.mp3)
OUT = sys.argv[2]
DATE = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith("--") else ""
MUSIC_OFFSET = 78          # segundo da música onde o vídeo começa (clímax cai na 2ª metade)

FI = "/usr/share/fonts/opentype/inter/"
F_LIGHT = FI + "InterDisplay-Light.otf"
F_MED = FI + "InterDisplay-Medium.otf"
F_BLACK = FI + "InterDisplay-Black.otf"
F_SERIF = "/usr/share/fonts/truetype/crosextra/Caladea-Italic.ttf"
WHITE = (245, 240, 238); ROSE = (232, 120, 160); WINE = (163, 19, 79); NAVY = (10, 22, 48)

def font(p, s): return ImageFont.truetype(p, s)
def ease(x): x = max(0., min(1., x)); return x * x * (3 - 2 * x)
def eout(x): x = max(0., min(1., x)); return 1 - (1 - x) ** 3


# ---------- tratamento de imagem ----------
# Tudo em operações nativas do Pillow (rápidas); a cor é tratada uma vez por imagem/frame de origem.
yy, xx = np.mgrid[0:H, 0:W]
VIG = Image.fromarray((255 * (1 - 0.75 * np.clip(((xx - W/2)/(W*0.75))**2 + ((yy - H/2)/(H*0.62))**2, 0, 1))).astype(np.uint8)).convert("RGB")
rng = np.random.default_rng(1)
GRAIN = [Image.fromarray(np.clip(128 + rng.normal(0, 5, (H//2, W//2)), 0, 255).astype(np.uint8)).resize((W, H), Image.NEAREST).convert("RGB") for _ in range(6)]
BLACK = Image.new("RGB", (W, H), tuple(int(c * 0.25) for c in NAVY))
# degradê escuro na parte de baixo, para o texto em terço inferior ficar legível sem cobrir rostos
GRAD = Image.fromarray(np.repeat((255 - 175 * np.clip((np.arange(H) / H - 0.5) / 0.4, 0, 1) ** 1.5).astype(np.uint8)[:, None], W, 1)).convert("RGB")
LOWER = int(H * 0.25)

def grade(im, dark=0.62, sat=0.85):
    """Tons escuros puxados para o azul-marinho da logo, altas levemente quentes."""
    im = ImageEnhance.Color(im).enhance(sat)
    a = np.asarray(im).astype(np.float32) / 255
    a = a ** 1.15 * dark
    lum = a.mean(2, keepdims=True)
    sh = np.array(NAVY, np.float32) / 255; hi = np.array((1.0, 0.86, 0.80), np.float32)
    a = a * 0.85 + (sh * (1 - lum) * 0.35 + hi * lum * 0.15)
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))

def cover(im, scale=1.0):
    r = max(W / im.width, H / im.height) * scale
    return im.resize((max(W, round(im.width * r)), max(H, round(im.height * r))), Image.LANCZOS)

class Photo:
    def __init__(s, path):
        s.src = cover(ImageOps.exif_transpose(Image.open(path)).convert("RGB"), 1.18)
        s.cache = {}
    def frame(s, p, zoom=(1.0, 1.10), pan=(0, 0), dark=0.62, sat=0.85):
        key = (dark, sat)
        if key not in s.cache: s.cache[key] = grade(s.src, dark, sat)
        base = s.cache[key]
        z = zoom[0] + (zoom[1] - zoom[0]) * ease(p)
        bw, bh = base.size
        cw, ch = bw / 1.18 / z, bh / 1.18 / z
        cx = bw / 2 + pan[0] * (p - .5) * (bw - cw); cy = bh / 2 + pan[1] * (p - .5) * (bh - ch)
        return base.resize((W, H), Image.BILINEAR, box=(cx - cw/2, cy - ch/2, cx + cw/2, cy + ch/2))

def load_clip(path, start, dur, dark):
    """Decodifica só o trecho usado (com a rotação do celular já aplicada) e trata a cor."""
    import io
    first = subprocess.run(["ffmpeg", "-loglevel", "error", "-ss", str(start), "-i", path, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
    w, h = Image.open(io.BytesIO(first)).size
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-ss", str(start), "-t", str(dur + 0.2), "-i", path, "-r", str(FPS), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return [grade(Image.frombytes("RGB", (w, h), raw[i:i + w*h*3]), dark, 0.9) for i in range(0, len(raw) - w*h*3 + 1, w*h*3)]

def clip_frame(frames, p, n_seg):
    f = frames[min(len(frames) - 1, int(p * (n_seg - 1)))]
    z = 1.0 + 0.06 * p
    if f.height >= f.width:                     # vertical: tela cheia com zoom lento
        big = cover(f, z) if z > 1.0 else cover(f)
        x0 = (big.width - W) // 2; y0 = (big.height - H) // 2
        return big.crop((x0, y0, x0 + W, y0 + H))
    small = cover(f.resize((f.width // 4, f.height // 4)), 1.0).filter(ImageFilter.GaussianBlur(10))
    bg = ImageEnhance.Brightness(small.resize((W, H), Image.BILINEAR)).enhance(0.55)
    fw = int(W * 1.25 * z); fh = int(f.height * fw / f.width)
    bg.paste(f.resize((fw, fh), Image.BICUBIC), ((W - fw)//2, (H - fh)//2))
    return bg

# ---------- texto animado (palavra por palavra) ----------
def layout(lines, fnt, track=0):
    out = []; lh = fnt.size * 1.28
    y0 = H/2 - lh * len(lines) / 2
    for i, line in enumerate(lines):
        words = line.split(" "); sp = fnt.getlength(" ")
        widths = [fnt.getlength(w) + track * len(w) for w in words]
        x = W/2 - (sum(widths) + sp * (len(words) - 1)) / 2
        for w, ww in zip(words, widths):
            out.append((w, x, y0 + i * lh, ww)); x += ww + sp
    return out

def draw_text(img, spec, t, dur):
    """spec: dict(lines, font, color, style, y)"""
    lines, fnt, col = spec["lines"], spec["font"], spec.get("color", WHITE)
    track = spec.get("track", 0); dy = spec.get("y", 0)
    words = layout(lines, fnt, track)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    n = len(words); step = min(0.18, (dur * 0.45) / max(1, n))
    out_a = 1 - ease((t - (dur - 0.45)) / 0.45)
    for k, (w, x, y, ww) in enumerate(words):
        p = eout((t - 0.15 - k * step) / 0.6)
        a = int(255 * p * out_a)
        if a <= 0: continue
        off = (1 - p) * 40
        if track:
            cx = x
            for ch in w:
                d.text((cx, y + off + dy), ch, font=fnt, fill=col + (a,)); cx += fnt.getlength(ch) + track
        else:
            d.text((x, y + off + dy), w, font=fnt, fill=col + (a,))
    glow = layer.resize((W // 2, H // 2), Image.BILINEAR).filter(ImageFilter.GaussianBlur(9)).resize((W, H), Image.BILINEAR)
    img.alpha_composite(glow); img.alpha_composite(glow); img.alpha_composite(layer)


# ---------- linha do tempo ----------
_P = {}
def photo(i):
    if i not in _P: _P[i] = Photo(f"{A}/{i}.jpg")
    return _P[i]
LOGO = Image.open(f"{A}/logo.png").convert("RGBA")

L = lambda s: font(F_LIGHT, s); M = lambda s: font(F_MED, s); B = lambda s: font(F_BLACK, s); S = lambda s: font(F_SERIF, s)
def T(lines, f=None, **kw): return dict(lines=lines if isinstance(lines, list) else [lines], font=f or L(70), **kw)

# (duração, fundo, kwargs do fundo, texto)
SEG = []
def seg(d, bg, txt=None, **kw): SEG.append((d, bg, kw, txt))

# INÍCIO — lento
seg(4.5, 5, T(["Existe uma geração", "que não nasceu", "para ficar parada."]), zoom=(1.0, 1.12), pan=(0.3, 0.2), dark=0.45)
seg(3.0, "clip11", T(["Uma geração que", "carrega sonhos."]), start=0.3, dark=0.4)
seg(2.4, 3, T(["Que enfrenta lutas."]), zoom=(1.05, 1.12), dark=0.4)
seg(2.4, "clip11", T(["Que tem perguntas."]), start=4.5, dark=0.35)
seg(3.4, "black", T(["Que às vezes até", "pensa em desistir…"], S(76), color=(200, 190, 190)))
seg(3.0, 3, T(["Mas que decidiu", "continuar."], M(84)), zoom=(1.0, 1.08), dark=0.6)
# CORTES
seg(4.0, "clip2", T(["Porque ser jovem", "não é apenas", "uma fase da vida."]), start=0.0)
seg(4.0, "clip3", T(["É uma oportunidade", "de viver o propósito", "de Deus."]), start=0.0)
seg(3.2, "black", T(["Enquanto muitos dizem:", "“É cedo demais.”"], S(72), color=(190, 185, 185)))
seg(3.8, 4, T(["Deus diz:", "“Eu posso usar", "você agora.”"], M(86)), zoom=(1.0, 1.1), dark=0.55)
# MÚSICA CRESCE
seg(2.6, "clip4", T(["Nós somos jovens."], M(84)), start=0.6)
seg(3.2, "clip5", T(["Mas não somos", "apenas espectadores."]), start=0.3)
seg(3.4, "clip9", T(["Somos parte daquilo", "que Deus está fazendo."]), start=1.0)
seg(1.7, "clip12", T(["Somos mãos", "que servem."], M(90)), start=0.5)
seg(1.7, 3, T(["Pés que", "caminham."], M(90)), zoom=(1.1, 1.2), pan=(0, 0.5))
seg(1.7, "clip7", T(["Vozes que", "adoram."], M(90)), start=3.0)
seg(1.7, "clip6", T(["Corações que", "queimam."], M(90)), start=0.5)
seg(1.6, 8, T(["Uma geração que ora."], M(74)), zoom=(1.0, 1.1), dark=0.6)
seg(1.4, 7, T(["Que acredita."], M(90)), zoom=(1.05, 1.15))
seg(1.4, "clip8", T(["Que se levanta."], M(90)), start=2.0)
seg(1.6, 6, T(["Que continua."], M(90)), zoom=(1.0, 1.1))
# DIFICULDADES
seg(4.0, "black", T(["Movimento não significa", "ausência de dificuldades."], L(62)))
seg(4.4, 3, T(["Significa não permitir", "que as dificuldades", "nos façam parar."]), zoom=(1.0, 1.08), dark=0.42, sat=0.3)
seg(1.9, 3, T(["Haverá dias difíceis."], L(66)), zoom=(1.1, 1.15), dark=0.32, sat=0.1)
seg(1.6, 2, T(["Haverá críticas."], L(66)), zoom=(1.1, 1.15), dark=0.32, sat=0.1)
seg(1.8, 5, T(["Haverá portas fechadas."], L(66)), zoom=(1.2, 1.25), dark=0.32, sat=0.1)
seg(3.6, "black", T(["Haverá momentos em que", "não vamos entender", "o caminho."], L(62)))
seg(3.6, "clip", T(["Mas ainda assim…", "vamos continuar", "caminhando."], M(78)), start=1.0)
seg(3.8, 2, T(["O nosso movimento", "não depende", "das circunstâncias."]), zoom=(1.0, 1.1))
seg(3.4, 9, T(["Depende de quem", "nos sustenta."], M(86)), zoom=(1.0, 1.12), dark=0.6)
# PAUSA — versículo
seg(6.0, 3, T(["“Porque nele vivemos,", "e nos movemos,", "e existimos.”"], S(80), color=WHITE), zoom=(1.0, 1.06), dark=0.35, verse="ATOS 17:28")
seg(2.0, "black", T(["É nele que vivemos."], M(72)))
seg(2.0, "black", T(["É nele que nos movemos."], M(66)))
seg(3.2, "black", T(["É nele que encontramos", "nosso propósito."], M(66), color=ROSE))
# MÚSICA SOBE
seg(2.0, 2, T(["Por isso, não vamos parar."], B(64)), zoom=(1.0, 1.12), pan=(0.6, 0))
seg(1.8, "clip12", T(["Não vamos retroceder."], B(66)), start=6.0)
seg(2.8, "clip1", T(["Não vamos deixar que", "palavras nos definam."], M(66)), start=1.0)
seg(3.0, 3, T(["Não vamos permitir que", "o medo determine", "o nosso futuro."], M(66)), zoom=(1.0, 1.1))
seg(2.4, 5, T(["Nós fomos chamados", "para avançar."], B(76)), zoom=(1.1, 1.25), dark=0.55)
seg(1.4, 2, T(["Chamados para", "servir."], B(96)), zoom=(1.2, 1.3), pan=(-0.6, 0))
seg(1.4, "clip13", T(["Chamados para", "adorar."], B(96)), start=0.5)
seg(2.2, "clip", T(["Chamados para fazer", "a diferença."], B(74)), start=6.0)
# CORTES RÁPIDOS
seg(1.9, "clip2", T(["Esta é a nossa geração."], B(66)), start=3.2)
seg(1.7, "clip4", T(["Esta é a nossa vez."], B(74)), start=1.8)
seg(2.0, "clip5", T(["Este é o nosso chamado."], B(64)), start=1.6)
seg(3.6, 8, T(["E enquanto houver um", "propósito de Deus", "diante de nós…"]), zoom=(1.0, 1.1), dark=0.5)
seg(3.0, "clip3", T(["nós estaremos", "em movimento."], B(88)), start=1.2)
# PAUSA
seg(2.2, "black", T(["Não por nós mesmos."], L(70)))
seg(2.2, "black", T(["Não pela nossa força."], L(70)))
seg(2.4, "black", T(["Mas porque…"], S(84)))
seg(2.4, 2, T(["NELE", "VIVEMOS."], B(150), color=WHITE, center=True), zoom=(1.15, 1.3), dark=0.4)
seg(2.4, 4, T(["NELE NOS", "MOVEMOS."], B(140), color=WHITE, center=True), zoom=(1.15, 1.3), dark=0.4)
seg(3.4, 3, T(["E NELE", "EXISTIMOS."], B(140), color=ROSE, center=True), zoom=(1.1, 1.3), dark=0.4)
seg(1.2, "black")
seg(4.6, "black", T(["EM", "MOVIMENTO"], B(150), track=10))
seg(5.0, "black", T(["Uma geração.", "Um propósito.", "Uma direção.", "Um Deus."], L(72)))
seg(9.0, "logo")

def light_leak(img, t, strength):
    """Brilho vinho que passeia pela tela (calculado em baixa resolução)."""
    sw, sh = W // 8, H // 8
    y, x = np.mgrid[0:sh, 0:sw]
    cx = sw * (0.5 + 0.6 * math.sin(t * 0.7)); cy = sh * (0.3 + 0.3 * math.cos(t * 0.5))
    g = np.exp(-(((x - cx) / (sw * .7)) ** 2 + ((y - cy) / (sh * .5)) ** 2))[..., None] * np.array(WINE, np.float32) * strength
    return ImageChops.add(img, Image.fromarray(g.astype(np.uint8)).resize((W, H), Image.BILINEAR))

def finish(img, t):
    img = ImageChops.multiply(img, VIG)
    return ImageChops.add(img, GRAIN[int(t * FPS) % 6], 1.0, -128).convert("RGBA")

def logo_frame(p, tl, dur):
    r = np.sqrt(((xx[::4, ::4] - W/2) / W) ** 2 + ((yy[::4, ::4] - H/2 + 160) / W) ** 2)
    g = np.exp(-r * 5)[..., None] * np.array(WINE, np.float32) * 0.55 * ease(tl / 1.5)
    img = finish(Image.fromarray(g.astype(np.uint8)).resize((W, H), Image.BILINEAR), tl)
    s = 0.85 + 0.15 * eout(tl / 1.6) + 0.03 * p
    size = int(640 * s)
    lg = LOGO.resize((size, size), Image.LANCZOS)
    al = ease(tl / 1.2) * (1 - ease((tl - (dur - 0.8)) / 0.8))
    lg.putalpha(lg.getchannel("A").point(lambda v: int(v * al)))
    img.alpha_composite(lg, ((W - size)//2, (H - size)//2 - 160))
    lines = [("EM MOVIMENTO", font(F_BLACK, 64), WHITE, H/2 + 300, 1.3)]
    if DATE: lines.append((DATE, font(F_MED, 46), ROSE, H/2 + 390, 1.7))
    lines.append(("ATOS 17:28a", font(F_LIGHT, 40), (200, 190, 195), H/2 + (470 if DATE else 390), 2.1))
    d = ImageDraw.Draw(img)
    for txt, f, c, y, st in lines:
        q = eout((tl - st) / 0.8) * (1 - ease((tl - (dur - 0.8)) / 0.8))
        if q > 0: d.text((W/2, y + (1 - q) * 30), txt, font=f, fill=c + (int(255 * q),), anchor="mm")
    return img

def render_part(a, b, out):
    starts = np.concatenate([[0], np.cumsum([s[0] for s in SEG])])
    enc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-maxrate", "5M", "-bufsize", "10M", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for si in range(a, b):
        dur, bg, kw, txt = SEG[si]; kw = dict(kw); t0 = starts[si]
        n = int(round(dur * FPS))
        verse = kw.pop("verse", None)
        frames = load_clip(f"{A}/{bg}.mp4", kw.get("start", 0), dur, kw.get("dark", 0.62) + 0.1) if str(bg).startswith("clip") else None
        for i in range(n):
            tl = i / FPS; p = i / max(1, n - 1); t = t0 + tl
            if bg == "logo":
                img = logo_frame(p, tl, dur)
            else:
                if bg == "black": im = BLACK
                elif frames is not None: im = clip_frame(frames, p, n)
                else: im = photo(bg).frame(p, **kw)
                if dur > 1.5 and tl < 0.25: im = Image.blend(BLACK, im, ease(tl / 0.25))   # corte suave
                if t > 60 and bg != "black": im = light_leak(im, t, 0.18)
                lower = txt is not None and bg != "black" and not txt.get("center") and not verse
                if lower: im = ImageChops.multiply(im, GRAD)
                img = finish(im, t)
                if txt: draw_text(img, dict(txt, y=LOWER) if lower else txt, tl, dur)
                if verse:
                    q = eout((tl - 2.2) / 0.8) * (1 - ease((tl - (dur - 0.45)) / 0.45))
                    ImageDraw.Draw(img).text((W/2, H/2 + 300), verse, font=font(F_MED, 44), fill=ROSE + (int(255 * q),), anchor="mm")
            enc.stdin.write(img.convert("RGB").tobytes())
    enc.stdin.close(); enc.wait()

def main(workers=4):
    import tempfile
    durs = [s[0] for s in SEG]; total = sum(durs)
    print(f"duração: {total:.1f}s", flush=True)
    # divide as cenas em blocos de duração parecida e renderiza em paralelo
    bounds = [0]; acc = 0
    for i, d in enumerate(durs):
        acc += d
        if len(bounds) < workers and acc >= total * len(bounds) / workers: bounds.append(i + 1)
    bounds.append(len(SEG))
    tmp = tempfile.mkdtemp()
    parts = [f"{tmp}/part{k}.mp4" for k in range(len(bounds) - 1)]
    procs = [subprocess.Popen([sys.executable, __file__, A, OUT, DATE, "--part", str(bounds[k]), str(bounds[k + 1]), parts[k]]) for k in range(len(parts))]
    for pr in procs:
        if pr.wait(): sys.exit("falha ao renderizar um bloco")
    with open(f"{tmp}/list.txt", "w") as f: f.writelines(f"file '{p}'\n" for p in parts)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{tmp}/list.txt",
                    "-ss", str(MUSIC_OFFSET), "-i", f"{A}/music.mp3",
                    "-map", "0:v", "-map", "1:a", "-af", f"afade=t=in:d=3,afade=t=out:st={total-5}:d=5,volume=0.9",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", str(total), "-movflags", "+faststart", OUT], check=True)
    print("ok", flush=True)

if "--part" in sys.argv:
    i = sys.argv.index("--part"); render_part(int(sys.argv[i + 1]), int(sys.argv[i + 2]), sys.argv[i + 3])
else:
    main()
