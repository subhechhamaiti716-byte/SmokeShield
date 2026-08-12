import os
from PIL import Image

src_path = r"C:\Users\GEONIX\.gemini\antigravity\brain\f10d21c9-b0ad-49d7-87bd-b5dea9dbd4e1\smokeshield_logo_1786507542255.jpg"
dest_dir = r"C:\Users\GEONIX\.gemini\antigravity\scratch\smokeshield\frontend\assets\images"

# Ensure dest directory exists
os.makedirs(dest_dir, exist_ok=True)

try:
    img = Image.open(src_path)
    
    # Save as icon.png (1024x1024)
    img_icon = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    img_icon.save(os.path.join(dest_dir, "icon.png"), "PNG")
    print("Saved icon.png")
    
    # Save as splash-icon.png (1024x1024)
    img_splash = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    img_splash.save(os.path.join(dest_dir, "splash-icon.png"), "PNG")
    print("Saved splash-icon.png")
    
    # Save as android-icon-foreground.png (1024x1024)
    # We can use the same image as the foreground since it fits inside the adaptive safe area
    img_foreground = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    img_foreground.save(os.path.join(dest_dir, "android-icon-foreground.png"), "PNG")
    print("Saved android-icon-foreground.png")
    
except Exception as e:
    print("Error:", e)
