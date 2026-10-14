"""Renderiza o vídeo 'Em Movimento' (vertical 1080x1920) a partir de fotos, vídeo, logo e música."""
import subprocess, sys, os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps, ImageEnhance

W, H, FPS = 1080, 1920, 30
A = sys.argv[1]            # pasta de assets (fotos 2-5.jpg, clip.mp4, logo.png, music.mp3)
OUT = sys.argv[2]
DATE = sys.argv[3] if len(sys.argv) > 3 else ""
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
yy, xx = np.mgrid[0:H, 0:W]
VIG = (1 - 0.75 * np.clip(((xx - W/2)/(W*0.75))**2 + ((yy - H/2)/(H*0.62))**2, 0, 1))[..., None].astype(np.float32)
rng = np.random.default_rng(1)
GRAIN = [rng.normal(0, 7, (H//2, W//2, 1)).astype(np.float32).repeat(2, 0).repeat(2, 1) for _ in range(6)]

def grade(im, dark=0.62, sat=0.85):
    im = ImageEnhance.Color(im).enhance(sat)
    a = np.asarray(im).astype(np.float32) / 255
    a = a ** 1.15 * dark
    lum = a.mean(2, keepdims=True)
    sh = np.array(NAVY, np.float32) / 255; hi = np.array((1.0, 0.86, 0.80), np.float32)
    a = a * 0.85 + (sh * (1 - lum) * 0.35 + hi * lum * 0.15)
    return a

def cover(im, scale=1.18):
    r = max(W / im.width, H / im.height) * scale
    return im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)

class Photo:
    def __init__(s, path, **kw):
        s.base = cover(ImageOps.exif_transpose(Image.open(path)).convert("RGB"))
        s.kw = kw
    def frame(s, p, zoom=(1.0, 1.10), pan=(0, 0), dark=0.62, sat=0.85):
        z = zoom[0] + (zoom[1] - zoom[0]) * ease(p)
        bw, bh = s.base.size
        cw, ch = bw / 1.18 / z, bh / 1.18 / z
        cx = bw / 2 + pan[0] * (p - .5) * (bw - cw) ; cy = bh / 2 + pan[1] * (p - .5) * (bh - ch)
        im = s.base.resize((W, H), Image.BILINEAR, box=(cx - cw/2, cy - ch/2, cx + cw/2, cy + ch/2))
        return grade(im, dark, sat)

class Clip:
    def __init__(s, path):
        raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-t", "14", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        pr = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height", "-of", "csv=p=0", path], capture_output=True, text=True).stdout.split(",")
        w, h = int(pr[0]), int(pr[1])
        s.frames = [Image.frombytes("RGB", (w, h), raw[i:i + w*h*3]) for i in range(0, len(raw), w*h*3)]
    def frame(s, p, start=0, dark=0.62, **_):
        f = s.frames[min(len(s.frames) - 1, int((start + p * s.seg) * FPS))]
        bg = cover(f, 1.0).filter(ImageFilter.GaussianBlur(40))
        bg = ImageEnhance.Brightness(bg).enhance(0.45).resize((W, H))
        z = 1.0 + 0.06 * p
        fw = int(W * 1.25 * z); fh = int(f.height * fw / f.width)
        fg = f.resize((fw, fh), Image.BICUBIC)
        bg.paste(fg, ((W - fw)//2, (H - fh)//2))
        return grade(bg, dark + 0.1, 0.9)

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
    glow = layer.filter(ImageFilter.GaussianBlur(18))
    img.alpha_composite(glow); img.alpha_composite(glow); img.alpha_composite(layer)

# ---------- linha do tempo ----------
P = {i: Photo(f"{A}/{i}.jpg") for i in (2, 3, 4, 5, 6, 7, 8, 9)}
CLIPS = {}
for name in ["clip", "clip1", "clip2", "clip3", "clip4", "clip5", "clip6", "clip7", "clip8", "clip9", "clip11", "clip12", "clip13"]:
    c = Clip(f"{A}/{name}.mp4"); c.dur = len(c.frames) / FPS; CLIPS[name] = c
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
seg(2.4, 2, T(["NELE", "VIVEMOS."], B(150), color=WHITE), zoom=(1.15, 1.3), dark=0.4)
seg(2.4, 4, T(["NELE NOS", "MOVEMOS."], B(140), color=WHITE), zoom=(1.15, 1.3), dark=0.4)
seg(3.4, 3, T(["E NELE", "EXISTIMOS."], B(140), color=ROSE), zoom=(1.1, 1.3), dark=0.4)
seg(1.2, "black")
seg(4.6, "black", T(["EM", "MOVIMENTO"], B(150), track=10))
seg(5.0, "black", T(["Uma geração.", "Um propósito.", "Uma direção.", "Um Deus."], L(72)))
seg(9.0, "logo")

def light_leak(img, t, strength):
    if strength <= 0: return img
    g = np.zeros((H, W, 3), np.float32)
    cx = W * (0.5 + 0.6 * math.sin(t * 0.7)); cy = H * (0.3 + 0.3 * math.cos(t * 0.5))
    r2 = ((xx - cx) / (W * .7)) ** 2 + ((yy - cy) / (H * .5)) ** 2
    g += np.exp(-r2)[..., None] * (np.array(WINE, np.float32) / 255) * strength
    return img + g

LEAK = None
def compose(a, t):
    a = a * VIG + GRAIN[int(t * FPS) % 6] / 255
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).convert("RGBA")

def logo_frame(p, tl, dur):
    a = np.zeros((H, W, 3), np.float32)
    r = np.sqrt(((xx - W/2) / W) ** 2 + ((yy - H/2 + 120) / W) ** 2)
    a += np.exp(-r * 5)[..., None] * np.array(WINE, np.float32) / 255 * 0.55 * ease(tl / 1.5)
    img = compose(a, tl)
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

def main():
    total = sum(s[0] for s in SEG)
    print(f"duração: {total:.1f}s", flush=True)
    enc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-ss", str(MUSIC_OFFSET), "-i", f"{A}/music.mp3",
                            "-af", f"afade=t=in:d=3,afade=t=out:st={total-5}:d=5,volume=0.9", "-shortest",
                            "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    t0 = 0.0
    for si, (dur, bg, kw, txt) in enumerate(SEG):
        n = int(round(dur * FPS))
        verse = kw.pop("verse", None)
        for i in range(n):
            tl = i / FPS; p = i / max(1, n - 1); t = t0 + tl
            if bg == "logo":
                img = logo_frame(p, tl, dur)
            else:
                if bg == "black": a = np.zeros((H, W, 3), np.float32) + np.array(NAVY, np.float32) / 255 * 0.25
                elif str(bg).startswith("clip"): CLIPS[bg].seg = dur; a = CLIPS[bg].frame(p, **kw)
                else: a = P[bg].frame(p, **kw)
                # fade de entrada curto (corte suave) e leve light-leak na 2ª metade
                fin = ease(tl / 0.25) if dur > 1.5 else 1.0
                a = a * fin
                if t > 60 and bg != "black": a = light_leak(a, t, 0.18)
                img = compose(a, t)
                if txt: draw_text(img, txt, tl, dur)
                if verse:
                    q = eout((tl - 2.2) / 0.8) * (1 - ease((tl - (dur - 0.45)) / 0.45))
                    ImageDraw.Draw(img).text((W/2, H/2 + 300), verse, font=font(F_MED, 44), fill=ROSE + (int(255 * q),), anchor="mm")
            enc.stdin.write(img.convert("RGB").tobytes())
        t0 += dur
        print(f"  {si+1}/{len(SEG)}", end="\r", flush=True)
    enc.stdin.close(); enc.wait(); print("\nok")

main()
