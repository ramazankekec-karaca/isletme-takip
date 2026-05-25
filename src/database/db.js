const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Veritabanı dosyasının bulunacağı klasörü oluştur
const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'isletme_takip.db');
const db = new Database(dbPath);

// Performans için WAL modu
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Tabloları oluştur
db.exec(`
  -- Öğretmenler tablosu (eski kayıtları bozmadan)
  CREATE TABLE IF NOT EXISTS ogretmenler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad_soyad TEXT NOT NULL,
    sifre TEXT NOT NULL,
    telefon TEXT,
    email TEXT,
    rol TEXT DEFAULT 'ogretmen',
    yetki_durumu INTEGER DEFAULT 1,
    okul_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Okullar tablosu
  CREATE TABLE IF NOT EXISTS okullar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    okul_adi TEXT NOT NULL UNIQUE
  );

  -- Dallar tablosu (Meslek dalları)
  CREATE TABLE IF NOT EXISTS dallar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dal_adi TEXT NOT NULL UNIQUE
  );

  -- Şubeler tablosu
  CREATE TABLE IF NOT EXISTS subeler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sube_adi TEXT NOT NULL UNIQUE
  );

  -- Öğrenciler tablosu
  CREATE TABLE IF NOT EXISTS ogrenciler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ogrenci_no TEXT NOT NULL UNIQUE,
    ad_soyad TEXT NOT NULL,
    sube TEXT NOT NULL,
    dal TEXT NOT NULL,
    ogretmen_id INTEGER NOT NULL,
    okul_devamsizligi INTEGER DEFAULT 0,
    isletme_devamsizligi INTEGER DEFAULT 0,
    isletme_adi TEXT,
    isyeri_telefonu TEXT,
    isyeri_adresi TEXT,
    ise_giris_tarihi TEXT,
    usta_ogretici_adi TEXT,
    notlar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id)
  );

  -- Devamsızlık kayıtları tablosu (tarihçe için)
  CREATE TABLE IF NOT EXISTS devamsizlik_kayitlari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ogrenci_id INTEGER NOT NULL,
    devamsizlik_turu TEXT NOT NULL CHECK(devamsizlik_turu IN ('okul', 'isletme')),
    tarih TEXT NOT NULL,
    aciklama TEXT,
    ogretmen_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ogrenci_id) REFERENCES ogrenciler(id),
    FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id)
  );
  -- Ziyaret Grupları (Planla ekranı için)
  CREATE TABLE IF NOT EXISTS ziyaret_gruplari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ogretmen_id INTEGER NOT NULL,
    grup_adi TEXT NOT NULL,
    ziyaret_tarihi TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id)
  );

  -- Gruplara atanan işletmeler
  CREATE TABLE IF NOT EXISTS ziyaret_grup_isletmeleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grup_id INTEGER NOT NULL,
    isletme_adi TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grup_id) REFERENCES ziyaret_gruplari(id) ON DELETE CASCADE
  );

  -- İşletmeler için spesifik ziyaret planı tarihleri
  CREATE TABLE IF NOT EXISTS isletme_ziyaret_tarihleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ogretmen_id INTEGER NOT NULL,
    isletme_adi TEXT NOT NULL,
    ziyaret_tarihi TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id)
  );
`);

// Güncelleme zamanı için trigger
db.exec(`
  CREATE TRIGGER IF NOT EXISTS update_ogrenci_timestamp
  AFTER UPDATE ON ogrenciler
  BEGIN
    UPDATE ogrenciler SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
`);

// MIGRATIONS (Mevcut veritabanı dosyasına yeni kolonları ekleme)
const tableInfo = db.pragma("table_info(ogretmenler)");
const columnNames = tableInfo.map(c => c.name);

if (!columnNames.includes('telefon')) {
  db.exec("ALTER TABLE ogretmenler ADD COLUMN telefon TEXT;");
}
if (!columnNames.includes('email')) {
  db.exec("ALTER TABLE ogretmenler ADD COLUMN email TEXT;");
}
if (!columnNames.includes('rol')) {
  db.exec("ALTER TABLE ogretmenler ADD COLUMN rol TEXT DEFAULT 'ogretmen';");
}
if (!columnNames.includes('yetki_durumu')) {
  db.exec("ALTER TABLE ogretmenler ADD COLUMN yetki_durumu INTEGER DEFAULT 1;");
}
if (!columnNames.includes('okul_id')) {
  db.exec("ALTER TABLE ogretmenler ADD COLUMN okul_id INTEGER;");
}

// Varsayılan Admin Kullanıcısı Ekleme
const adminUser = db.prepare("SELECT id FROM ogretmenler WHERE LOWER(ad_soyad) = 'yönetici'").get();
if (!adminUser) {
  try {
    const bcrypt = require('bcryptjs'); // Şifre hashlemek için
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare("INSERT INTO ogretmenler (ad_soyad, sifre, rol, yetki_durumu) VALUES (?, ?, ?, ?)").run('Yönetici', hash, 'admin', 1);
    console.log("✅ Varsayılan Admin (Yönetici) oluşturuldu.");
  } catch (err) {
    console.error("❌ Varsayılan Admin oluşturulamadı:", err.message);
  }
} else {
  // Eğer yönetici varsa, rolünü admin yap
  db.prepare("UPDATE ogretmenler SET rol = 'admin' WHERE id = ?").run(adminUser.id);
}

console.log('✅ Veritabanı bağlantısı ve tablolar hazır:', dbPath);

module.exports = db;
