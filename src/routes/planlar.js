/**
 * planlar.js — İşletme Ziyaret Planları API'si
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware } = require('../middleware/authMiddleware');

// Tüm route'lar için kimlik doğrulama zorunlu
router.use(authMiddleware);

/**
 * GET /api/planlar
 * Öğretmenin oluşturduğu tüm grupları ve gruba atanmış işletmeleri getirir
 */
router.get('/', (req, res) => {
  const ogretmenId = req.user.id;

  // Tüm grupları al
  const gruplar = db.prepare(`
    SELECT id, grup_adi, ziyaret_tarihi 
    FROM ziyaret_gruplari 
    WHERE ogretmen_id = ?
    ORDER BY created_at DESC
  `).all(ogretmenId);

  // Öğretmenin tüm işletmelerini al (tekil olarak)
  const tumIsletmeler = db.prepare(`
    SELECT DISTINCT isletme_adi 
    FROM ogrenciler 
    WHERE ogretmen_id = ? AND isletme_adi IS NOT NULL AND isletme_adi != ''
  `).all(ogretmenId).map(r => r.isletme_adi);

  // Gruplara atanmış işletmeleri al
  const atanmisIsletmelerDb = db.prepare(`
    SELECT zgi.isletme_adi, zgi.grup_id 
    FROM ziyaret_grup_isletmeleri zgi
    JOIN ziyaret_gruplari zg ON zgi.grup_id = zg.id
    WHERE zg.ogretmen_id = ?
  `).all(ogretmenId);

  // Atanmış işletmeleri gruplara yerleştir
  gruplar.forEach(grup => {
    grup.isletmeler = atanmisIsletmelerDb
      .filter(i => i.grup_id === grup.id)
      .map(i => i.isletme_adi);
  });

  // Atanmamış (boşta kalan) işletmeleri bul
  const atanmisIsletmeAdlari = atanmisIsletmelerDb.map(i => i.isletme_adi);
  const atanmamisIsletmeler = tumIsletmeler.filter(i => !atanmisIsletmeAdlari.includes(i));

  // En son ziyaret tarihlerini al (en son eklenen ilk sırada)
  const sonZiyaretTarihleriDb = db.prepare(`
    SELECT isletme_adi, ziyaret_tarihi 
    FROM isletme_ziyaret_tarihleri 
    WHERE ogretmen_id = ? 
    ORDER BY id DESC
  `).all(ogretmenId);

  const sonZiyaretMap = {};
  sonZiyaretTarihleriDb.forEach(kayit => {
    if (!sonZiyaretMap[kayit.isletme_adi]) {
      sonZiyaretMap[kayit.isletme_adi] = kayit.ziyaret_tarihi;
    }
  });

  res.json({
    gruplar,
    atanmamisIsletmeler,
    sonZiyaretMap
  });
});

/**
 * POST /api/planlar/grup
 * Yeni grup oluştur (Örn: "Pazartesi Grubu")
 */
router.post('/grup', (req, res) => {
  const ogretmenId = req.user.id;
  const { grup_adi, ziyaret_tarihi } = req.body;

  if (!grup_adi) {
    return res.status(400).json({ error: 'Grup adı zorunludur' });
  }

  const result = db.prepare(`
    INSERT INTO ziyaret_gruplari (ogretmen_id, grup_adi, ziyaret_tarihi)
    VALUES (?, ?, ?)
  `).run(ogretmenId, grup_adi, ziyaret_tarihi || null);

  const yeniGrup = db.prepare('SELECT id, grup_adi, ziyaret_tarihi FROM ziyaret_gruplari WHERE id = ?').get(result.lastInsertRowid);
  yeniGrup.isletmeler = []; // Başlangıçta boş

  res.status(201).json({ message: 'Grup oluşturuldu', data: yeniGrup });
});

/**
 * DELETE /api/planlar/grup/:id
 * Grubu sil
 */
router.delete('/grup/:id', (req, res) => {
  const ogretmenId = req.user.id;
  const { id } = req.params;

  const grup = db.prepare('SELECT id FROM ziyaret_gruplari WHERE id = ? AND ogretmen_id = ?').get(id, ogretmenId);

  if (!grup) {
    return res.status(404).json({ error: 'Grup bulunamadı veya yetkisiz işlem' });
  }

  db.prepare('DELETE FROM ziyaret_gruplari WHERE id = ?').run(id);

  res.json({ message: 'Grup silindi' });
});

/**
 * POST /api/planlar/ata
 * Bir işletmeyi bir gruba ata, veya gruptan çıkar
 * (Eğer hedef_grup_id null ise, işletme gruptan çıkarılır ve atanmamışlara düşer)
 */
router.post('/ata', (req, res) => {
  const ogretmenId = req.user.id;
  const { isletme_adi, hedef_grup_id } = req.body;

  if (!isletme_adi) {
    return res.status(400).json({ error: 'İşletme adı zorunludur' });
  }

  // İşletme öğretmene ait mi kontrol et
  const isletmeOgrenci = db.prepare('SELECT id FROM ogrenciler WHERE ogretmen_id = ? AND isletme_adi = ? LIMIT 1').get(ogretmenId, isletme_adi);
  if (!isletmeOgrenci) {
    return res.status(403).json({ error: 'Bu işletme size ait değil' });
  }

  // Eski gruptan (eğer varsa) işletmeyi çıkar
  db.prepare(`
    DELETE FROM ziyaret_grup_isletmeleri 
    WHERE isletme_adi = ? AND grup_id IN (SELECT id FROM ziyaret_gruplari WHERE ogretmen_id = ?)
  `).run(isletme_adi, ogretmenId);

  if (hedef_grup_id) {
    // Hedef grup öğretmene ait mi kontrol et
    const hedefGrup = db.prepare('SELECT id FROM ziyaret_gruplari WHERE id = ? AND ogretmen_id = ?').get(hedef_grup_id, ogretmenId);
    if (!hedefGrup) {
      return res.status(403).json({ error: 'Hedef grup bulunamadı veya size ait değil' });
    }

    // İşletmeyi yeni gruba ekle
    db.prepare('INSERT INTO ziyaret_grup_isletmeleri (grup_id, isletme_adi) VALUES (?, ?)').run(hedef_grup_id, isletme_adi);
    res.json({ message: 'İşletme gruba atandı' });
  } else {
    res.json({ message: 'İşletme gruptan çıkarıldı' });
  }
});

/**
 * POST /api/planlar/ziyaret-tarihi-kaydet
 * Seçili işletmeler için ziyaret tarihi kaydet
 */
router.post('/ziyaret-tarihi-kaydet', (req, res) => {
  const ogretmenId = req.user.id;
  const { isletmeler, ziyaret_tarihi } = req.body;

  if (!isletmeler || !Array.isArray(isletmeler) || isletmeler.length === 0) {
    return res.status(400).json({ error: 'İşletme listesi boş olamaz' });
  }
  if (!ziyaret_tarihi) {
    return res.status(400).json({ error: 'Ziyaret tarihi zorunludur' });
  }

  const insertStmt = db.prepare('INSERT INTO isletme_ziyaret_tarihleri (ogretmen_id, isletme_adi, ziyaret_tarihi) VALUES (?, ?, ?)');
  
  db.transaction(() => {
    for (const isletme of isletmeler) {
      insertStmt.run(ogretmenId, isletme, ziyaret_tarihi);
    }
  })();

  res.json({ message: 'Ziyaret planı başarıyla oluşturuldu' });
});

/**
 * POST /api/planlar/maps-link
 * Seçili işletmelerin adreslerini alıp Google Maps rota linki oluştur
 */
router.post('/maps-link', (req, res) => {
  const ogretmenId = req.user.id;
  const { isletmeler } = req.body;

  if (!isletmeler || !Array.isArray(isletmeler) || isletmeler.length === 0) {
    return res.status(400).json({ error: 'İşletme listesi boş olamaz' });
  }

  const placeholders = isletmeler.map(() => '?').join(',');
  
  // İşletmelerin adreslerini çek
  // Aynı işletme adında birden fazla öğrenci olabilir, DISTINCT ile tek adres alalım
  // isyeri_adresi boş olmayanları al
  const stmt = db.prepare(`
    SELECT DISTINCT isyeri_adresi 
    FROM ogrenciler 
    WHERE ogretmen_id = ? AND isletme_adi IN (${placeholders}) AND isyeri_adresi IS NOT NULL AND isyeri_adresi != ''
  `);
  
  const adresler = stmt.all(ogretmenId, ...isletmeler).map(r => r.isyeri_adresi);

  if (adresler.length === 0) {
    return res.status(404).json({ error: 'Seçili işletmeler için adres bulunamadı' });
  }

  // Google Maps Dir URL oluştur
  // https://www.google.com/maps/dir/Adres1/Adres2/...
  const encodedAddresses = adresler.map(adres => encodeURIComponent(adres)).join('/');
  const mapsUrl = `https://www.google.com/maps/dir/${encodedAddresses}`;

  res.json({ mapsUrl });
});

module.exports = router;
