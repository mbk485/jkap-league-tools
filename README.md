# Metadata Cloner

A simple, modern desktop application to clone EXIF metadata from one image to multiple images. Perfect for charity events or any situation where you need to apply the same metadata to multiple photos.

## Features

- 📸 **Clean Modern UI** - Built with tkinter with a modern, user-friendly interface
- 🔄 **Batch Processing** - Clone metadata to multiple images at once
- ✅ **Error Handling** - Gracefully handles missing files and invalid formats
- 🎯 **Simple Workflow** - Just 3 steps: Select source, select targets, clone!

## Requirements

- Python 3.6+
- tkinter (usually comes with Python)
- piexif

## Installation

1. Install the required package:

```bash
pip install -r requirements.txt
```

Or install piexif directly:

```bash
pip install piexif
```

## Usage

1. Run the application:

```bash
python metadata_cloner.py
```

2. Click **"Select Source Image"** to choose your master photo (the one with the metadata you want to copy)

3. Click **"Select Target Images"** to choose one or more photos that should receive the metadata

4. Click **"Clone Metadata"** to copy the EXIF data from the source to all target images

The app will show you a success message with the number of images processed.

## Use Case: Charity Event Photos

This tool is perfect for charity events where you want to add "Ray-Ban Meta Smart Glasses" metadata to photos:

1. Take one photo with the Ray-Ban Meta Smart Glasses (or manually edit one photo to have the correct metadata)
2. Use that as your source image
3. Select all other event photos as targets
4. Clone the metadata to make all photos appear as if they were taken with the smart glasses

## Technical Details

- Uses `piexif.transplant()` to copy all EXIF data from source to target
- Only accepts JPEG images (`.jpg`, `.jpeg`)
- Target images are modified in-place (make backups if needed!)
- Handles errors gracefully with user-friendly messages

## License

Free to use for personal and commercial purposes.


