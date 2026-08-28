import zlib
import struct
import math
import os

def create_png_simple(width, height, draw_fn, filename):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter type 0 (None)
        for x in range(width):
            r, g, b = draw_fn(x, y, width, height)
            raw_data.extend([int(r), int(g), int(b), 255])
    
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    
    png_header = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw_data), 6)
    
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(png_header)
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', idat))
        f.write(chunk(b'IEND', b''))
    print(f"Generated {filename} ({width}x{height})")

def draw_desktop(x, y, w, h):
    # Dark modern studio UI preview
    nx = x / w
    ny = y / h
    # Gradient background
    r = 11 + (1 - ny) * 8
    g = 15 + (1 - ny) * 12
    b = 25 + (1 - ny) * 18
    
    # Header bar
    if y < 60:
        return (15, 23, 42)
    
    # Center app card
    card_x1 = int(w * 0.28)
    card_x2 = int(w * 0.72)
    card_y1 = int(h * 0.12)
    card_y2 = int(h * 0.88)
    
    if card_x1 <= x <= card_x2 and card_y1 <= y <= card_y2:
        # Card body
        cr, cg, cb = 20, 29, 47
        
        # Big circular mic button in center
        cx = int(w * 0.5)
        cy = int(h * 0.45)
        dist = math.sqrt((x - cx)**2 + (y - cy)**2)
        
        # Outer pulse ring
        if 85 <= dist <= 100:
            return (16, 185, 129)
        elif dist < 85:
            # Gradient button
            btn_g = (y - (cy - 85)) / 170
            return (int(16 + btn_g * 10), int(185 - btn_g * 40), int(129 - btn_g * 30))
        
        # Level meter bar at y around 65% of card
        meter_y1 = int(h * 0.65)
        meter_y2 = int(h * 0.68)
        meter_x1 = int(w * 0.35)
        meter_x2 = int(w * 0.65)
        if meter_y1 <= y <= meter_y2 and meter_x1 <= x <= meter_x2:
            meter_pos = (x - meter_x1) / (meter_x2 - meter_x1)
            if meter_pos < 0.7:
                return (16, 185, 129)
            elif meter_pos < 0.85:
                return (245, 158, 11)
            else:
                return (30, 41, 59)
                
        return (cr, cg, cb)
        
    return (r, g, b)

def draw_mobile(x, y, w, h):
    nx = x / w
    ny = y / h
    # Dark UI
    r = 11 + (1 - ny) * 8
    g = 15 + (1 - ny) * 12
    b = 25 + (1 - ny) * 18
    
    # Status bar
    if y < 40:
        return (15, 23, 42)
        
    # Big mic button
    cx = int(w * 0.5)
    cy = int(h * 0.42)
    dist = math.sqrt((x - cx)**2 + (y - cy)**2)
    if 95 <= dist <= 112:
        return (16, 185, 129)
    elif dist < 95:
        btn_g = (y - (cy - 95)) / 190
        return (int(16 + btn_g * 10), int(185 - btn_g * 40), int(129 - btn_g * 30))
        
    # Meter bar
    meter_y1 = int(h * 0.60)
    meter_y2 = int(h * 0.63)
    meter_x1 = int(w * 0.12)
    meter_x2 = int(w * 0.88)
    if meter_y1 <= y <= meter_y2 and meter_x1 <= x <= meter_x2:
        meter_pos = (x - meter_x1) / (meter_x2 - meter_x1)
        if meter_pos < 0.65:
            return (16, 185, 129)
        elif meter_pos < 0.82:
            return (245, 158, 11)
        else:
            return (30, 41, 59)
            
    return (r, g, b)

create_png_simple(640, 360, draw_desktop, 'screenshots/screenshot-desktop.png')
create_png_simple(360, 640, draw_mobile, 'screenshots/screenshot-mobile.png')
