/**
 * seed.js — Örnek öğretmen ve öğrenci verilerini veritabanına yükler.
 * Sadece ilk kurulumda çalıştır: node src/database/seed.js
 */

const db = require('./db');
const bcrypt = require('bcryptjs');

console.log('🌱 Örnek veriler yükleniyor...');

// Önce mevcut verileri temizle (yeniden seed için)
db.exec(`
  DELETE FROM devamsizlik_kayitlari;
  DELETE FROM ogrenciler;
  DELETE FROM ogretmenler;
  DELETE FROM sqlite_sequence WHERE name IN ('ogrenciler','ogretmenler','devamsizlik_kayitlari');
`);

// Öğretmenleri ekle (şifreler hash'li saklanır)
const ogretmenEkle = db.prepare(`
  INSERT INTO ogretmenler (ad_soyad, sifre) VALUES (?, ?)
`);

const ogretmenler = [
  { ad: 'Ahmet Yılmaz', sifre: '1234' },
  { ad: 'Fatma Demir', sifre: '1234' },
  { ad: 'Mehmet Kaya', sifre: '1234' },
];

const ogretmenIdleri = {};
for (const o of ogretmenler) {
  const hash = bcrypt.hashSync(o.sifre, 10);
  const result = ogretmenEkle.run(o.ad, hash);
  ogretmenIdleri[o.ad] = result.lastInsertRowid;
  console.log(`  👤 Öğretmen eklendi: ${o.ad} (ID: ${result.lastInsertRowid})`);
}

// Öğrencileri ekle
const ogrenciEkle = db.prepare(`
  INSERT INTO ogrenciler (
    ogrenci_no, ad_soyad, sube, dal, ogretmen_id,
    okul_devamsizligi, isletme_devamsizligi,
    isletme_adi, isyeri_telefonu, isyeri_adresi,
    ise_giris_tarihi, usta_ogretici_adi
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const ogrenciler = [
  // Ahmet Yılmaz'ın öğrencileri
  {
    no: '2024001', ad: 'Ali Çelik', sube: '12-A', dal: 'Elektrik',
    ogretmen: 'Ahmet Yılmaz', okul_dev: 2, isl_dev: 3,
    isletme: 'Yıldız Elektrik A.Ş.', tel: '02121234567',
    adres: 'Bağcılar, İstanbul', tarih: '2024-09-02', usta: 'Kemal Bey'
  },
  {
    no: '2024002', ad: 'Zeynep Arslan', sube: '12-A', dal: 'Elektrik',
    ogretmen: 'Ahmet Yılmaz', okul_dev: 0, isl_dev: 1,
    isletme: 'Güneş Teknik Ltd.', tel: '02122345678',
    adres: 'Güngören, İstanbul', tarih: '2024-09-02', usta: 'Serkan Bey'
  },
  {
    no: '2024003', ad: 'Emre Öztürk', sube: '12-B', dal: 'Elektronik',
    ogretmen: 'Ahmet Yılmaz', okul_dev: 5, isl_dev: 2,
    isletme: 'Teknosa Bakım Mrk.', tel: '02123456789',
    adres: 'Bahçelievler, İstanbul', tarih: '2024-09-02', usta: 'Ali Usta'
  },
  // Fatma Demir'in öğrencileri
  {
    no: '2024004', ad: 'Selin Koç', sube: '11-A', dal: 'Muhasebe',
    ogretmen: 'Fatma Demir', okul_dev: 1, isl_dev: 0,
    isletme: 'Anadolu Mali Müşavirlik', tel: '02124567890',
    adres: 'Kadıköy, İstanbul', tarih: '2024-09-02', usta: 'Ayşe Hanım'
  },
  {
    no: '2024005', ad: 'Burak Şahin', sube: '11-A', dal: 'Muhasebe',
    ogretmen: 'Fatma Demir', okul_dev: 3, isl_dev: 4,
    isletme: 'Marmara Vergi Danışmanlık', tel: '02125678901',
    adres: 'Üsküdar, İstanbul', tarih: '2024-09-02', usta: 'Hasan Bey'
  },
  {
    no: '2024006', ad: 'Elif Yıldız', sube: '11-B', dal: 'Bilişim',
    ogretmen: 'Fatma Demir', okul_dev: 0, isl_dev: 0,
    isletme: 'TechCo Yazılım A.Ş.', tel: '02126789012',
    adres: 'Maltepe, İstanbul', tarih: '2024-09-02', usta: 'Murat Bey'
  },
  // Mehmet Kaya'nın öğrencileri
  {
    no: '2024007', ad: 'Can Aydın', sube: '10-A', dal: 'Makine',
    ogretmen: 'Mehmet Kaya', okul_dev: 4, isl_dev: 6,
    isletme: 'Kartal Metal San.', tel: '02167890123',
    adres: 'Kartal, İstanbul', tarih: '2024-09-02', usta: 'İbrahim Usta'
  },
  {
    no: '2024008', ad: 'Merve Polat', sube: '10-A', dal: 'Makine',
    ogretmen: 'Mehmet Kaya', okul_dev: 2, isl_dev: 1,
    isletme: 'Polat Otomotiv Ltd.', tel: '02168901234',
    adres: 'Pendik, İstanbul', tarih: '2024-09-02', usta: 'Cem Usta'
  },
];

for (const o of ogrenciler) {
  const ogretmenId = ogretmenIdleri[o.ogretmen];
  ogrenciEkle.run(
    o.no, o.ad, o.sube, o.dal, ogretmenId,
    o.okul_dev, o.isl_dev,
    o.isletme, o.tel, o.adres, o.tarih, o.usta
  );
  console.log(`  🎓 Öğrenci eklendi: ${o.ad} (${o.sube} - ${o.dal})`);
}

console.log('\n✅ Seed tamamlandı!');
console.log('\n📋 Giriş bilgileri:');
for (const o of ogretmenler) {
  console.log(`   ${o.ad} → Şifre: ${o.sifre}`);
}
