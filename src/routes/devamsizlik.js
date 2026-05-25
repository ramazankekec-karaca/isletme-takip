/**
 * devamsizlik.js — Devamsızlık API'si
 *
 * POST /api/devamsizlik/ekle        → Devamsızlık ekle (+1)
 * GET  /api/devamsizlik/:ogrenci_id → Öğrencinin devamsızlık tarihçesi
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

/**
 * POST /api/devamsizlik/ekle
 * Öğrenciye devamsızlık ekler (okul veya işletme)
 * @body { ogrenci_id, devamsizlik_turu: 'okul' | 'isletme', tarih?, aciklama? }
 */
router.post('/ekle', (req, res) => {
  const ogretmenId = req.user.id;
  const { ogrenci_id, devamsizlik_turu, tarih, aciklama } = req.body;

  if (!ogrenci_id || !devamsizlik_turu) {
    return res.status(400).json({ error: 'ogrenci_id ve devamsizlik_turu gerekli' });
  }

  if (!['okul', 'isletme'].includes(devamsizlik_turu)) {
    return res.status(400).json({ error: 'devamsizlik_turu "okul" veya "isletme" olmalı' });
  }

  // Öğrencinin bu öğretmene ait olduğunu doğrula
  const ogrenci = db.prepare(
    'SELECT id, okul_devamsizligi, isletme_devamsizligi FROM ogrenciler WHERE id = ? AND ogretmen_id = ?'
  ).get(ogrenci_id, ogretmenId);

  if (!ogrenci) {
    return res.status(404).json({ error: 'Öğrenci bulunamadı veya yetkisiz erişim' });
  }

  const kayitTarihi = tarih || new Date().toISOString().split('T')[0];

  // Devamsızlık kaydını ekle (tarihçe için)
  db.prepare(`
    INSERT INTO devamsizlik_kayitlari (ogrenci_id, devamsizlik_turu, tarih, aciklama, ogretmen_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(ogrenci_id, devamsizlik_turu, kayitTarihi, aciklama || null, ogretmenId);

  // Toplam sayacı güncelle
  const sutun = devamsizlik_turu === 'okul' ? 'okul_devamsizligi' : 'isletme_devamsizligi';
  db.prepare(`UPDATE ogrenciler SET ${sutun} = ${sutun} + 1 WHERE id = ?`).run(ogrenci_id);

  // Güncel veriyi döndür
  const guncel = db.prepare(
    'SELECT okul_devamsizligi, isletme_devamsizligi FROM ogrenciler WHERE id = ?'
  ).get(ogrenci_id);

  res.json({
    message: `${devamsizlik_turu === 'okul' ? 'Okul' : 'İşletme'} devamsızlığı eklendi`,
    data: {
      ogrenci_id,
      okul_devamsizligi: guncel.okul_devamsizligi,
      isletme_devamsizligi: guncel.isletme_devamsizligi,
    }
  });
});

/**
 * POST /api/devamsizlik/cikar
 * Devamsızlığı azalt (-1), sıfırın altına düşmez
 * @body { ogrenci_id, devamsizlik_turu: 'okul' | 'isletme' }
 */
router.post('/cikar', (req, res) => {
  const ogretmenId = req.user.id;
  const { ogrenci_id, devamsizlik_turu } = req.body;

  if (!ogrenci_id || !devamsizlik_turu) {
    return res.status(400).json({ error: 'ogrenci_id ve devamsizlik_turu gerekli' });
  }

  const ogrenci = db.prepare(
    'SELECT id, okul_devamsizligi, isletme_devamsizligi FROM ogrenciler WHERE id = ? AND ogretmen_id = ?'
  ).get(ogrenci_id, ogretmenId);

  if (!ogrenci) {
    return res.status(404).json({ error: 'Öğrenci bulunamadı' });
  }

  const sutun = devamsizlik_turu === 'okul' ? 'okul_devamsizligi' : 'isletme_devamsizligi';
  const mevcutDeger = ogrenci[sutun];

  if (mevcutDeger <= 0) {
    return res.status(400).json({ error: 'Devamsızlık sayısı zaten 0' });
  }

  db.prepare(`UPDATE ogrenciler SET ${sutun} = ${sutun} - 1 WHERE id = ?`).run(ogrenci_id);

  const guncel = db.prepare(
    'SELECT okul_devamsizligi, isletme_devamsizligi FROM ogrenciler WHERE id = ?'
  ).get(ogrenci_id);

  res.json({
    message: 'Devamsızlık güncellendi',
    data: {
      ogrenci_id,
      okul_devamsizligi: guncel.okul_devamsizligi,
      isletme_devamsizligi: guncel.isletme_devamsizligi,
    }
  });
});

/**
 * GET /api/devamsizlik/:ogrenci_id
 * Öğrencinin devamsızlık tarihçesi
 */
router.get('/:ogrenci_id', (req, res) => {
  const ogretmenId = req.user.id;
  const { ogrenci_id } = req.params;

  // Yetki kontrolü
  const ogrenci = db.prepare(
    'SELECT id FROM ogrenciler WHERE id = ? AND ogretmen_id = ?'
  ).get(ogrenci_id, ogretmenId);

  if (!ogrenci) {
    return res.status(404).json({ error: 'Öğrenci bulunamadı' });
  }

  const kayitlar = db.prepare(`
    SELECT dk.*, og.ad_soyad as ogretmen_adi
    FROM devamsizlik_kayitlari dk
    JOIN ogretmenler og ON dk.ogretmen_id = og.id
    WHERE dk.ogrenci_id = ?
    ORDER BY dk.tarih DESC
  `).all(ogrenci_id);

  res.json({ data: kayitlar, toplam: kayitlar.length });
});

module.exports = router;
