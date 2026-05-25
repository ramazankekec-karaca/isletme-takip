/**
 * auth.js — Giriş (Login) API'si
 * POST /api/auth/login
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { JWT_SECRET, authMiddleware } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/auth/ogretmenler
 * @desc    Tüm öğretmen adlarını listele (mobil uygulamada dropdown/picker için)
 */
router.get('/ogretmenler', (req, res) => {
  const ogretmenler = db.prepare(
    "SELECT id, ad_soyad FROM ogretmenler WHERE rol != 'admin' ORDER BY ad_soyad"
  ).all();
  res.json({ data: ogretmenler });
});

/**
 * @route   POST /api/auth/login
 * @desc    Öğretmen girişi — ogretmen_id (picker) veya ad_soyad ile
 * @body    { ogretmen_id?: number, ad_soyad?: string, sifre: string }
 * @returns { token, ogretmen: { id, ad_soyad } }
 */
router.post('/login', (req, res) => {
  const { ogretmen_id, ad_soyad, email, sifre } = req.body;

  if (!sifre) {
    return res.status(400).json({ error: 'Şifre gerekli' });
  }

  if (!ogretmen_id && !ad_soyad && !email) {
    return res.status(400).json({ error: 'Giriş bilgisi (E-posta veya kullanıcı adı) gerekli' });
  }

  // Öğretmeni email, ID veya isimle bul
  let ogretmen;
  if (email) {
    ogretmen = db.prepare('SELECT * FROM ogretmenler WHERE LOWER(email) = LOWER(?)').get(email.trim());
  } else if (ogretmen_id) {
    ogretmen = db.prepare('SELECT * FROM ogretmenler WHERE id = ?').get(ogretmen_id);
  } else {
    ogretmen = db.prepare(
      'SELECT * FROM ogretmenler WHERE LOWER(ad_soyad) = LOWER(?)'
    ).get(ad_soyad.trim());
  }

  if (!ogretmen) {
    return res.status(401).json({ error: 'Öğretmen bulunamadı' });
  }

  // Şifreyi doğrula
  const sifreGecerli = bcrypt.compareSync(sifre, ogretmen.sifre);
  if (!sifreGecerli) {
    return res.status(401).json({ error: 'Hatalı şifre' });
  }

  // Yetki durumu kontrolü
  if (ogretmen.yetki_durumu === 0) {
    return res.status(403).json({ error: 'Hesabınızın sisteme girişi yönetici tarafından kısıtlanmıştır.' });
  }

  // JWT token oluştur (7 gün geçerli)
  const token = jwt.sign(
    { id: ogretmen.id, ad_soyad: ogretmen.ad_soyad, rol: ogretmen.rol },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    message: 'Giriş başarılı',
    token,
    ogretmen: {
      id: ogretmen.id,
      ad_soyad: ogretmen.ad_soyad,
      rol: ogretmen.rol
    }
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Token doğrulama (uygulama başlangıcında kullan)
 */
router.get('/me', authMiddleware, (req, res) => {
  res.json({ ogretmen: req.user });
});

module.exports = router;
