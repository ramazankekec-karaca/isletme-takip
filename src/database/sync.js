const xlsx = require('xlsx');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../../data/isletme_takip.db');
// Find the newest .xlsx or .xlsm file in the parent directory
const ROOT_DIR = path.join(__dirname, '../../..');

function findExcelFile() {
  const files = fs.readdirSync(ROOT_DIR);
  // Match files ending with .xlsm or .xlsx, excluding temp files starting with ~$
  const excelFiles = files.filter(f => (f.endsWith('.xlsm') || f.endsWith('.xlsx')) && !f.startsWith('~$'));
  if (excelFiles.length === 0) return null;
  // Sort by modified time descending
  excelFiles.sort((a, b) => {
    return fs.statSync(path.join(ROOT_DIR, b)).mtime.getTime() - fs.statSync(path.join(ROOT_DIR, a)).mtime.getTime();
  });
  return path.join(ROOT_DIR, excelFiles[0]);
}

async function runSync() {
  const excelPath = findExcelFile();
  if (!excelPath) {
    console.error("Bulunamadı: Kök dizinde Excel dosyası bulunamadı.");
    process.exit(1);
  }
  
  console.log(`Excel dosyası okunuyor: ${excelPath}`);
  
  try {
    const workbook = xlsx.readFile(excelPath);
    let veritabaniSheetName = null;
    for (const sheetName of workbook.SheetNames) {
      if (sheetName.toUpperCase().includes('TABANI') || sheetName.toUpperCase().includes('VER')) {
        veritabaniSheetName = sheetName;
        break;
      }
    }
    
    if (!veritabaniSheetName) {
      console.error("Hata: 'VERİ TABANI' sayfası Excel'de bulunamadı.");
      process.exit(1);
    }
    
    const worksheet = workbook.Sheets[veritabaniSheetName];
    // Read data as array of arrays
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Find headers row (usually the first row with 'Id', 'Öğr.No')
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      if (row && row.some(cell => typeof cell === 'string' && cell.includes('Öğr.No'))) {
        headerRowIdx = i;
        break;
      }
    }
    
    if (headerRowIdx === -1) {
      console.error("Hata: Sütun başlıkları (Öğr.No vs.) bulunamadı.");
      process.exit(1);
    }
    
    const headers = rawData[headerRowIdx].map(h => typeof h === 'string' ? h.trim() : h);
    
    // Map headers to indexes
    const colIdx = {
      ogrNo: headers.findIndex(h => h && h.includes('Öğr.No')),
      adSoyad: headers.findIndex(h => h && h.includes('Ad Soyad')),
      sube: headers.findIndex(h => h && h.includes('Şube')),
      dal: headers.findIndex(h => h && h.includes('Dal')),
      ogretmen: headers.findIndex(h => h && h.includes('Öğretmen')),
      isletme: headers.findIndex(h => h && h.includes('İşletme')),
      isyeriTel: headers.findIndex(h => h && h.includes('İşyeri Tel')),
      isyeriAdres: headers.findIndex(h => h && h.includes('İşyeri Adresi')),
      ustaOgretici: headers.findIndex(h => h && h.includes('Usta Öğretici'))
    };
    
    const db = new Database(DB_PATH);
    
    console.log("Veritabanı temizleniyor...");
    db.prepare("DELETE FROM ogrenciler").run();
    db.prepare("DELETE FROM ogretmenler").run();
    
    const defaultPassword = await bcrypt.hash('1234', 10);
    
    const ogretmenMap = new Map(); // name -> id
    
    const insertOgretmen = db.prepare(`INSERT INTO ogretmenler (ad_soyad, sifre) VALUES (?, ?)`);
    const insertOgrenci = db.prepare(`
      INSERT INTO ogrenciler (
        ogretmen_id, ogrenci_no, ad_soyad, sube, dal, 
        okul_devamsizligi, isletme_devamsizligi, 
        isletme_adi, isyeri_telefonu, isyeri_adresi, usta_ogretici_adi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    console.log("Veriler ekleniyor...");
    db.transaction(() => {
      for (let i = headerRowIdx + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        
        const ogrNo = row[colIdx.ogrNo];
        const adSoyad = row[colIdx.adSoyad];
        
        if (!ogrNo || !adSoyad) continue; // Skip empty rows
        
        const sube = row[colIdx.sube] || '';
        const dal = row[colIdx.dal] || '';
        const ogretmenAd = row[colIdx.ogretmen] || 'Bilinmeyen Öğretmen';
        const isletmeAd = row[colIdx.isletme] || 'Bilinmeyen İşletme';
        const isyeriTel = row[colIdx.isyeriTel] || '';
        const isyeriAdres = row[colIdx.isyeriAdres] || '';
        const ustaOgretici = row[colIdx.ustaOgretici] || '';
        
        // Okul/Isletme devamsizligi parsing could be added if needed, right now we set to 0.
        
        // Get or Create Öğretmen
        let ogretmenId = ogretmenMap.get(ogretmenAd);
        if (!ogretmenId) {
          const res = insertOgretmen.run(ogretmenAd, defaultPassword);
          ogretmenId = res.lastInsertRowid;
          ogretmenMap.set(ogretmenAd, ogretmenId);
        }
        
        // Create Öğrenci
        insertOgrenci.run(
          ogretmenId, ogrNo.toString(), adSoyad, sube, dal, 
          0, 0, 
          isletmeAd, isyeriTel, isyeriAdres, ustaOgretici
        );
      }
    })();
    
    console.log(`✅ Senkronizasyon tamamlandı!`);
    console.log(`- Öğretmen Sayısı: ${ogretmenMap.size}`);
    
    db.close();
  } catch (error) {
    console.error("Senkronizasyon hatası:", error);
    process.exit(1);
  }
}

runSync();
