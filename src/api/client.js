// src/api/client.js
// Tüm API istekleri buradan yapılır.
// Sunucu adresini buradan güncelleyebilirsiniz.

import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ Bilgisayarınızın yerel IP adresi (ipconfig komutuyla bulundu)
// Telefon ve bilgisayar aynı Wi-Fi ağında olmalıdır!
import { Platform } from 'react-native';

// ⚠️ Web testleri için localhost, Mobil (APK) için bilgisayarın yerel IP adresi
export const API_BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:3000' 
  : 'http://192.168.1.6:3000';

const TOKEN_KEY = '@isletme_token';
const USER_KEY = '@isletme_user';

// ─── TOKEN YÖNETİMİ ───────────────────────────────────────────────────────────

export const tokenSakla = async (token) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const tokenGetir = async () => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const tokenSil = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
};

export const kullaniciBilgisiSakla = async (user) => {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const kullaniciBilgisiGetir = async () => {
  const data = await AsyncStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};

// ─── HTTP İSTEKLERİ ───────────────────────────────────────────────────────────

const istekYap = async (endpoint, options = {}) => {
  const token = await tokenGetir();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status} hatası`);
  }

  return data;
};

// ─── AUTH API ─────────────────────────────────────────────────────────────────

export const authAPI = {
  // Öğretmen listesini getir (login ekranı dropdown için)
  ogretmenleriGetir: () => istekYap('/api/auth/ogretmenler'),

  // Giriş yap
  girisYap: (payload) =>
    istekYap('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Token doğrula
  beniGetir: () => istekYap('/api/auth/me'),
};

// ─── ÖĞRENCİ API ──────────────────────────────────────────────────────────────

export const ogrenciAPI = {
  // Öğrenci listesi (opsiyonel filtrelerle)
  listele: (filtreler = {}) => {
    const params = new URLSearchParams();
    if (filtreler.sube) params.append('sube', filtreler.sube);
    if (filtreler.dal) params.append('dal', filtreler.dal);
    if (filtreler.arama) params.append('arama', filtreler.arama);
    const sorgu = params.toString();
    return istekYap(`/api/ogrenciler${sorgu ? `?${sorgu}` : ''}`);
  },

  // Filtre değerlerini getir (şube ve dal listeleri)
  filtreleriGetir: () => istekYap('/api/ogrenciler/filtreler'),

  // Tek öğrenci detayı
  detay: (id) => istekYap(`/api/ogrenciler/${id}`),

  // Öğrenci güncelle
  guncelle: (id, veriler) =>
    istekYap(`/api/ogrenciler/${id}`, {
      method: 'PUT',
      body: JSON.stringify(veriler),
    }),

  // Yeni öğrenci ekle
  ekle: (veriler) =>
    istekYap('/api/ogrenciler', {
      method: 'POST',
      body: JSON.stringify(veriler),
    }),

  // Tüm veritabanında arama
  globalArama: (metin, tip) => 
    istekYap(`/api/ogrenciler/arama/tum?q=${encodeURIComponent(metin)}&tip=${tip}`),
};

// ─── ADMIN API ───────────────────────────────────────────────────────────────

export const adminAPI = {
  ogretmenler: () => istekYap('/api/admin/ogretmenler'),
  ogretmenEkle: (veri) => istekYap('/api/admin/ogretmenler', { method: 'POST', body: JSON.stringify(veri) }),
  ogretmenGuncelle: (id, veri) => istekYap(`/api/admin/ogretmenler/${id}`, { method: 'PUT', body: JSON.stringify(veri) }),
  ogretmenleriTemizle: () => istekYap('/api/admin/ogretmenler/temizle', { method: 'DELETE' }),
  
  okullar: () => istekYap('/api/admin/okullar'),
  okulEkle: (veri) => istekYap('/api/admin/okullar', { method: 'POST', body: JSON.stringify(veri) }),
  okulGuncelle: (id, veri) => istekYap(`/api/admin/okullar/${id}`, { method: 'PUT', body: JSON.stringify(veri) }),
  okulSil: (id) => istekYap(`/api/admin/okullar/${id}`, { method: 'DELETE' }),

  syncExcel: async (formData) => {
    const token = await tokenGetir();
    const response = await fetch(`${API_BASE_URL}/api/admin/sync-excel`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Excel yükleme hatası');
    return data;
  }
};


// ─── DEVAMSIZLIK API ──────────────────────────────────────────────────────────

export const devamsizlikAPI = {
  // Devamsızlık ekle (+1)
  ekle: (ogrenci_id, devamsizlik_turu, aciklama = '') =>
    istekYap('/api/devamsizlik/ekle', {
      method: 'POST',
      body: JSON.stringify({
        ogrenci_id,
        devamsizlik_turu,
        tarih: new Date().toISOString().split('T')[0],
        aciklama,
      }),
    }),

  // Devamsızlık çıkar (-1)
  cikar: (ogrenci_id, devamsizlik_turu) =>
    istekYap('/api/devamsizlik/cikar', {
      method: 'POST',
      body: JSON.stringify({ ogrenci_id, devamsizlik_turu }),
    }),

  // Tarihçe
  tarihce: (ogrenci_id) => istekYap(`/api/devamsizlik/${ogrenci_id}`),
};

// ─── RAPOR API ────────────────────────────────────────────────────────────────

export const raporAPI = {
  // Çoklu öğrenci değerlendirme
  ogrenciDegerlendirme: (ogrenciler) => 
    istekYap('/api/raporlar/ogrenci-degerlendirme', {
      method: 'POST',
      body: JSON.stringify({ ogrenciler }),
    }),
    
  ogretmenRaporu: (ogrenciler, format = 'pdf') =>
    istekYap('/api/raporlar/ogretmen-raporu', {
      method: 'POST',
      body: JSON.stringify({ ogrenciler, format }),
    }),

  ayrilmaSablonu: () => istekYap('/api/raporlar/ayrilma-sablon'),

  ayrilmaFormu: (ogrenci_id, format = 'pdf', ayrilmaTarihi, fesihGerekcesi) =>
    istekYap('/api/raporlar/ayrilma-formu', {
      method: 'POST',
      body: JSON.stringify({ ogrenci_id, format, ayrilmaTarihi, fesihGerekcesi }),
    }),

  ziyaretFormu: (ogrenci_id, format = 'pdf', ekBilgiler = {}) =>
    istekYap('/api/raporlar/ziyaret-formu', {
      method: 'POST',
      body: JSON.stringify({ ogrenci_id, format, ...ekBilgiler }),
    }),
};

// ─── PLAN API ─────────────────────────────────────────────────────────────────

export const planAPI = {
  listele: () => istekYap('/api/planlar'),

  grupEkle: (grup_adi, ziyaret_tarihi) =>
    istekYap('/api/planlar/grup', {
      method: 'POST',
      body: JSON.stringify({ grup_adi, ziyaret_tarihi }),
    }),

  grupSil: (id) =>
    istekYap(`/api/planlar/grup/${id}`, {
      method: 'DELETE',
    }),

  isletmeAta: (isletme_adi, hedef_grup_id = null) =>
    istekYap('/api/planlar/ata', {
      method: 'POST',
      body: JSON.stringify({ isletme_adi, hedef_grup_id }),
    }),

  tarihKaydet: (isletmeler, ziyaret_tarihi) =>
    istekYap('/api/planlar/ziyaret-tarihi-kaydet', {
      method: 'POST',
      body: JSON.stringify({ isletmeler, ziyaret_tarihi }),
    }),

  mapsLink: (isletmeler) =>
    istekYap('/api/planlar/maps-link', {
      method: 'POST',
      body: JSON.stringify({ isletmeler }),
    }),
};

