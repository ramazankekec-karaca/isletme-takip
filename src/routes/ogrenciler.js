/**
 * ogrenciler.js — Öğrenci CRUD API'si
 * 
 * GET    /api/ogrenciler          → Giriş yapan öğretmenin öğrencileri
 * GET    /api/ogrenciler/:id      → Tek öğrenci detayı
 * POST   /api/ogrenciler          → Yeni öğrenci ekle
 * PUT    /api/ogrenciler/:id      → Öğrenci bilgilerini güncelle
 * DELETE /api/ogrenciler/:id      → Öğrenci sil
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware } = require('../middleware/authMiddleware');

// Tüm route'lar için kimlik doğrulama zorunlu
router.use(authMiddleware);

/**
 * GET /api/ogrenciler
 * Giriş yapan öğretmenin öğrencilerini listeler.
 * Query params: sube, dal, arama
 */
router.get('/', (req, res) => {
  const { sube, dal, arama } = req.query;
  const ogretmenId = req.user.id;

  const isAdmin = req.user.rol === 'admin';

  let query = `
    SELECT 
      o.id, o.ogrenci_no, o.ad_soyad, o.sube, o.dal,
      o.okul_devamsizligi, o.isletme_devamsizligi,
      o.isletme_adi, o.isyeri_telefonu, o.isyeri_adresi,
      o.ise_giris_tarihi, o.usta_ogretici_adi, o.notlar,
      o.created_at, o.updated_at,
      o.ogretmen_id, og.ad_soyad as ogretmen_adi
    FROM ogrenciler o
    LEFT JOIN ogretmenler og ON o.ogretmen_id = og.id
    WHERE (o.ogretmen_id = ? OR ?)
  `;
  const params = [ogretmenId, isAdmin ? 1 : 0];

  if (sube) {
    query += ' AND o.sube = ?';
    params.push(sube);
  }

  if (dal) {
    query += ' AND o.dal = ?';
    params.push(dal);
  }

  if (arama) {
    query += ' AND (o.ad_soyad LIKE ? OR o.ogrenci_no LIKE ? OR o.isletme_adi LIKE ?)';
    const aramaParam = `%${arama}%`;
    params.push(aramaParam, aramaParam, aramaParam);
  }

  query += ' ORDER BY o.ad_soyad ASC';

  const ogrenciler = db.prepare(query).all(...params);
  res.json({ data: ogrenciler, toplam: ogrenciler.length });
});

/**
 * GET /api/ogrenciler/arama/tum
 * Tüm veritabanında (öğretmen fark etmeksizin) öğrenci veya işyeri araması yapar.
 */
router.get('/arama/tum', (req, res) => {
  const { q, tip } = req.query; // tip = 'ogrenci' veya 'isyeri'
  if (!q) return res.json({ data: [] });
  
  const aramaParam = `%${q}%`;
  
  if (tip === 'isyeri') {
    // Sadece işyerine göre ara ve benzersiz işyerlerini getir
    const query = `
      SELECT DISTINCT isletme_adi, isyeri_telefonu, isyeri_adresi, usta_ogretici_adi 
      FROM ogrenciler 
      WHERE isletme_adi LIKE ? AND isletme_adi IS NOT NULL AND isletme_adi != ''
      ORDER BY isletme_adi ASC
    `;
    const sonuc = db.prepare(query).all(aramaParam);
    return res.json({ data: sonuc });
  } else if (tip === 'isyeri_ogrencileri') {
    // Belirli bir işyerindeki tüm öğrencileri getir (tam eşleşme q = isletme_adi)
    const query = `
      SELECT o.id, o.ad_soyad, o.ogrenci_no, o.sube, o.dal, o.isletme_adi, og.ad_soyad as ogretmen_adi 
      FROM ogrenciler o
      LEFT JOIN ogretmenler og ON o.ogretmen_id = og.id
      WHERE o.isletme_adi = ?
      ORDER BY o.ad_soyad ASC
    `;
    const sonuc = db.prepare(query).all(q);
    return res.json({ data: sonuc });
  } else {
    // Öğrenciye göre ara (isim veya okul no)
    const query = `
      SELECT o.id, o.ad_soyad, o.ogrenci_no, o.sube, o.dal, o.isletme_adi, og.ad_soyad as ogretmen_adi 
      FROM ogrenciler o
      LEFT JOIN ogretmenler og ON o.ogretmen_id = og.id
      WHERE o.ad_soyad LIKE ? OR o.ogrenci_no LIKE ?
      ORDER BY o.ad_soyad ASC
      LIMIT 50
    `;
    const sonuc = db.prepare(query).all(aramaParam, aramaParam);
    return res.json({ data: sonuc });
  }
});

/**
 * GET /api/ogrenciler/filtreler
 * Öğretmenin öğrencilerine ait şube ve dal listesini döndürür (filtre dropdown için)
 */
router.get('/filtreler', (req, res) => {
  const ogretmenId = req.user.id;

  const subeler = db.prepare(
    'SELECT DISTINCT sube FROM ogrenciler WHERE ogretmen_id = ? ORDER BY sube'
  ).all(ogretmenId).map(r => r.sube);

  const dallar = db.prepare(
    'SELECT DISTINCT dal FROM ogrenciler WHERE ogretmen_id = ? ORDER BY dal'
  ).all(ogretmenId).map(r => r.dal);

  res.json({ subeler, dallar });
});

/**
 * GET /api/ogrenciler/:id
 * Tek öğrenci detayı (sadece kendi öğrencisi olmalı)
 */
router.get('/:id', (req, res) => {
  const ogretmenId = req.user.id;
  const { id } = req.params;

  const ogrenci = db.prepare(`
    SELECT 
      o.*,
      og.ad_soyad as ogretmen_adi
    FROM ogrenciler o
    JOIN ogretmenler og ON o.ogretmen_id = og.id
    WHERE o.id = ? AND (o.ogretmen_id = ? OR ?)
  `).get(id, ogretmenId, req.user.rol === 'admin' ? 1 : 0);

  if (!ogrenci) {
    return res.status(404).json({ error: 'Öğrenci bulunamadı' });
  }

  // Son devamsızlık kayıtları
  const devamsizliklar = db.prepare(`
    SELECT * FROM devamsizlik_kayitlari
    WHERE ogrenci_id = ?
    ORDER BY tarih DESC
    LIMIT 10
  `).all(id);

  res.json({ data: { ...ogrenci, devamsizliklar } });
});

/**
 * POST /api/ogrenciler
 * Yeni öğrenci ekle
 */
router.post('/', (req, res) => {
  const ogretmenId = req.user.id;
  const {
    ogrenci_no, ad_soyad, sube, dal,
    isletme_adi, isyeri_telefonu, isyeri_adresi,
    ise_giris_tarihi, usta_ogretici_adi, notlar
  } = req.body;

  if (!ogrenci_no || !ad_soyad || !sube || !dal) {
    return res.status(400).json({ error: 'Öğrenci no, ad soyad, şube ve dal zorunludur' });
  }

  // Mükerrer kayıt kontrolü
  const mevcutOgrenci = db.prepare(
    'SELECT id FROM ogrenciler WHERE ogrenci_no = ?'
  ).get(ogrenci_no);

  if (mevcutOgrenci) {
    return res.status(409).json({ error: 'Bu öğrenci numarası zaten kayıtlı' });
  }

  const result = db.prepare(`
    INSERT INTO ogrenciler (
      ogrenci_no, ad_soyad, sube, dal, ogretmen_id,
      isletme_adi, isyeri_telefonu, isyeri_adresi,
      ise_giris_tarihi, usta_ogretici_adi, notlar
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ogrenci_no, ad_soyad, sube, dal, ogretmenId,
    isletme_adi || null, isyeri_telefonu || null, isyeri_adresi || null,
    ise_giris_tarihi || null, usta_ogretici_adi || null, notlar || null
  );

  const yeniOgrenci = db.prepare('SELECT * FROM ogrenciler WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Öğrenci eklendi', data: yeniOgrenci });
});

/**
 * PUT /api/ogrenciler/:id
 * Öğrenci bilgilerini güncelle
 */
router.put('/:id', (req, res) => {
  const ogretmenId = req.user.id;
  const { id } = req.params;

  // Sahiplik kontrolü
  const ogrenci = db.prepare(
    'SELECT id FROM ogrenciler WHERE id = ? AND (ogretmen_id = ? OR ?)'
  ).get(id, ogretmenId, req.user.rol === 'admin' ? 1 : 0);

  if (!ogrenci) {
    return res.status(404).json({ error: 'Öğrenci bulunamadı veya yetkisiz erişim' });
  }

  const {
    ad_soyad, sube, dal,
    isletme_adi, isyeri_telefonu, isyeri_adresi,
    ise_giris_tarihi, usta_ogretici_adi, notlar
  } = req.body;

  db.prepare(`
    UPDATE ogrenciler SET
      ad_soyad = COALESCE(?, ad_soyad),
      sube = COALESCE(?, sube),
      dal = COALESCE(?, dal),
      isletme_adi = COALESCE(?, isletme_adi),
      isyeri_telefonu = COALESCE(?, isyeri_telefonu),
      isyeri_adresi = COALESCE(?, isyeri_adresi),
      ise_giris_tarihi = COALESCE(?, ise_giris_tarihi),
      usta_ogretici_adi = COALESCE(?, usta_ogretici_adi),
      notlar = COALESCE(?, notlar)
    WHERE id = ?
  `).run(
    ad_soyad, sube, dal,
    isletme_adi, isyeri_telefonu, isyeri_adresi,
    ise_giris_tarihi, usta_ogretici_adi, notlar,
    id
  );

  const guncellenen = db.prepare('SELECT * FROM ogrenciler WHERE id = ?').get(id);
  res.json({ message: 'Öğrenci güncellendi', data: guncellenen });
});

/**
 * DELETE /api/ogrenciler/:id
 */
router.delete('/:id', (req, res) => {
  const ogretmenId = req.user.id;
  const { id } = req.params;

  const ogrenci = db.prepare(
    'SELECT id FROM ogrenciler WHERE id = ? AND ogretmen_id = ?'
  ).get(id, ogretmenId);

  if (!ogrenci) {
    return res.status(404).json({ error: 'Öğrenci bulunamadı veya yetkisiz erişim' });
  }

  db.prepare('DELETE FROM devamsizlik_kayitlari WHERE ogrenci_id = ?').run(id);
  db.prepare('DELETE FROM ogrenciler WHERE id = ?').run(id);

  res.json({ message: 'Öğrenci silindi' });
});

module.exports = router;
