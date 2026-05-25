// src/context/AuthContext.js
// Uygulama genelinde giriş durumunu yönetir.

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, tokenSakla, tokenSil, kullaniciBilgisiSakla, kullaniciBilgisiGetir } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [kullanici, setKullanici] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Uygulama açıldığında önceki oturumu kontrol et
  useEffect(() => {
    const oturumuKontrolEt = async () => {
      try {
        const kaydedilmisKullanici = await kullaniciBilgisiGetir();
        if (kaydedilmisKullanici) {
          // Token hâlâ geçerli mi kontrol et
          await authAPI.beniGetir();
          setKullanici(kaydedilmisKullanici);
        }
      } catch {
        // Token süresi dolmuş, temizle
        await tokenSil();
        setKullanici(null);
      } finally {
        setYukleniyor(false);
      }
    };
    oturumuKontrolEt();
  }, []);

  const girisYap = async (payload) => {
    const yanit = await authAPI.girisYap(payload);
    await tokenSakla(yanit.token);
    await kullaniciBilgisiSakla(yanit.ogretmen);
    setKullanici(yanit.ogretmen);
    return yanit;
  };

  const cikisYap = async () => {
    await tokenSil();
    setKullanici(null);
  };

  return (
    <AuthContext.Provider value={{ kullanici, yukleniyor, girisYap, cikisYap }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth, AuthProvider içinde kullanılmalıdır');
  return context;
};
