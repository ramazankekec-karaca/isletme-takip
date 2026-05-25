import sys
import json
import openpyxl
import datetime
import re

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Dosya yolu belirtilmedi"}))
        sys.exit(1)

    file_path = sys.argv[1]
    
    try:
        wb = openpyxl.load_workbook(file_path, keep_vba=True, data_only=True)
        
        target_ws = None
        for ws in wb.worksheets:
            title = ws.title.upper()
            if 'VER' in title and 'TABANI' in title:
                target_ws = ws
                break
        
        # Eğer VERİ TABANI yoksa, muhtemelen doğrudan tablo içeren bir sayfadır (örn: RadGridExport)
        if not target_ws:
            target_ws = wb.active
            
        ogretmenler = set()
        ogrenciler = []
        
        # Dinamik sütun eşleştirme
        col_map = {}
        
        data_started = False
        
        for row in target_ws.iter_rows(values_only=True):
            if not row:
                continue
                
            # String olmayan hücreler için None check
            str_row = [str(c).strip().upper() if c else "" for c in row]
            
            if not data_started:
                # Başlık satırını bulmaya çalışalım (İçinde "AD", "SOYAD", "NO", "ÖĞRETMEN" gibi kelimeler olan satır)
                if any("AD" in c or "SOYAD" in c for c in str_row) and any("NO" in c for c in str_row):
                    data_started = True
                    # Kolon indekslerini bul
                    for i, c in enumerate(str_row):
                        if "NO" in c and "ÖĞR" not in c and "OR" not in c and "ID" not in c: 
                            col_map["ogrenci_no"] = i
                        elif "NO" in c and ("ÖĞR" in c or "OR." in c or "ÖR.NO" in c):
                            col_map["ogrenci_no"] = i
                        if "AD" in c and "SOYAD" in c:
                            col_map["ad_soyad"] = i
                        if "ŞUBE" in c or "SINIF" in c or "UBE" in c:
                            col_map["sube"] = i
                        if "DAL" in c:
                            col_map["dal"] = i
                        if "İŞLETME" in c or "LETME" in c:
                            if "AD" in c or c == "İŞLETME" or c == "LETME":
                                col_map["isletme_adi"] = i
                        if "ÖĞRETMEN" in c or "RETMEN" in c:
                            if "USTA" not in c:
                                col_map["ogretmen"] = i
                        if "TEL" in c:
                            col_map["isyeri_telefonu"] = i
                        if "ADRES" in c:
                            col_map["isyeri_adresi"] = i
                        if "GİRİŞ" in c or "GR" in c or "GİRİ" in c:
                            col_map["ise_giris_tarihi"] = i
                        if "USTA" in c:
                            col_map["usta_ogretici_adi"] = i
                        if "OKUL" in c and "DEVAM" in c:
                            col_map["okul_devamsizligi"] = i
                        if ("İŞLETME" in c or "LETME" in c) and "DEVAM" in c:
                            col_map["isletme_devamsizligi"] = i
                            
                    # Kullanıcının belirttiği sabit sütunlar (E = 4, K = 10)
                    if "okul_devamsizligi" not in col_map:
                        col_map["okul_devamsizligi"] = 4
                    if "isletme_devamsizligi" not in col_map:
                        col_map["isletme_devamsizligi"] = 4
                    if "ise_giris_tarihi" not in col_map:
                        col_map["ise_giris_tarihi"] = 10
                        
                    # Eğer temel kolonlar eksikse varsayılan indekslere dön
                    if "ogrenci_no" not in col_map or "ad_soyad" not in col_map:
                        col_map = {
                            "ogrenci_no": 3,
                            "ad_soyad": 4,
                            "sube": 1,
                            "dal": 2,
                            "isletme_adi": 5,
                            "ogretmen": 6
                        }
                    continue
            
            if data_started:
                idx_no = col_map.get("ogrenci_no", -1)
                idx_ad = col_map.get("ad_soyad", -1)
                
                if idx_no == -1 or idx_ad == -1 or len(row) <= max(idx_no, idx_ad):
                    continue
                    
                val_no = str(row[idx_no]).strip() if row[idx_no] else ""
                val_ad = str(row[idx_ad]).strip() if row[idx_ad] else ""
                
                # Geçerli bir öğrenci no ve ad kontrolü
                if not val_no or not val_no[0].isdigit() or not val_ad:
                    continue
                    
                def get_val(key):
                    i = col_map.get(key, -1)
                    if i != -1 and i < len(row) and row[i] is not None:
                        val = row[i]
                        if isinstance(val, datetime.datetime):
                            return val.strftime("%d.%m.%Y")
                        return str(val).strip()
                    return ""
                    
                raw_ise_giris = get_val("ise_giris_tarihi")
                clean_ise_giris = ""
                if raw_ise_giris:
                    date_match = re.search(r'(\d{1,2}[\.\-/]\d{1,2}[\.\-/]\d{2,4})', raw_ise_giris)
                    if date_match:
                        clean_ise_giris = date_match.group(1).replace('-', '.').replace('/', '.')
                    else:
                        clean_ise_giris = raw_ise_giris

                raw_devamsizlik = get_val("okul_devamsizligi")
                o_devam = 0
                i_devam = 0
                if raw_devamsizlik:
                    # Okul : 5.0, İşletme :0
                    o_match = re.search(r'OKUL\s*:\s*([\d\.]+)', raw_devamsizlik.upper())
                    i_match = re.search(r'(?:İŞLETME|ISLETME)\s*:\s*([\d\.]+)', raw_devamsizlik.upper())
                    
                    if o_match:
                        o_devam = int(float(o_match.group(1)))
                    elif raw_devamsizlik.replace('.', '', 1).isdigit():
                        o_devam = int(float(raw_devamsizlik))
                        
                    if i_match:
                        i_devam = int(float(i_match.group(1)))

                ogr_data = {
                    "ogrenci_no": val_no,
                    "ad_soyad": val_ad,
                    "sube": get_val("sube"),
                    "dal": get_val("dal"),
                    "isletme_adi": get_val("isletme_adi"),
                    "ogretmen": get_val("ogretmen"),
                    "isyeri_telefonu": get_val("isyeri_telefonu"),
                    "isyeri_adresi": get_val("isyeri_adresi"),
                    "ise_giris_tarihi": clean_ise_giris,
                    "usta_ogretici_adi": get_val("usta_ogretici_adi"),
                    "okul_devamsizligi": o_devam,
                    "isletme_devamsizligi": i_devam
                }
                
                ogrenciler.append(ogr_data)
                
                if ogr_data["ogretmen"] and ogr_data["ogretmen"] != "None":
                    ogretmenler.add(ogr_data["ogretmen"])
                    
        result = {
            "ogretmenler": list(ogretmenler),
            "ogrenciler": ogrenciler
        }
        
        print(json.dumps(result, ensure_ascii=True))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
