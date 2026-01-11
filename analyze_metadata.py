#!/usr/bin/env python3
"""
Analyze metadata from sample files to compare Ray-Ban Meta vs Phone
"""

import os
import json
from datetime import datetime

# Try to import available libraries
try:
    import piexif
    HAS_PIEXIF = True
except ImportError:
    HAS_PIEXIF = False

try:
    from PIL import Image
    from PIL.ExifTags import TAGS, GPSTAGS
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

def extract_exif_piexif(filepath):
    """Extract EXIF using piexif"""
    try:
        exif_dict = piexif.load(filepath)
        result = {}
        
        for ifd_name in exif_dict:
            if ifd_name == "thumbnail":
                continue
            if exif_dict[ifd_name]:
                result[ifd_name] = {}
                for tag, value in exif_dict[ifd_name].items():
                    # Try to decode bytes to string
                    if isinstance(value, bytes):
                        try:
                            value = value.decode('utf-8', errors='ignore').strip('\x00')
                        except:
                            value = str(value)
                    result[ifd_name][str(tag)] = value
        return result
    except Exception as e:
        return {"error": str(e)}

def extract_exif_pil(filepath):
    """Extract EXIF using PIL"""
    try:
        img = Image.open(filepath)
        exif_data = img._getexif()
        if not exif_data:
            return {"error": "No EXIF data found"}
        
        result = {}
        for tag_id, value in exif_data.items():
            tag = TAGS.get(tag_id, tag_id)
            if isinstance(value, bytes):
                try:
                    value = value.decode('utf-8', errors='ignore').strip('\x00')
                except:
                    value = str(value)[:100]
            result[str(tag)] = value
        return result
    except Exception as e:
        return {"error": str(e)}

def analyze_file(filepath):
    """Analyze a single file"""
    print(f"\n{'='*80}")
    print(f"FILE: {os.path.basename(filepath)}")
    print(f"{'='*80}")
    
    ext = os.path.splitext(filepath)[1].lower()
    
    if ext in ['.jpg', '.jpeg']:
        print("\n--- PIEXIF Analysis ---")
        if HAS_PIEXIF:
            exif = extract_exif_piexif(filepath)
            print(json.dumps(exif, indent=2, default=str))
        
        print("\n--- PIL Analysis ---")
        if HAS_PIL:
            exif = extract_exif_pil(filepath)
            for key, value in sorted(exif.items()):
                print(f"  {key}: {value}")
    
    elif ext in ['.heic', '.heif']:
        print("HEIC format - attempting PIL analysis...")
        if HAS_PIL:
            try:
                exif = extract_exif_pil(filepath)
                for key, value in sorted(exif.items()):
                    print(f"  {key}: {value}")
            except Exception as e:
                print(f"  Error: {e}")
                print("  (May need pillow-heif package for HEIC support)")
    
    elif ext in ['.mov', '.mp4']:
        print("Video format - need to analyze with ffprobe or similar")
        print("Will extract using subprocess...")
        
        # Try to get basic file info
        file_size = os.path.getsize(filepath)
        print(f"  File size: {file_size / 1024 / 1024:.2f} MB")

def main():
    samples_dir = "/Users/bpmadmin/Charitycase/samples"
    
    print("="*80)
    print("METADATA ANALYSIS - Ray-Ban Meta vs Phone")
    print("="*80)
    
    # List all files
    files = os.listdir(samples_dir)
    print(f"\nFound {len(files)} files:")
    for f in files:
        filepath = os.path.join(samples_dir, f)
        size = os.path.getsize(filepath) / 1024 / 1024
        print(f"  - {f} ({size:.2f} MB)")
    
    # Analyze each file
    for f in sorted(files):
        filepath = os.path.join(samples_dir, f)
        analyze_file(filepath)

if __name__ == "__main__":
    main()



