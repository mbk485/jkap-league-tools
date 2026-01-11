#!/usr/bin/env python3
"""
Verify metadata in processed files vs the original Ray-Ban sample
"""

import piexif
import os
import sys
from PIL import Image
from PIL.ExifTags import TAGS

def read_exif(filepath):
    """Read and display EXIF data from an image"""
    print(f"\n{'='*60}")
    print(f"FILE: {os.path.basename(filepath)}")
    print(f"{'='*60}")
    
    try:
        # Method 1: piexif
        exif_dict = piexif.load(filepath)
        
        print("\n📷 CRITICAL FIELDS (what Instagram checks):")
        
        # 0th IFD
        ifd0 = exif_dict.get("0th", {})
        make = ifd0.get(271, b"").decode() if isinstance(ifd0.get(271), bytes) else ifd0.get(271, "NOT SET")
        model = ifd0.get(272, b"").decode() if isinstance(ifd0.get(272), bytes) else ifd0.get(272, "NOT SET")
        software = ifd0.get(305, b"").decode() if isinstance(ifd0.get(305), bytes) else ifd0.get(305, "NOT SET")
        
        print(f"  Make: {make}")
        print(f"  Model: {model}")
        print(f"  Software: {software}")
        
        # Exif IFD
        exif_ifd = exif_dict.get("Exif", {})
        user_comment = exif_ifd.get(37510, b"")
        if isinstance(user_comment, bytes):
            user_comment = user_comment.decode('utf-8', errors='ignore')
        body_serial = exif_ifd.get(42033, b"")
        if isinstance(body_serial, bytes):
            body_serial = body_serial.decode('utf-8', errors='ignore')
        
        print(f"  UserComment: {user_comment[:50]}..." if len(str(user_comment)) > 50 else f"  UserComment: {user_comment}")
        print(f"  BodySerialNumber: {body_serial}")
        
        print("\n📋 ALL 0th IFD fields:")
        for tag, value in ifd0.items():
            tag_name = TAGS.get(tag, tag)
            if isinstance(value, bytes):
                try:
                    value = value.decode('utf-8', errors='ignore')
                except:
                    value = str(value)[:50]
            print(f"  {tag} ({tag_name}): {value}")
        
        print("\n📋 ALL Exif IFD fields:")
        for tag, value in exif_ifd.items():
            if isinstance(value, bytes):
                try:
                    value = value.decode('utf-8', errors='ignore')[:50]
                except:
                    value = str(value)[:50]
            print(f"  {tag}: {value}")
            
    except Exception as e:
        print(f"Error reading EXIF: {e}")

def compare_files(original_sample, processed_file):
    """Compare metadata between original Ray-Ban sample and processed file"""
    print("\n" + "="*60)
    print("COMPARISON: Original vs Processed")
    print("="*60)
    
    read_exif(original_sample)
    read_exif(processed_file)

if __name__ == "__main__":
    # Check Ready to Send folder for processed files
    ready_folder = os.path.expanduser("~/Desktop/Ready to Send")
    samples_folder = "/Users/bpmadmin/Charitycase/samples"
    
    print("🔍 Checking metadata...")
    
    # Original sample
    original = os.path.join(samples_folder, "photo-2712_singular_display_fullPicture.JPG")
    if os.path.exists(original):
        read_exif(original)
    else:
        print(f"Original sample not found: {original}")
    
    # Check processed files
    if os.path.exists(ready_folder):
        files = [f for f in os.listdir(ready_folder) if f.lower().endswith(('.jpg', '.jpeg'))]
        if files:
            print(f"\n\n{'='*60}")
            print("PROCESSED FILES in Ready to Send:")
            print("="*60)
            for f in files[:3]:  # Check first 3
                read_exif(os.path.join(ready_folder, f))
        else:
            print("\nNo processed JPEG files found in Ready to Send folder")
    else:
        print(f"\nReady to Send folder not found: {ready_folder}")



