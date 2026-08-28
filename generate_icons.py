import zlib
import struct
import math
import os

def create_png(width, height, draw_fn, filename):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter type 0 (None)
        for x in range(width):
            r, g, b, a = draw_fn(x, y, width, height)
            raw_data.extend([int(r), int(g), int(b), int(a)])
    
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    
    png_header = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw_data), 9)
    
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(png_header)
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', idat))
        f.write(chunk(b'IEND', b''))
    print(f"Generated {filename} ({width}x{height})")

def render_icon(x, y, w, h, maskable=False):
    # Normalized coordinates -1 to 1
    nx = (x / (w - 1)) * 2 - 1
    ny = (y / (h - 1)) * 2 - 1
    
    scale = 0.75 if maskable else 0.88
    nx /= scale
    ny /= scale

    # Background color: Deep dark studio slate #0B0F19 -> (11, 15, 25)
    bg_r, bg_g, bg_b = 11, 15, 25
    
    # Distance from center
    dist = math.sqrt(nx*nx + ny*ny)
    
    # Rounded squircle for standard icon (maskable is full bleed)
    if not maskable:
        # squircle distance
        sq_dist = (abs(nx)**4.5 + abs(ny)**4.5)**(1/4.5)
        if sq_dist > 1.05:
            return (0, 0, 0, 0)
        # Smooth squircle edge
        edge_alpha = max(0.0, min(1.0, (1.05 - sq_dist) * 20))
    else:
        edge_alpha = 1.0

    # Ambient radial gradient glow in background
    glow1 = max(0.0, 1.0 - dist * 0.9)
    r = bg_r + glow1 * 15
    g = bg_g + glow1 * 40
    b = bg_b + glow1 * 55
    
    # Sound wave rings (arcs on left and right)
    # Right wave 1
    w_dist1 = math.sqrt((nx - 0.0)**2 + (ny + 0.15)**2)
    if 0.48 <= w_dist1 <= 0.58 and abs(nx) > 0.28 and ny < 0.2:
        ring_alpha = math.sin((w_dist1 - 0.48) / 0.10 * math.pi) * 0.7
        r = r * (1 - ring_alpha) + 6 * ring_alpha
        g = g * (1 - ring_alpha) + 182 * ring_alpha
        b = b * (1 - ring_alpha) + 212 * ring_alpha

    # Right wave 2
    if 0.68 <= w_dist1 <= 0.78 and abs(nx) > 0.42 and ny < 0.25:
        ring_alpha = math.sin((w_dist1 - 0.68) / 0.10 * math.pi) * 0.5
        r = r * (1 - ring_alpha) + 16 * ring_alpha
        g = g * (1 - ring_alpha) + 185 * ring_alpha
        b = b * (1 - ring_alpha) + 129 * ring_alpha

    # Microphone Capsule (rounded rectangle at top center)
    # Centered around (0, -0.15), width 0.36, height 0.55
    mic_x = nx
    mic_y = ny + 0.15
    
    # Capsule upper dome & body
    if abs(mic_x) <= 0.18 and -0.42 <= mic_y <= 0.15:
        # Check rounded ends
        in_capsule = False
        if mic_y < -0.24:
            # Top dome
            if (mic_x**2 + (mic_y + 0.24)**2) <= (0.18**2):
                in_capsule = True
        elif mic_y > -0.03:
            # Bottom dome
            if (mic_x**2 + (mic_y + 0.03)**2) <= (0.18**2):
                in_capsule = True
        else:
            in_capsule = True
            
        if in_capsule:
            # Metallic emerald gradient with highlights
            grad = (mic_x + 0.18) / 0.36
            # Horizontal highlight band
            highlight = math.exp(-((mic_x + 0.06)**2) / 0.008)
            cr = 16 + highlight * 180 + grad * 20
            cg = 185 + highlight * 70
            cb = 129 + highlight * 100
            
            # Mesh lines across the top half
            if mic_y < -0.08 and int((mic_y + 0.5) * 40) % 2 == 0:
                cr *= 0.82
                cg *= 0.82
                cb *= 0.82
            
            r, g, b = cr, cg, cb

    # U-shaped cradle holder
    cradle_dist = math.sqrt(mic_x**2 + (mic_y + 0.02)**2)
    if 0.24 <= cradle_dist <= 0.32 and mic_y >= -0.05 and mic_y <= 0.32:
        c_alpha = 1.0
        # cradle color (metallic light slate)
        r = r * (1 - c_alpha) + 226 * c_alpha
        g = g * (1 - c_alpha) + 232 * c_alpha
        b = b * (1 - c_alpha) + 240 * c_alpha

    # Stand vertical stem
    if abs(nx) <= 0.045 and 0.30 <= ny <= 0.56:
        r, g, b = 226, 232, 240

    # Stand base horizontal bar
    if abs(nx) <= 0.28 and 0.54 <= ny <= 0.62:
        r, g, b = 226, 232, 240

    # Glow indicator dot on mic
    dot_dist = math.sqrt(nx**2 + (ny - 0.04)**2)
    if dot_dist <= 0.035:
        r, g, b = 6, 182, 212

    return (min(255, max(0, r)), min(255, max(0, g)), min(255, max(0, b)), int(edge_alpha * 255))

# Generate all icons
sizes = [
    (16, 16, False, 'icons/icon-16.png'),
    (32, 32, False, 'icons/icon-32.png'),
    (180, 180, False, 'icons/apple-touch-icon.png'),
    (192, 192, False, 'icons/icon-192.png'),
    (512, 512, False, 'icons/icon-512.png'),
    (192, 192, True, 'icons/icon-192-maskable.png'),
    (512, 512, True, 'icons/icon-512-maskable.png')
]

for w, h, maskable, path in sizes:
    create_png(w, h, lambda x, y, w, h, m=maskable: render_icon(x, y, w, h, m), path)

# Also create favicon.ico from icon-32.png
# Minimal valid ICO format containing 32x32 PNG
with open('icons/icon-32.png', 'rb') as png_file:
    png_data = png_file.read()

ico_header = struct.pack('<HHH', 0, 1, 1)
ico_dir = struct.pack('<BBBBHHII', 32, 32, 0, 0, 1, 32, len(png_data), 6 + 16)
with open('icons/favicon.ico', 'wb') as f:
    f.write(ico_header + ico_dir + png_data)
print("Generated icons/favicon.ico")
