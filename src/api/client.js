// src/api/client.js
// Tüm API istekleri buradan yapılır.
// Sunucu adresini buradan güncelleyebilirsiniz.

import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ Kendi bilgisayarınızın IP adresi ile değiştirin!
// Bunu öğrenmek için PowerShell'de: ipconfig → "IPv4 Address" satırı
// Örnek: http://192.168.1.45:3000
export const API_BASE_URL = 'http://192.168.1.100:3000';

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
  girisYap: (ogretmen_id, sifre) =>
    istekYap('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ ogretmen_id, sifre }),
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
  ogrenciDegerlendirme: (ogrenci_id, format = 'pdf') =>
    istekYap('/api/raporlar/ogrenci-degerlendirme', {
      method: 'POST',
      body: JSON.stringify({ ogrenci_id, format }),
    }),

  ayrilmaFormu: (ogrenci_id, format = 'pdf', ekBilgiler = {}) =>
    istekYap('/api/raporlar/ayrilma-formu', {
      method: 'POST',
      body: JSON.stringify({ ogrenci_id, format, ...ekBilgiler }),
    }),

  ziyaretFormu: (ogrenci_id, format = 'pdf', ekBilgiler = {}) =>
    istekYap('/api/raporlar/ziyaret-formu', {
      method: 'POST',
      body: JSON.stringify({ ogrenci_id, format, ...ekBilgiler }),
    }),
};
