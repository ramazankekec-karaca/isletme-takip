/**
 * authMiddleware.js — JWT token doğrulama middleware'i
 * Her korumalı route bu middleware'den geçer.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'isletme_takip_gizli_anahtar_2024';

const authMiddleware = (req, res, next) => {
  // Header'dan token al
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Yetkilendirme token\'ı gerekli' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, ad_soyad }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş token' });
  }
};

const adminMiddleware = (req, res, next) => {
  // Önce normal authMiddleware'i çağırıp token'ı çözüyoruz
  authMiddleware(req, res, () => {
    // req.user doldu, rol kontrolü yapalım
    if (req.user && req.user.rol === 'admin') {
      next();
    } else {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmuyor (Admin yetkisi gerekli)' });
    }
  });
};

module.exports = { authMiddleware, adminMiddleware, JWT_SECRET };
