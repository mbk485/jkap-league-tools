#!/usr/bin/env python3
"""
Video Metadata Processor for Ray-Ban Meta
Injects authentic QuickTime metadata into MOV/MP4 files
Based on real Ray-Ban Stories device metadata structure
"""

import os
import struct
import uuid
from datetime import datetime, timedelta
import random
import shutil
import tempfile


def generate_uuid():
    """Generate a UUID in the format used by Ray-Ban Meta"""
    return str(uuid.uuid4()).upper()


def generate_random_datetime_iso():
    """Generate a random datetime in ISO format within the last 30 days"""
    now = datetime.utcnow()
    random_days = random.randint(0, 30)
    random_hours = random.randint(0, 23)
    random_minutes = random.randint(0, 59)
    random_seconds = random.randint(0, 59)
    
    random_date = now - timedelta(days=random_days, hours=random_hours, 
                                   minutes=random_minutes, seconds=random_seconds)
    return random_date.strftime("%Y-%m-%dT%H:%M:%SZ")


def create_atom(atom_type, data):
    """Create a QuickTime atom"""
    size = 8 + len(data)
    return struct.pack('>I', size) + atom_type.encode('ascii') + data


def create_string_data_atom(value):
    """Create a data atom containing a UTF-8 string"""
    # Data atom structure: size(4) + 'data'(4) + type(4) + locale(4) + value
    # Type 1 = UTF-8 string
    encoded = value.encode('utf-8')
    data = struct.pack('>I', 1)  # Type: UTF-8
    data += struct.pack('>I', 0)  # Locale: 0
    data += encoded
    return create_atom('data', data)


def create_metadata_item(index, value):
    """Create a metadata item atom for ilst"""
    data_atom = create_string_data_atom(value)
    # Item atom with index
    item_header = struct.pack('>I', index)
    return struct.pack('>I', 8 + len(data_atom)) + item_header + data_atom


def create_rayban_meta_udta():
    """Create the udta atom with Ray-Ban Meta metadata"""
    unique_uuid = generate_uuid()
    creation_date = generate_random_datetime_iso()
    
    # The comment format from real Ray-Ban Meta device
    comment = f"app=Meta AI&device=Ray-Ban Stories&id={unique_uuid}"
    
    # Create keys atom - defines what metadata keys we're using
    keys_data = struct.pack('>I', 0)  # Version/flags
    keys_data += struct.pack('>I', 5)  # Number of keys
    
    # Key 1: copyright
    key1 = b'mdtacom.apple.quicktime.copyright'
    keys_data += struct.pack('>I', 4 + len(key1)) + key1
    
    # Key 2: comment  
    key2 = b'mdtacom.apple.quicktime.comment'
    keys_data += struct.pack('>I', 4 + len(key2)) + key2
    
    # Key 3: model
    key3 = b'mdtacom.apple.quicktime.model'
    keys_data += struct.pack('>I', 4 + len(key3)) + key3
    
    # Key 4: description
    key4 = b'mdtacom.apple.quicktime.description'
    keys_data += struct.pack('>I', 4 + len(key4)) + key4
    
    # Key 5: creationdate
    key5 = b'mdtacom.apple.quicktime.creationdate'
    keys_data += struct.pack('>I', 4 + len(key5)) + key5
    
    keys_atom = create_atom('keys', keys_data)
    
    # Create ilst atom - contains the actual values
    ilst_data = b''
    
    # Index 1: copyright = "Meta AI"
    ilst_data += create_metadata_item(1, "Meta AI")
    
    # Index 2: comment = "app=Meta AI&device=Ray-Ban Stories&id=UUID"
    ilst_data += create_metadata_item(2, comment)
    
    # Index 3: model = "Ray-Ban Stories"
    ilst_data += create_metadata_item(3, "Ray-Ban Stories")
    
    # Index 4: description (same as comment for authenticity)
    ilst_data += create_metadata_item(4, comment)
    
    # Index 5: creationdate
    ilst_data += create_metadata_item(5, creation_date)
    
    ilst_atom = create_atom('ilst', ilst_data)
    
    # Create meta atom containing keys and ilst
    meta_data = struct.pack('>I', 0)  # Version/flags
    
    # hdlr atom for meta
    hdlr_data = struct.pack('>I', 0)  # Version/flags
    hdlr_data += b'\x00\x00\x00\x00'  # Pre-defined
    hdlr_data += b'mdta'  # Handler type
    hdlr_data += b'\x00' * 12  # Reserved
    hdlr_data += b'\x00'  # Name (empty)
    hdlr_atom = create_atom('hdlr', hdlr_data)
    
    meta_data += hdlr_atom + keys_atom + ilst_atom
    meta_atom = create_atom('meta', meta_data)
    
    # Wrap in udta atom
    udta_atom = create_atom('udta', meta_atom)
    
    return udta_atom


def read_atoms(f, end_pos):
    """Read all atoms from current position to end_pos"""
    atoms = []
    while f.tell() < end_pos:
        start = f.tell()
        header = f.read(8)
        if len(header) < 8:
            break
        
        size, atom_type = struct.unpack('>I4s', header)
        atom_type = atom_type.decode('ascii', errors='ignore')
        
        if size == 0:
            size = end_pos - start
        elif size == 1:
            size = struct.unpack('>Q', f.read(8))[0]
        
        atoms.append({
            'type': atom_type,
            'start': start,
            'size': size
        })
        
        f.seek(start + size)
    
    return atoms


def inject_rayban_metadata(input_path, output_path=None):
    """
    Inject Ray-Ban Meta metadata into a MOV/MP4 file
    
    Args:
        input_path: Path to input video file
        output_path: Path for output file (if None, modifies in place with backup)
    
    Returns:
        str: Path to the processed file
    """
    if output_path is None:
        # Create output with prefix
        dirname = os.path.dirname(input_path)
        basename = os.path.basename(input_path)
        output_path = os.path.join(dirname, f"RayBan_{basename}")
    
    # Read the entire file
    with open(input_path, 'rb') as f:
        file_data = f.read()
    
    file_size = len(file_data)
    
    # Find the moov atom
    pos = 0
    moov_start = None
    moov_size = None
    atoms_before_moov = []
    atoms_after_moov = []
    
    while pos < file_size:
        if pos + 8 > file_size:
            break
        
        size = struct.unpack('>I', file_data[pos:pos+4])[0]
        atom_type = file_data[pos+4:pos+8].decode('ascii', errors='ignore')
        
        if size == 0:
            size = file_size - pos
        elif size == 1:
            size = struct.unpack('>Q', file_data[pos+8:pos+16])[0]
        
        if atom_type == 'moov':
            moov_start = pos
            moov_size = size
        elif moov_start is None:
            atoms_before_moov.append((pos, size))
        else:
            atoms_after_moov.append((pos, size))
        
        pos += size
    
    if moov_start is None:
        raise ValueError("No moov atom found in video file")
    
    # Parse the moov atom to find/replace udta
    moov_data = file_data[moov_start+8:moov_start+moov_size]
    
    # Find existing udta in moov
    moov_pos = 0
    new_moov_data = b''
    found_udta = False
    
    while moov_pos < len(moov_data):
        if moov_pos + 8 > len(moov_data):
            new_moov_data += moov_data[moov_pos:]
            break
        
        atom_size = struct.unpack('>I', moov_data[moov_pos:moov_pos+4])[0]
        atom_type = moov_data[moov_pos+4:moov_pos+8].decode('ascii', errors='ignore')
        
        if atom_size == 0:
            atom_size = len(moov_data) - moov_pos
        
        if atom_type == 'udta':
            # Replace existing udta with our Ray-Ban metadata
            new_moov_data += create_rayban_meta_udta()
            found_udta = True
        else:
            # Keep the original atom
            new_moov_data += moov_data[moov_pos:moov_pos+atom_size]
        
        moov_pos += atom_size
    
    # If no udta found, append our metadata
    if not found_udta:
        new_moov_data += create_rayban_meta_udta()
    
    # Create new moov atom
    new_moov_size = 8 + len(new_moov_data)
    new_moov = struct.pack('>I', new_moov_size) + b'moov' + new_moov_data
    
    # Reconstruct the file
    with open(output_path, 'wb') as f:
        # Write atoms before moov
        for start, size in atoms_before_moov:
            f.write(file_data[start:start+size])
        
        # Write new moov
        f.write(new_moov)
        
        # Write atoms after moov
        for start, size in atoms_after_moov:
            f.write(file_data[start:start+size])
    
    return output_path


def process_video(input_path):
    """
    Process a video file to add Ray-Ban Meta metadata
    
    Args:
        input_path: Path to the video file
    
    Returns:
        str: Path to the processed file
    """
    ext = os.path.splitext(input_path)[1].lower()
    if ext not in ['.mov', '.mp4']:
        raise ValueError(f"Unsupported video format: {ext}")
    
    return inject_rayban_metadata(input_path)


# Desktop app integration
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python video_processor.py <video_file>")
        print("Supported formats: .mov, .mp4")
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    if not os.path.exists(input_file):
        print(f"Error: File not found: {input_file}")
        sys.exit(1)
    
    try:
        output_file = process_video(input_file)
        print(f"✓ Processed: {output_file}")
        print("\nMetadata injected:")
        print("  - Copyright: Meta AI")
        print("  - Model: Ray-Ban Stories")
        print("  - Comment: app=Meta AI&device=Ray-Ban Stories&id=[UUID]")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


