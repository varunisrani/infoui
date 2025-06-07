#!/usr/bin/env python3
from PIL import Image
from io import BytesIO

# 1. Load your black & white mask as a grayscale image
mask = Image.open("input_20250608_040431.png").convert("L")

# 2. Convert it to RGBA so it has space for an alpha channel
mask_rgba = mask.convert("RGBA")

# 3. Use the mask itself as the alpha channel
mask_rgba.putalpha(mask)

# 4. Convert the mask into PNG bytes
buf = BytesIO()
mask_rgba.save(buf, format="PNG")
mask_bytes = buf.getvalue()

# 5. Save the resulting file
output_path = "mask_alpha_20250608_040431.png"
with open(output_path, "wb") as f:
    f.write(mask_bytes)

print(f"✅ Saved RGBA mask with alpha channel to: {output_path}") 