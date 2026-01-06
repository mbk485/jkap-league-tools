#!/usr/bin/env python3
"""
Read video metadata from MOV/MP4 files
Parses the QuickTime container format to extract metadata
"""

import struct
import os
import plistlib
from datetime import datetime

def read_atom(f, size_limit=None):
    """Read a QuickTime atom"""
    start = f.tell()
    header = f.read(8)
    if len(header) < 8:
        return None, None, None
    
    size, atom_type = struct.unpack('>I4s', header)
    atom_type = atom_type.decode('ascii', errors='ignore')
    
    if size == 1:  # Extended size
        size = struct.unpack('>Q', f.read(8))[0]
        header_size = 16
    elif size == 0:  # Extends to EOF
        current = f.tell()
        f.seek(0, 2)
        size = f.tell() - start
        f.seek(current)
        header_size = 8
    else:
        header_size = 8
    
    return atom_type, size, header_size

def parse_mvhd(data):
    """Parse movie header atom"""
    version = data[0]
    if version == 0:
        creation_time = struct.unpack('>I', data[4:8])[0]
        modification_time = struct.unpack('>I', data[8:12])[0]
        timescale = struct.unpack('>I', data[12:16])[0]
        duration = struct.unpack('>I', data[16:20])[0]
    else:
        creation_time = struct.unpack('>Q', data[4:12])[0]
        modification_time = struct.unpack('>Q', data[12:20])[0]
        timescale = struct.unpack('>I', data[20:24])[0]
        duration = struct.unpack('>Q', data[24:32])[0]
    
    # Convert from Mac epoch (1904) to Unix epoch (1970)
    mac_epoch_offset = 2082844800
    
    return {
        'version': version,
        'creation_time': creation_time,
        'modification_time': modification_time,
        'timescale': timescale,
        'duration': duration,
        'duration_seconds': duration / timescale if timescale else 0,
    }

def find_all_strings(data, min_length=4):
    """Find all printable strings in binary data"""
    result = []
    current = []
    
    for byte in data:
        if 32 <= byte <= 126:
            current.append(chr(byte))
        else:
            if len(current) >= min_length:
                result.append(''.join(current))
            current = []
    
    if len(current) >= min_length:
        result.append(''.join(current))
    
    return result

def read_mov_metadata(filepath):
    """Read metadata from a MOV/MP4 file"""
    metadata = {
        'file': os.path.basename(filepath),
        'size_mb': os.path.getsize(filepath) / 1024 / 1024,
        'atoms': [],
        'interesting_strings': [],
        'raw_metadata': {}
    }
    
    with open(filepath, 'rb') as f:
        file_size = os.path.getsize(filepath)
        
        while f.tell() < file_size:
            atom_type, size, header_size = read_atom(f)
            if not atom_type:
                break
            
            atom_start = f.tell() - header_size
            metadata['atoms'].append({
                'type': atom_type,
                'offset': atom_start,
                'size': size
            })
            
            # Container atoms - recurse into them
            container_atoms = ['moov', 'trak', 'mdia', 'minf', 'stbl', 'udta', 'meta']
            
            if atom_type in container_atoms:
                # Just note it, continue reading children
                continue
            
            # Read interesting atoms
            data_size = size - header_size
            
            if atom_type == 'mvhd':
                data = f.read(min(data_size, 120))
                mvhd = parse_mvhd(data)
                metadata['raw_metadata']['mvhd'] = mvhd
                f.seek(atom_start + size)
                
            elif atom_type == 'ftyp':
                data = f.read(min(data_size, 32))
                brand = data[:4].decode('ascii', errors='ignore')
                metadata['raw_metadata']['brand'] = brand
                f.seek(atom_start + size)
                
            elif atom_type in ['©nam', '©ART', '©alb', '©day', '©too', '©cmt', 
                               '©mak', '©mod', '©swr', '©xyz', 'desc']:
                # iTunes-style metadata
                data = f.read(min(data_size, 1024))
                strings = find_all_strings(data)
                if strings:
                    metadata['raw_metadata'][atom_type] = strings
                f.seek(atom_start + size)
                
            elif atom_type == 'keys':
                data = f.read(min(data_size, 4096))
                strings = find_all_strings(data)
                metadata['raw_metadata']['keys'] = strings
                f.seek(atom_start + size)
                
            elif atom_type == 'mdta':
                data = f.read(min(data_size, 4096))
                strings = find_all_strings(data)
                if strings:
                    metadata['raw_metadata']['mdta'] = strings
                f.seek(atom_start + size)
                
            elif atom_type == 'ilst':
                # Item list - contains metadata
                data = f.read(min(data_size, 8192))
                strings = find_all_strings(data, 3)
                metadata['raw_metadata']['ilst_strings'] = strings
                f.seek(atom_start + size)
            
            elif atom_type == 'XMP_':
                # XMP metadata
                data = f.read(min(data_size, 65536))
                try:
                    xmp_str = data.decode('utf-8', errors='ignore')
                    metadata['raw_metadata']['xmp'] = xmp_str[:2000]  # First 2000 chars
                except:
                    pass
                f.seek(atom_start + size)
            
            else:
                # Skip other atoms but look for interesting strings in small ones
                if data_size < 10000:
                    data = f.read(data_size)
                    strings = [s for s in find_all_strings(data, 5) 
                              if any(kw in s.lower() for kw in 
                                    ['meta', 'ray', 'ban', 'model', 'make', 'device', 
                                     'software', 'apple', 'iphone', 'samsung'])]
                    if strings:
                        metadata['interesting_strings'].extend(strings)
                else:
                    f.seek(atom_start + size)
    
    return metadata

def main():
    samples_dir = "/Users/bpmadmin/Charitycase/samples"
    
    video_files = [f for f in os.listdir(samples_dir) if f.lower().endswith(('.mov', '.mp4'))]
    
    for video_file in video_files:
        filepath = os.path.join(samples_dir, video_file)
        print(f"\n{'='*80}")
        print(f"VIDEO: {video_file}")
        print(f"{'='*80}")
        
        metadata = read_mov_metadata(filepath)
        
        print(f"\nFile size: {metadata['size_mb']:.2f} MB")
        print(f"\nAtoms found: {len(metadata['atoms'])}")
        
        # Show atom structure
        print("\nAtom structure:")
        for atom in metadata['atoms'][:30]:  # First 30
            print(f"  {atom['type']:8} at {atom['offset']:8} size {atom['size']:8}")
        
        print("\nRaw metadata:")
        for key, value in metadata['raw_metadata'].items():
            print(f"  {key}: {value}")
        
        if metadata['interesting_strings']:
            print("\nInteresting strings found:")
            for s in set(metadata['interesting_strings']):
                print(f"  - {s}")

if __name__ == "__main__":
    main()


