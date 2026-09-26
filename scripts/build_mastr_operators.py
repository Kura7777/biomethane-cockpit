"""
Extracts German MaStR biomethane operators and legal registration numbers (Handelsregister)
from the Bundesnetzagentur Marktstammdatenregister Gesamtdatenexport.
Outputs: scratch/mastr/operators.json
"""
import urllib.request
import zipfile
import io
import time
import struct
import zlib
import xml.etree.ElementTree as ET
import json
import os

URL = 'https://download.marktstammdatenregister.de/Gesamtdatenexport_20260925_26.1.zip'

class RemoteZipFile(io.RawIOBase):
    def __init__(self, url: str):
        self.url = url
        req = urllib.request.Request(url, method='HEAD')
        with urllib.request.urlopen(req) as resp:
            self.length = int(resp.headers['Content-Length'])
        self.pos = 0

    def seekable(self) -> bool:
        return True

    def seek(self, offset: int, whence: int = io.SEEK_SET) -> int:
        if whence == io.SEEK_SET:
            self.pos = offset
        elif whence == io.SEEK_CUR:
            self.pos += offset
        elif whence == io.SEEK_END:
            self.pos = self.length + offset
        return self.pos

    def tell(self) -> int:
        return self.pos

    def read(self, size: int = -1) -> bytes:
        if size == -1 or self.pos + size > self.length:
            size = self.length - self.pos
        if size <= 0:
            return b''
        req = urllib.request.Request(self.url, headers={
            'Range': f'bytes={self.pos}-{self.pos + size - 1}'
        })
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
        self.pos += len(data)
        return data


def build_mastr_operators():
    os.makedirs('scratch/mastr', exist_ok=True)
    
    # 1. Identify target ABRs from EinheitenGasErzeuger.xml
    units_path = 'scratch/mastr/EinheitenGasErzeuger.xml'
    if not os.path.exists(units_path):
        raise FileNotFoundError(f"Missing {units_path}. See scripts/REGISTER_SOURCES.md to download.")
    
    g_root = ET.parse(units_path).getroot()
    target_abrs = set(
        e.findtext('AnlagenbetreiberMastrNummer')
        for e in g_root
        if e.findtext('Technologie') == '825' and e.findtext('AnlagenbetreiberMastrNummer')
    )
    print(f"Target ABRs needed for biomethane units: {len(target_abrs)}")

    operators = {}
    if os.path.exists('scratch/mastr/operators.json'):
        with open('scratch/mastr/operators.json', encoding='utf-8') as f:
            operators = json.load(f)
        print(f"Loaded existing checkpoint: {len(operators)} / {len(target_abrs)}")

    remaining = target_abrs - set(operators.keys())
    if not remaining:
        print("All target operators already extracted in scratch/mastr/operators.json!")
        return

    # Check local Marktakteure files first
    local_files = [f for f in os.listdir('scratch/mastr') if f.startswith('Marktakteure_') and f.endswith('.xml')]
    for fname in sorted(local_files):
        fpath = os.path.join('scratch/mastr', fname)
        for event, elem in ET.iterparse(fpath, events=['end']):
            if elem.tag == 'Marktakteur':
                mastr = elem.findtext('MastrNummer')
                if mastr in remaining:
                    operators[mastr] = {
                        'name': elem.findtext('Firmenname'),
                        'court': elem.findtext('Registergericht'),
                        'prefix': elem.findtext('RegisternummerPraefix'),
                        'regNr': elem.findtext('Registernummer'),
                        'plz': elem.findtext('Postleitzahl'),
                        'town': elem.findtext('Ort'),
                    }
                    remaining.remove(mastr)
            elem.clear()
        if not remaining:
            break

    # If still remaining, stream from remote zip via range requests
    if remaining:
        print(f"Fetching remaining {len(remaining)} operators from remote MaStR Gesamtdatenexport...")
        remote = RemoteZipFile(URL)
        zf = zipfile.ZipFile(remote)
        actor_files = sorted(
            [f for f in zf.namelist() if f.startswith('Marktakteure_') and f.endswith('.xml')],
            key=lambda x: int(x.split('_')[1].split('.')[0])
        )
        for fname in actor_files:
            if not remaining:
                break
            info = zf.getinfo(fname)
            req = urllib.request.Request(URL, headers={'Range': f'bytes={info.header_offset}-{info.header_offset + 100 + info.compress_size}'})
            with urllib.request.urlopen(req) as resp:
                raw = resp.read()
            (sig, ver, flag, method, time_val, date_val, crc, c_size, u_size, n_len, e_len) = struct.unpack('<IHHHHHIIIHH', raw[:30])
            data = raw[30 + n_len + e_len : 30 + n_len + e_len + info.compress_size]
            decomp = zlib.decompress(data, -15)
            for event, elem in ET.iterparse(io.BytesIO(decomp), events=['end']):
                if elem.tag == 'Marktakteur':
                    mastr = elem.findtext('MastrNummer')
                    if mastr in remaining:
                        operators[mastr] = {
                            'name': elem.findtext('Firmenname'),
                            'court': elem.findtext('Registergericht'),
                            'prefix': elem.findtext('RegisternummerPraefix'),
                            'regNr': elem.findtext('Registernummer'),
                            'plz': elem.findtext('Postleitzahl'),
                            'town': elem.findtext('Ort'),
                        }
                        remaining.remove(mastr)
                elem.clear()

    with open('scratch/mastr/operators.json', 'w', encoding='utf-8') as f:
        json.dump(operators, f, indent=2, ensure_ascii=False)
    print(f"Successfully saved {len(operators)} operators to scratch/mastr/operators.json")


if __name__ == '__main__':
    build_mastr_operators()
