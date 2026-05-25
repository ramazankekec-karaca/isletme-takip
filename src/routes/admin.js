const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { adminMiddleware } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Dosya yükleme (Multer) ayarları
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Sadece .xlsm kabul etmek ve hep aynı adla kaydetmek için
    cb(null, 'ISLETME_TAKIP_SYNC.xlsm');
  }
});
const upload = multer({ storage: storage });

// === ÖĞRETMEN YÖNETİMİ ===

/**
 * @route   GET /api/admin/ogretmenler
 * @desc    Tüm öğretmenleri (şifre hariç) listele
 */
router.get('/ogretmenler', adminMiddleware, (req, res) => {
  try {
    const ogretmenler = db.prepare('SELECT id, ad_soyad, telefon, email, rol, yetki_durumu, okul_id, created_at FROM ogretmenler').all();
    res.json({ data: ogretmenler });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/admin/ogretmenler
 * @desc    Yeni öğretmen ekle
 */
router.post('/ogretmenler', adminMiddleware, (req, res) => {
  const { ad_soyad, telefon, email, sifre, rol, okul_id } = req.body;
  if (!ad_soyad || !sifre) return res.status(400).json({ error: 'Ad soyad ve şifre zorunludur' });

  try {
    const hash = bcrypt.hashSync(sifre, 10);
    const info = db.prepare(`
      INSERT INTO ogretmenler (ad_soyad, sifre, telefon, email, rol, yetki_durumu, okul_id) 
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(ad_soyad, hash, telefon || null, email || null, rol || 'ogretmen', okul_id || null);

    res.json({ message: 'Öğretmen başarıyla eklendi', id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/admin/ogretmenler/:id
 * @desc    Öğretmen bilgilerini güncelle (veya kısıtla)
 */
router.put('/ogretmenler/:id', adminMiddleware, (req, res) => {
  const { ad_soyad, telefon, email, sifre, rol, yetki_durumu, okul_id } = req.body;
  const { id } = req.params;

  try {
    // Mevcut öğretmeni bul
    const existing = db.prepare('SELECT * FROM ogretmenler WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Öğretmen bulunamadı' });

    const newName = ad_soyad || existing.ad_soyad;
    const newPhone = telefon !== undefined ? telefon : existing.telefon;
    const newEmail = email !== undefined ? email : existing.email;
    const newRol = rol || existing.rol;
    const newYetki = yetki_durumu !== undefined ? yetki_durumu : existing.yetki_durumu;
    const newOkul = okul_id !== undefined ? okul_id : existing.okul_id;
    
    // Şifre güncellenecekse hashle
    const newSifre = sifre ? bcrypt.hashSync(sifre, 10) : existing.sifre;

    db.prepare(`
      UPDATE ogretmenler 
      SET ad_soyad = ?, sifre = ?, telefon = ?, email = ?, rol = ?, yetki_durumu = ?, okul_id = ?
      WHERE id = ?
    `).run(newName, newSifre, newPhone, newEmail, newRol, newYetki, newOkul, id);

    res.json({ message: 'Öğretmen güncellendi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// === OKUL YÖNETİMİ ===

router.get('/okullar', adminMiddleware, (req, res) => {
  try {
    const okullar = db.prepare('SELECT * FROM okullar').all();
    res.json({ data: okullar });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/ogretmenler/temizle', adminMiddleware, (req, res) => {
  try {
    const transaction = db.transaction(() => {
      // 1. Yöneticiyi bul (id=1 varsayımı hatalı olabilir, rol='admin' olanı alalım)
      const adminUser = db.prepare("SELECT id FROM ogretmenler WHERE rol = 'admin' LIMIT 1").get();
      if (!adminUser) throw new Error("Yönetici hesabı bulunamadı!");

      const adminId = adminUser.id;

      // 2. Yabancı anahtarları yöneticiye aktar (Hata almamak için)
      db.prepare('UPDATE ogrenciler SET ogretmen_id = ? WHERE ogretmen_id != ?').run(adminId, adminId);
      db.prepare('UPDATE devamsizlik_kayitlari SET ogretmen_id = ? WHERE ogretmen_id != ?').run(adminId, adminId);
      db.prepare('UPDATE ziyaret_gruplari SET ogretmen_id = ? WHERE ogretmen_id != ?').run(adminId, adminId);
      db.prepare('UPDATE isletme_ziyaret_tarihleri SET ogretmen_id = ? WHERE ogretmen_id != ?').run(adminId, adminId);

      // 3. Admin dışındaki tüm öğretmenleri sil
      const result = db.prepare("DELETE FROM ogretmenler WHERE rol != 'admin'").run();
      return result.changes;
    });

    const deletedCount = transaction();
    res.json({ message: `Başarılı! ${deletedCount} öğretmen silindi. Kalan veriler Excel yüklemesiyle güncellenebilir.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/okullar', adminMiddleware, (req, res) => {
  const { okul_adi } = req.body;
  if (!okul_adi) return res.status(400).json({ error: 'Okul adı zorunludur' });
  try {
    db.prepare('INSERT INTO okullar (okul_adi) VALUES (?)').run(okul_adi);
    res.json({ message: 'Okul eklendi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/okullar/:id', adminMiddleware, (req, res) => {
  const { okul_adi } = req.body;
  const { id } = req.params;
  if (!okul_adi) return res.status(400).json({ error: 'Okul adı zorunludur' });
  try {
    db.prepare('UPDATE okullar SET okul_adi = ? WHERE id = ?').run(okul_adi, id);
    res.json({ message: 'Okul güncellendi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/okullar/:id', adminMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM okullar WHERE id = ?').run(req.params.id);
    res.json({ message: 'Okul silindi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === EXCEL SYNC (VERİ TABANINI GÜNCELLE) ===

/**
 * @route   POST /api/admin/sync-excel
 * @desc    Excel dosyasını yükler ve python okuma scriptini çalıştırır.
 */
router.post('/sync-excel', adminMiddleware, upload.single('excelFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Excel dosyası yüklenemedi' });
  }

  // Yüklenen dosyanın yolu
  const filePath = req.file.path;
  
  // Script yolu
  const scriptPath = path.join(__dirname, '../utils/read_excel_sheets.py');

  // Python script'ini çalıştır (argüman olarak dosya yolunu ver)
  const pythonProcess = spawn('python3', [scriptPath, filePath]);

  let stdoutData = '';
  let stderrData = '';

  pythonProcess.stdout.on('data', (data) => {
    stdoutData += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    stderrData += data.toString();
  });

  pythonProcess.on('close', (code) => {
    try {
      // Çıktının son satırında JSON olması beklenir
      const jsonStart = stdoutData.indexOf('{');
      if (jsonStart === -1) {
        throw new Error("Python çıktısında JSON bulunamadı. Stderr: " + stderrData);
      }
      const jsonStr = stdoutData.substring(jsonStart);
      const parsedData = JSON.parse(jsonStr);

      if (parsedData.error) {
        throw new Error(parsedData.error);
      }

      const { ogretmenler, ogrenciler } = parsedData;
      let eklenecekOgretmenSayisi = 0;
      let guncellenecekOgrenciSayisi = 0;

      const transaction = db.transaction(() => {
        // 1. Öğretmenleri senkronize et
        const insertOgretmen = db.prepare(`
          INSERT INTO ogretmenler (ad_soyad, sifre, rol, yetki_durumu)
          VALUES (?, ?, 'ogretmen', 1)
        `);
        const checkOgretmen = db.prepare('SELECT id FROM ogretmenler WHERE ad_soyad = ?');
        
        // Şifre: Varsayılan olarak 123456
        const defaultSifre = bcrypt.hashSync('123456', 10);

        for (const ogretmenAdi of ogretmenler) {
          if (!ogretmenAdi) continue;
          const mevcut = checkOgretmen.get(ogretmenAdi);
          if (!mevcut) {
            insertOgretmen.run(ogretmenAdi, defaultSifre);
            eklenecekOgretmenSayisi++;
          }
        }

        // 2. Öğrencileri senkronize et
        const checkOgrenci = db.prepare('SELECT id FROM ogrenciler WHERE ogrenci_no = ?');
        const insertOgrenci = db.prepare(`
          INSERT INTO ogrenciler (
            ogrenci_no, ad_soyad, sube, dal, isletme_adi, ogretmen_id,
            isyeri_telefonu, isyeri_adresi, ise_giris_tarihi, usta_ogretici_adi,
            okul_devamsizligi, isletme_devamsizligi
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const updateOgrenci = db.prepare(`
          UPDATE ogrenciler 
          SET ad_soyad = ?, sube = ?, dal = ?, isletme_adi = ?, ogretmen_id = ?,
              isyeri_telefonu = ?, isyeri_adresi = ?, ise_giris_tarihi = ?, usta_ogretici_adi = ?,
              okul_devamsizligi = ?, isletme_devamsizligi = ?
          WHERE ogrenci_no = ?
        `);

        for (const ogr of ogrenciler) {
          let ogrt_id = 1; // Varsayılan (Yönetici veya ilk öğretmen)
          if (ogr.ogretmen) {
            const ogrt = checkOgretmen.get(ogr.ogretmen);
            if (ogrt) ogrt_id = ogrt.id;
          }

          const parseDevamsizlik = (val) => {
            if (!val) return 0;
            const parsed = parseInt(val, 10);
            return isNaN(parsed) ? 0 : parsed;
          };

          const o_devam = parseDevamsizlik(ogr.okul_devamsizligi);
          const i_devam = parseDevamsizlik(ogr.isletme_devamsizligi);

          const mevcutOgr = checkOgrenci.get(ogr.ogrenci_no);
          if (mevcutOgr) {
            updateOgrenci.run(
              ogr.ad_soyad, ogr.sube, ogr.dal, ogr.isletme_adi, ogrt_id,
              ogr.isyeri_telefonu, ogr.isyeri_adresi, ogr.ise_giris_tarihi, ogr.usta_ogretici_adi,
              o_devam, i_devam,
              ogr.ogrenci_no
            );
          } else {
            insertOgrenci.run(
              ogr.ogrenci_no, ogr.ad_soyad, ogr.sube, ogr.dal, ogr.isletme_adi, ogrt_id,
              ogr.isyeri_telefonu, ogr.isyeri_adresi, ogr.ise_giris_tarihi, ogr.usta_ogretici_adi,
              o_devam, i_devam
            );
          }
          guncellenecekOgrenciSayisi++;
        }
      });

      // İşlemi başlat
      transaction();

      res.json({ 
        message: `Başarılı! ${eklenecekOgretmenSayisi} yeni öğretmen eklendi. ${guncellenecekOgrenciSayisi} öğrenci güncellendi. Yeni öğretmenlerin geçici şifresi: 123456`,
      });

    } catch (err) {
      console.error('Veritabanı senkronizasyon hatası:', err);
      res.status(500).json({ error: 'Veri işleme hatası', details: err.message });
    }
  });
});

module.exports = router;
