#!/usr/bin/env python3
"""
Metadata Cloner - Inject Ray-Ban Meta metadata into photos AND videos
Pre-configured with authentic Ray-Ban Stories metadata
Supports: ALL image formats (auto-converts to JPEG) + MOV, MP4 videos
"""

import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import piexif
import os
from datetime import datetime, timedelta
import random
import secrets
import uuid
import struct
import io

# Try to import PIL for format conversion
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("WARNING: Pillow not installed. Only JPEG images supported.")
    print("Install with: pip3 install Pillow")

# Try to import pillow-heif for HEIC support
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HAS_HEIF = True
except ImportError:
    HAS_HEIF = False


class MetadataCloner:
    def __init__(self, root):
        self.root = root
        self.root.title("Ray-Ban Meta Cloner")
        self.root.geometry("700x450")
        self.root.resizable(True, True)
        
        # Target image paths
        self.target_image_paths = []
        
        # Output folder - "Ready to Send" on Desktop
        self.output_folder = os.path.join(os.path.expanduser("~"), "Desktop", "Ready to Send")
        self.ensure_output_folder()
        
        # A/B Test Mode - Toggle between metadata formats
        self.metadata_mode = tk.StringVar(value="metaspoof")  # Default to working format
        
        # Configure style for modern look
        self.setup_styles()
        
        # Create UI
        self.create_ui()
    
    def ensure_output_folder(self):
        """Create the output folder if it doesn't exist"""
        if not os.path.exists(self.output_folder):
            os.makedirs(self.output_folder)
            print(f"Created output folder: {self.output_folder}")
    
    def open_output_folder(self):
        """Open the output folder in Finder"""
        import subprocess
        try:
            if os.name == 'posix':  # macOS/Linux
                subprocess.run(['open', self.output_folder])
            elif os.name == 'nt':  # Windows
                subprocess.run(['explorer', self.output_folder])
        except Exception as e:
            print(f"Could not open folder: {e}")
    
    def update_mode_display(self):
        """Update the mode indicator when toggle changes"""
        mode = self.metadata_mode.get()
        if mode == "metaspoof":
            self.mode_indicator.config(
                text="✓ Using: Metaspoof Format (no '2')",
                fg="#34C759"
            )
        else:
            self.mode_indicator.config(
                text="✓ Using: Authentic 2024 (with '2')",
                fg="#007AFF"
            )
    
    def generate_random_datetime(self):
        """Generate a random datetime within the last 30 days"""
        now = datetime.now()
        random_days = random.randint(0, 30)
        random_hours = random.randint(0, 23)
        random_minutes = random.randint(0, 59)
        random_seconds = random.randint(0, 59)
        
        random_date = now - timedelta(days=random_days, hours=random_hours, 
                                       minutes=random_minutes, seconds=random_seconds)
        return random_date.strftime("%Y:%m:%d %H:%M:%S")

    def deg_to_dms_rational(self, deg):
        """Convert decimal degrees to DMS rational format for GPS"""
        d = int(deg)
        m = int((deg - d) * 60)
        s = int(((deg - d) * 60 - m) * 60 * 100)
        return ((d, 1), (m, 1), (s, 100))

    def generate_uuid(self):
        """Generate a UUID in the format used by Ray-Ban Meta"""
        import uuid
        return str(uuid.uuid4()).upper()
    
    def create_rayban_exif(self):
        """Create Ray-Ban Meta EXIF data based on selected A/B test mode"""
        
        # Generate random but realistic values
        random_datetime = self.generate_random_datetime()
        unique_uuid = self.generate_uuid()
        
        # Get current mode
        mode = self.metadata_mode.get()
        
        # Camera settings
        exposure_times = [(1, 100), (1, 120), (1, 150), (1, 200), (1, 250), (1, 4000)]
        f_numbers = [(11, 5), (7, 5)]  # f/2.2 or f/1.4
        iso_values = [100, 125, 150, 200, 397, 400, 500]
        
        # Serial numbers
        body_serials = ["2Q", "4V", "3X", "5R", "6T"]
        body_serial = random.choice(body_serials)
        
        # Mode-specific values
        if mode == "authentic":
            # Authentic 2024/2025 format (Ray-Ban Meta Smart Glasses 2)
            model_name = "Ray-Ban Meta Smart Glasses 2"
            exif_version = b"0220"
            focal_length = (56, 25)  # From authentic sample
            focal_35mm = 13
            scene_capture = 0  # Standard
        else:
            # Metaspoof format (WORKING format - match exactly!)
            model_name = "Ray-Ban Meta Smart Glasses"
            exif_version = b"0231"
            focal_length = (35, 1)
            focal_35mm = 35
            scene_capture = 1  # Portrait - THIS IS KEY!
        
        # Build EXIF dictionary based on selected mode
        exif_dict = {
            "0th": {
                271: "Meta AI",          # Make - same for both modes
                272: model_name,         # Model - changes based on mode
                274: 1,                  # Orientation
                282: (72, 1),            # XResolution
                283: (72, 1),            # YResolution
                296: 2,                  # ResolutionUnit
                306: random_datetime,    # DateTime
            },
            "Exif": {
                33434: random.choice(exposure_times),  # ExposureTime
                33437: random.choice(f_numbers),       # FNumber
                34850: 1,                # ExposureProgram
                34855: random.choice(iso_values),      # ISOSpeedRatings
                36864: exif_version,     # ExifVersion - mode specific
                36867: random_datetime,  # DateTimeOriginal
                36868: random_datetime,  # DateTimeDigitized
                37377: (26773, 3361),    # ShutterSpeedValue
                37378: (25249, 26007),   # ApertureValue
                37380: (0, 1),           # ExposureBiasValue
                37381: (227, 100),       # MaxApertureValue
                37383: 5,                # MeteringMode (Pattern)
                37385: 0,                # Flash (no flash)
                37386: focal_length,     # FocalLength - mode specific
                37510: f"ASCII   {unique_uuid}".encode('utf-8'),  # UserComment
                37520: str(random.randint(100, 999)),  # SubSecTime
                37521: str(random.randint(100, 999)),  # SubSecTimeOriginal
                37522: str(random.randint(100, 999)),  # SubSecTimeDigitized
                40960: b"0100",          # FlashpixVersion
                40961: 1,                # ColorSpace (sRGB)
                40962: 3024,             # PixelXDimension
                40963: 4032,             # PixelYDimension
                41495: 2,                # SensingMethod
                41986: 0,                # ExposureMode (Auto)
                41987: 0,                # WhiteBalance (Auto)
                41989: focal_35mm,       # FocalLengthIn35mmFilm - mode specific
                41990: scene_capture,    # SceneCaptureType - Portrait for Metaspoof!
                42033: body_serial,      # BodySerialNumber
            },
            "GPS": {},
            "1st": {},
            "thumbnail": None
        }
        
        print(f"[{mode.upper()}] Using model: {model_name}")
        
        return exif_dict
    
    def setup_styles(self):
        """Configure modern styling"""
        self.bg_color = "#f5f5f5"
        self.accent_color = "#007AFF"
        self.success_color = "#34C759"
        self.error_color = "#FF3B30"
        self.rayban_color = "#1a1a1a"
        
        self.root.configure(bg=self.bg_color)
    
    def create_ui(self):
        """Create the user interface"""
        # Main container with padding
        main_frame = tk.Frame(self.root, bg=self.bg_color)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=30, pady=30)
        
        # Title
        title_label = tk.Label(
            main_frame,
            text="🕶️ Ray-Ban Meta Cloner",
            font=("SF Pro Display", 28, "bold") if os.name == 'posix' else ("Segoe UI", 28, "bold"),
            bg=self.bg_color,
            fg=self.rayban_color
        )
        title_label.pack(pady=(0, 10))
        
        # Subtitle showing pre-configured metadata
        subtitle_label = tk.Label(
            main_frame,
            text="Injects authentic Ray-Ban Stories metadata into photos & videos",
            font=("SF Pro Display", 12) if os.name == 'posix' else ("Segoe UI", 12),
            bg=self.bg_color,
            fg="#6e6e73"
        )
        subtitle_label.pack(pady=(0, 5))
        
        # A/B Test Mode Toggle
        mode_frame = tk.Frame(main_frame, bg="#1a1a1a", padx=15, pady=12)
        mode_frame.pack(fill=tk.X, pady=(10, 15))
        
        mode_label = tk.Label(
            mode_frame,
            text="🧪 A/B TEST MODE",
            font=("SF Pro Display", 10, "bold") if os.name == 'posix' else ("Segoe UI", 10, "bold"),
            bg="#1a1a1a",
            fg="#FFD700"
        )
        mode_label.pack(anchor=tk.W)
        
        # Radio buttons for mode selection
        radio_frame = tk.Frame(mode_frame, bg="#1a1a1a")
        radio_frame.pack(fill=tk.X, pady=(8, 0))
        
        self.mode_a_radio = tk.Radiobutton(
            radio_frame,
            text="Mode A: Metaspoof Format (Ray-Ban Meta Smart Glasses)",
            variable=self.metadata_mode,
            value="metaspoof",
            font=("SF Pro Display", 10) if os.name == 'posix' else ("Segoe UI", 10),
            bg="#1a1a1a",
            fg="white",
            selectcolor="#333333",
            activebackground="#1a1a1a",
            activeforeground="white",
            command=self.update_mode_display
        )
        self.mode_a_radio.pack(anchor=tk.W)
        
        self.mode_b_radio = tk.Radiobutton(
            radio_frame,
            text="Mode B: Authentic 2024 (Ray-Ban Meta Smart Glasses 2)",
            variable=self.metadata_mode,
            value="authentic",
            font=("SF Pro Display", 10) if os.name == 'posix' else ("Segoe UI", 10),
            bg="#1a1a1a",
            fg="white",
            selectcolor="#333333",
            activebackground="#1a1a1a",
            activeforeground="white",
            command=self.update_mode_display
        )
        self.mode_b_radio.pack(anchor=tk.W)
        
        # Current mode indicator
        self.mode_indicator = tk.Label(
            mode_frame,
            text="✓ Using: Metaspoof Format",
            font=("SF Pro Display", 9) if os.name == 'posix' else ("Segoe UI", 9),
            bg="#1a1a1a",
            fg="#34C759"
        )
        self.mode_indicator.pack(anchor=tk.W, pady=(8, 0))
        
        # Target Images Section
        target_frame = tk.Frame(main_frame, bg=self.bg_color)
        target_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 20))
        
        target_label = tk.Label(
            target_frame,
            text="Select Files to Process",
            font=("SF Pro Display", 14, "bold") if os.name == 'posix' else ("Segoe UI", 14, "bold"),
            bg=self.bg_color,
            fg="#1d1d1f"
        )
        target_label.pack(anchor=tk.W, pady=(0, 8))
        
        self.target_button = tk.Button(
            target_frame,
            text="📁 Select Photos & Videos",
            command=self.select_target_images,
            font=("SF Pro Display", 12) if os.name == 'posix' else ("Segoe UI", 12),
            bg="#007AFF",
            fg="white",
            activebackground="#0051D5",
            activeforeground="white",
            relief=tk.FLAT,
            padx=20,
            pady=10,
            cursor="hand2",
            borderwidth=0
        )
        self.target_button.pack(fill=tk.X)
        
        # Target images list with scrollbar
        list_frame = tk.Frame(target_frame, bg=self.bg_color)
        list_frame.pack(fill=tk.BOTH, expand=True, pady=(10, 0))
        
        scrollbar = tk.Scrollbar(list_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.target_listbox = tk.Listbox(
            list_frame,
            font=("SF Pro Display", 10) if os.name == 'posix' else ("Segoe UI", 10),
            bg="white",
            fg="#1d1d1f",
            relief=tk.FLAT,
            borderwidth=1,
            highlightthickness=1,
            highlightbackground="#d1d1d6",
            selectmode=tk.EXTENDED,
            yscrollcommand=scrollbar.set
        )
        self.target_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.target_listbox.yview)
        
        # Status label
        self.status_label = tk.Label(
            main_frame,
            text="",
            font=("SF Pro Display", 10) if os.name == 'posix' else ("Segoe UI", 10),
            bg=self.bg_color,
            fg="#6e6e73"
        )
        self.status_label.pack(pady=(5, 10))
        
        # Process Button
        self.process_button = tk.Button(
            main_frame,
            text="🕶️ Apply Ray-Ban Meta Data",
            command=self.apply_metadata,
            font=("SF Pro Display", 14, "bold") if os.name == 'posix' else ("Segoe UI", 14, "bold"),
            bg=self.rayban_color,
            fg="white",
            activebackground="#333333",
            activeforeground="white",
            relief=tk.FLAT,
            padx=20,
            pady=15,
            cursor="hand2",
            borderwidth=0
        )
        self.process_button.pack(fill=tk.X)
    
    def select_target_images(self):
        """Open file dialog to select multiple target files (images and videos)"""
        # All supported image extensions
        image_extensions = (
            '.jpg', '.jpeg', '.png', '.heic', '.heif', 
            '.webp', '.bmp', '.gif', '.tiff', '.tif'
        )
        video_extensions = ('.mov', '.mp4')
        
        file_paths = filedialog.askopenfilenames(
            title="Select Photos & Videos to Process",
            filetypes=[
                ("All Supported", "*.jpg *.jpeg *.png *.heic *.heif *.webp *.bmp *.gif *.tiff *.tif *.mov *.mp4 *.JPG *.JPEG *.PNG *.HEIC *.MOV *.MP4"),
                ("Images", "*.jpg *.jpeg *.png *.heic *.heif *.webp *.bmp *.gif *.tiff *.tif"),
                ("Videos", "*.mov *.mp4"),
                ("All Files", "*.*")
            ]
        )
        
        if file_paths:
            all_extensions = image_extensions + video_extensions
            valid_paths = [path for path in file_paths if path.lower().endswith(all_extensions)]
            
            if len(valid_paths) < len(file_paths):
                skipped = len(file_paths) - len(valid_paths)
                messagebox.showwarning(
                    "Some Files Skipped",
                    f"Skipped {skipped} unsupported file(s). Selected {len(valid_paths)} valid files."
                )
            
            self.target_image_paths = list(valid_paths)
            
            # Update listbox with file type indicators
            self.target_listbox.delete(0, tk.END)
            for path in self.target_image_paths:
                filename = os.path.basename(path)
                ext = os.path.splitext(filename)[1].lower()
                if ext in video_extensions:
                    self.target_listbox.insert(tk.END, f"🎬 {filename}")
                elif ext in ['.jpg', '.jpeg']:
                    self.target_listbox.insert(tk.END, f"📷 {filename}")
                else:
                    # Non-JPEG images will be converted
                    self.target_listbox.insert(tk.END, f"🔄 {filename} → JPEG")
            
            # Count files by type
            photo_count = len([p for p in self.target_image_paths if p.lower().endswith(image_extensions)])
            video_count = len([p for p in self.target_image_paths if p.lower().endswith(video_extensions)])
            convert_count = len([p for p in self.target_image_paths 
                                if p.lower().endswith(image_extensions) 
                                and not p.lower().endswith(('.jpg', '.jpeg'))])
            
            # Update status
            status_parts = []
            if photo_count > 0:
                status_parts.append(f"{photo_count} photo{'s' if photo_count != 1 else ''}")
            if video_count > 0:
                status_parts.append(f"{video_count} video{'s' if video_count != 1 else ''}")
            
            status_text = f"✓ {' and '.join(status_parts)} selected"
            if convert_count > 0:
                status_text += f" ({convert_count} will convert to JPEG)"
            
            self.status_label.config(text=status_text, fg=self.success_color)
    
    # ============ VIDEO PROCESSING METHODS ============


    def process_video(self, input_path):
        """Inject QuickTime metadata into video file - converts to MOV for iOS compatibility"""
        import shutil
        import subprocess
        
        basename = os.path.basename(input_path)
        name_without_ext = os.path.splitext(basename)[0]
        ext = os.path.splitext(basename)[1]  # Keep original extension
        
        # Get mode-specific values
        mode = self.metadata_mode.get()
        if mode == "authentic":
            model_name = "Ray-Ban Meta Smart Glasses 2"
        else:
            model_name = "Ray-Ban Meta Smart Glasses"
        
        unique_uuid = str(uuid.uuid4()).upper()
        comment = f"app=Meta AI&device={model_name}&id={unique_uuid}"
        creation_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
        
        print(f"[{mode.upper()} VIDEO] Model: {model_name}")
        
        # Check for exiftool
        exiftool_path = None
        for path in ['/opt/homebrew/bin/exiftool', '/usr/local/bin/exiftool']:
            if os.path.exists(path):
                exiftool_path = path
                break
        
        # Copy video without re-encoding (avoids ffmpeg fingerprints that Instagram detects)
        output_path = os.path.join(self.output_folder, f"RayBan_{name_without_ext}{ext}")
        shutil.copy2(input_path, output_path)
        print(f"  [copy] Video copied (no re-encoding - cleaner for Instagram)")
        
        # Step 2: Add QuickTime metadata with exiftool
        if exiftool_path:
            try:
                # Format date for QuickTime (YYYY:MM:DD HH:MM:SS)
                qt_date = datetime.now().strftime("%Y:%m:%d %H:%M:%S")
                
                cmd = [
                    exiftool_path, '-overwrite_original',
                    # Keys metadata (what Instagram reads)
                    f'-Keys:Model={model_name}',
                    f'-Keys:Copyright=Meta AI',
                    f'-Keys:Comment={comment}',
                    f'-Keys:Description=4V',
                    f'-Keys:CreationDate={creation_date}',
                    # QuickTime header dates (to look authentic)
                    f'-QuickTime:CreateDate={qt_date}',
                    f'-QuickTime:ModifyDate={qt_date}',
                    f'-QuickTime:TrackCreateDate={qt_date}',
                    f'-QuickTime:TrackModifyDate={qt_date}',
                    f'-QuickTime:MediaCreateDate={qt_date}',
                    f'-QuickTime:MediaModifyDate={qt_date}',
                    output_path
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode == 0:
                    print(f"  ✓ QuickTime metadata injected")
                    return output_path
                else:
                    print(f"  ⚠ exiftool error: {result.stderr[:100] if result.stderr else result.stdout[:100]}")
            except Exception as e:
                print(f"  ⚠ exiftool exception: {e}")
        
        print(f"  ✓ Video saved (metadata may be limited)")
        return output_path
    
    # ============ IMAGE CONVERSION ============
    
    def convert_to_jpeg_with_exif(self, input_path, exif_bytes):
        """Convert any image format to JPEG with EXIF metadata"""
        if not HAS_PIL:
            raise ValueError("Pillow not installed - cannot convert image formats")
        
        # Open the image
        img = Image.open(input_path)
        
        # Convert to RGB if necessary (for PNG with transparency, etc.)
        if img.mode in ('RGBA', 'LA', 'P'):
            # Create white background for transparent images
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Generate output path in "Ready to Send" folder
        basename = os.path.splitext(os.path.basename(input_path))[0]
        output_path = os.path.join(self.output_folder, f"RayBan_{basename}.jpg")
        
        # Save as JPEG first (without EXIF)
        img.save(output_path, 'JPEG', quality=95)
        
        # Then inject EXIF using piexif (more reliable)
        piexif.insert(exif_bytes, output_path)
        
        return output_path
    
    # ============ MAIN PROCESSING ============
    
    def apply_metadata(self):
        """Apply Ray-Ban Meta data to all target files (photos and videos)"""
        if not self.target_image_paths:
            messagebox.showerror(
                "No Files Selected",
                "Please select at least one file to process."
            )
            return
        
        # Define extensions
        image_extensions = ('.jpg', '.jpeg', '.png', '.heic', '.heif', 
                          '.webp', '.bmp', '.gif', '.tiff', '.tif')
        video_extensions = ('.mov', '.mp4')
        jpeg_extensions = ('.jpg', '.jpeg')
        
        # Process files
        photo_success = 0
        video_success = 0
        converted_count = 0
        failed_files = []
        created_files = []
        
        for target_path in self.target_image_paths:
            target_name = os.path.basename(target_path)
            ext = os.path.splitext(target_path)[1].lower()
            print(f"Processing: {target_name}")
            
            try:
                if not os.path.exists(target_path):
                    print(f"  ✗ File not found")
                    failed_files.append((target_name, "File not found"))
                    continue
                
                if ext in jpeg_extensions:
                    # Native JPEG - copy to output folder with EXIF
                    unique_exif = self.create_rayban_exif()
                    exif_bytes = piexif.dump(unique_exif)
                    
                    # Copy to Ready to Send folder
                    output_path = os.path.join(self.output_folder, f"RayBan_{target_name}")
                    
                    # Copy original file first
                    import shutil
                    shutil.copy2(target_path, output_path)
                    
                    # Remove existing EXIF from copy
                    try:
                        piexif.remove(output_path)
                    except:
                        pass
                    
                    # Inject our Ray-Ban EXIF using piexif (most reliable method)
                    piexif.insert(exif_bytes, output_path)
                    
                    print(f"  ✓ JPEG saved: {os.path.basename(output_path)}")
                    photo_success += 1
                    created_files.append(output_path)
                    
                elif ext in image_extensions:
                    # Non-JPEG image - convert to JPEG with EXIF
                    if not HAS_PIL:
                        print(f"  ✗ Cannot convert - Pillow not installed")
                        failed_files.append((target_name, "Install Pillow: pip3 install Pillow"))
                        continue
                    
                    unique_exif = self.create_rayban_exif()
                    exif_bytes = piexif.dump(unique_exif)
                    output_path = self.convert_to_jpeg_with_exif(target_path, exif_bytes)
                    print(f"  ✓ Converted to JPEG: {os.path.basename(output_path)}")
                    photo_success += 1
                    converted_count += 1
                    created_files.append(output_path)
                    
                elif ext in video_extensions:
                    # Process video
                    output_path = self.process_video(target_path)
                    print(f"  ✓ Video saved: {os.path.basename(output_path)}")
                    video_success += 1
                    created_files.append(output_path)
                
            except Exception as e:
                error_msg = str(e)
                print(f"  ✗ Failed: {error_msg}")
                failed_files.append((target_name, error_msg))
        
        # Show results
        total_success = photo_success + video_success
        if total_success > 0:
            parts = []
            if photo_success > 0:
                parts.append(f"{photo_success} photo{'s' if photo_success != 1 else ''}")
            if video_success > 0:
                parts.append(f"{video_success} video{'s' if video_success != 1 else ''}")
            
            message = f"✓ Applied Ray-Ban Meta data to {' and '.join(parts)}!"
            message += f"\n\n📁 Saved to: Ready to Send (Desktop)"
            
            if len(created_files) > 0:
                message += f"\n\nFiles created:"
                for filepath in created_files[:5]:
                    message += f"\n• {os.path.basename(filepath)}"
                if len(created_files) > 5:
                    message += f"\n... and {len(created_files) - 5} more"
            
            if failed_files:
                message += f"\n\n⚠ Failed for {len(failed_files)} file{'s' if len(failed_files) != 1 else ''}:"
                for filename, error in failed_files[:3]:
                    message += f"\n• {filename}"
                if len(failed_files) > 3:
                    message += f"\n... and {len(failed_files) - 3} more"
            
            messagebox.showinfo("Success! 🕶️", message)
            
            # Open the output folder
            self.open_output_folder()
            
            # Update status
            status = f"✓ Processed {' and '.join(parts)}"
            if converted_count > 0:
                status += f" ({converted_count} converted)"
            self.status_label.config(text=status, fg=self.success_color)
        else:
            message = "Failed to process any files.\n\n"
            for filename, error in failed_files[:5]:
                message += f"\n• {filename}: {error}"
            if len(failed_files) > 5:
                message += f"\n... and {len(failed_files) - 5} more"
            messagebox.showerror("Error", message)


def main():
    """Main entry point"""
    root = tk.Tk()
    app = MetadataCloner(root)
    root.mainloop()


if __name__ == "__main__":
    main()
