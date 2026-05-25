// src/screens/LoginScreen.js
// Öğretmen giriş ekranı. Listeden öğretmen seçip şifre girilir.

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, Animated,
} from 'react-native';
import { authAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RENKLER, YAZI, BOSLUK, RADIUS, GOLGE } from '../theme';

export default function LoginScreen() {
  const { girisYap } = useAuth();

  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [sifreGoster, setSifreGoster] = useState(false);
  const [yoneticiGirisi, setYoneticiGirisi] = useState(false);
  const [kullaniciAdi, setKullaniciAdi] = useState('');

  // Animasyon değerleri
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(30);

  useEffect(() => {
    // Giriş animasyonu
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
    ]).start();

    // Eskiden liste yüklenen yer
    // Artık sadece email ile giriş yapılıyor
  }, []);

  const girisYapHandler = async () => {
    if (yoneticiGirisi) {
      if (!kullaniciAdi) {
        setHata('Lütfen yönetici adını girin');
        return;
      }
    } else {
      if (!email) {
        setHata('Lütfen e-posta adresinizi girin');
        return;
      }
    }
    if (!sifre) {
      setHata('Lütfen şifrenizi girin');
      return;
    }

    setHata('');
    setYukleniyor(true);
    try {
      const payload = yoneticiGirisi 
        ? { ad_soyad: kullaniciAdi, sifre } 
        : { email: email.trim(), sifre };
      await girisYap(payload);
    } catch (err) {
      setHata(err.message || 'Giriş başarısız');
    } finally {
      setYukleniyor(false);
    }
  };

  const IcerikSarmalayici = Platform.OS === 'web' ? View : KeyboardAvoidingView;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={RENKLER.lacivert} />
      
      <IcerikSarmalayici
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Başlık */}
          <View style={styles.headerBlok}>
            <View style={styles.logoKutu}>
              <Text style={styles.logoEmoji}>🏫</Text>
            </View>
            <Text style={styles.baslik}>İşletme Takip</Text>
            <Text style={styles.altBaslik}>Mesleki Eğitim Yönetim Sistemi</Text>
          </View>

          {/* Form Kartı */}
          <View style={styles.kart}>
            <Text style={styles.formBaslik}>Öğretmen Girişi</Text>

            {/* Öğretmen Email veya Kullanıcı Adı Girdisi */}
            <View style={styles.inputGrup}>
              <Text style={styles.etiket}>{yoneticiGirisi ? 'KULLANICI ADI' : 'E-POSTA ADRESİ'}</Text>
              
              {yoneticiGirisi ? (
                <View style={styles.sifreKutu}>
                  <TextInput
                    style={styles.sifreInput}
                    placeholder="Örn: Yönetici"
                    placeholderTextColor={RENKLER.metinGri}
                    value={kullaniciAdi}
                    onChangeText={(t) => { setKullaniciAdi(t); setHata(''); }}
                    cursorColor={RENKLER.turuncu}
                    selectionColor={RENKLER.turuncu}
                  />
                </View>
              ) : (
                <View style={styles.sifreKutu}>
                  <TextInput
                    style={styles.sifreInput}
                    placeholder="E-posta adresiniz"
                    placeholderTextColor={RENKLER.metinGri}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setHata(''); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    cursorColor={RENKLER.turuncu}
                    selectionColor={RENKLER.turuncu}
                  />
                </View>
              )}
            </View>

            {/* Şifre */}
            <View style={styles.inputGrup}>
              <Text style={styles.etiket}>ŞİFRE</Text>
              <View style={styles.sifreKutu}>
                <TextInput
                  style={styles.sifreInput}
                  placeholder="Şifrenizi girin"
                  placeholderTextColor={RENKLER.metinGri}
                  secureTextEntry={!sifreGoster}
                  value={sifre}
                  onChangeText={(t) => { setSifre(t); setHata(''); }}
                  keyboardType="default"
                  returnKeyType="done"
                  onSubmitEditing={girisYapHandler}
                  cursorColor={RENKLER.turuncu}
                  selectionColor={RENKLER.turuncu}
                />
                <TouchableOpacity
                  onPress={() => setSifreGoster(!sifreGoster)}
                  style={styles.sifreGozBtn}
                >
                  <Text style={styles.sifreGozIkon}>{sifreGoster ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Hata mesajı */}
            {hata ? (
              <View style={styles.hataKutu}>
                <Text style={styles.hataMetin}>⚠️  {hata}</Text>
              </View>
            ) : null}

            {/* Giriş Butonu */}
            <TouchableOpacity
              style={[styles.girisBtn, yukleniyor && styles.girisBtnDevre]}
              onPress={girisYapHandler}
              disabled={yukleniyor}
              activeOpacity={0.85}
            >
              {yukleniyor ? (
                <ActivityIndicator color={RENKLER.beyaz} />
              ) : (
                <Text style={styles.girisBtnMetin}>GİRİŞ YAP</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Alt bilgi */}
          <Text style={styles.altBilgi}>
            Şifrenizi unuttuysanız okul yöneticinizle iletişime geçin.
          </Text>

          {/* Yönetici Toggle */}
          <TouchableOpacity 
            onPress={() => { setYoneticiGirisi(!yoneticiGirisi); setHata(''); }}
            style={{ alignItems: 'center', marginTop: BOSLUK.lg }}
          >
            <Icon 
              name={yoneticiGirisi ? 'account-tie' : 'shield-account'} 
              size={32} 
              color={RENKLER.turuncu} 
            />
          </TouchableOpacity>
        </ScrollView>
      </IcerikSarmalayici>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RENKLER.lacivert,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: BOSLUK.xl,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },

  // Header
  headerBlok: {
    alignItems: 'center',
    marginBottom: BOSLUK.xxxl,
  },
  logoKutu: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.xl,
    backgroundColor: RENKLER.turuncu,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: BOSLUK.lg,
    ...GOLGE.turuncu,
  },
  logoEmoji: { fontSize: 44 },
  baslik: {
    fontSize: YAZI.xxxl,
    fontWeight: YAZI.extraKalin,
    color: RENKLER.metinBeyaz,
    letterSpacing: 1,
  },
  altBaslik: {
    fontSize: YAZI.sm,
    color: RENKLER.metinGri,
    marginTop: BOSLUK.xs,
    letterSpacing: 0.5,
  },

  // Kart
  kart: {
    width: '100%',
    backgroundColor: RENKLER.kart,
    borderRadius: RADIUS.xl,
    padding: BOSLUK.xxl,
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
    ...GOLGE.buyuk,
  },
  formBaslik: {
    fontSize: YAZI.xl,
    fontWeight: YAZI.kalin,
    color: RENKLER.metinBeyaz,
    marginBottom: BOSLUK.xl,
  },

  // Input grubu
  inputGrup: {
    marginBottom: BOSLUK.lg,
  },
  etiket: {
    fontSize: YAZI.xs,
    fontWeight: YAZI.kalin,
    color: RENKLER.turuncu,
    letterSpacing: 1.5,
    marginBottom: BOSLUK.sm,
  },

  // Picker
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: RENKLER.lacivert,
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
    borderRadius: RADIUS.md,
    paddingHorizontal: BOSLUK.lg,
    paddingVertical: BOSLUK.md,
    minHeight: 50,
  },
  pickerAcik: {
    borderColor: RENKLER.turuncu,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  pickerPlaceholder: {
    color: RENKLER.metinGri,
    fontSize: YAZI.md,
  },
  pickerSecili: {
    color: RENKLER.metinBeyaz,
    fontSize: YAZI.md,
    fontWeight: YAZI.orta,
  },
  pickerOk: {
    color: RENKLER.metinGri,
    fontSize: YAZI.sm,
  },
  pickerListesi: {
    backgroundColor: RENKLER.lacivertOrta,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: RENKLER.turuncu,
    borderBottomLeftRadius: RADIUS.md,
    borderBottomRightRadius: RADIUS.md,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BOSLUK.lg,
    paddingVertical: BOSLUK.md,
    borderBottomWidth: 1,
    borderBottomColor: RENKLER.kartKenari,
  },
  pickerItemSecili: {
    backgroundColor: `${RENKLER.turuncu}20`,
  },
  pickerItemMetin: {
    color: RENKLER.metinAcik,
    fontSize: YAZI.md,
  },
  pickerItemMetinSecili: {
    color: RENKLER.turuncu,
    fontWeight: YAZI.kalin,
  },
  checkIsaret: {
    color: RENKLER.turuncu,
    fontWeight: YAZI.kalin,
  },
  listeBos: {
    color: RENKLER.metinGri,
    padding: BOSLUK.md,
    textAlign: 'center',
  },

  // Şifre
  sifreKutu: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RENKLER.lacivert,
    borderWidth: 1,
    borderColor: RENKLER.kartKenari,
    borderRadius: RADIUS.md,
    minHeight: 50,
  },
  sifreInput: {
    flex: 1,
    color: RENKLER.metinBeyaz,
    fontSize: YAZI.md,
    paddingHorizontal: BOSLUK.lg,
    paddingVertical: BOSLUK.md,
  },
  sifreGozBtn: {
    paddingHorizontal: BOSLUK.md,
    paddingVertical: BOSLUK.sm,
  },
  sifreGozIkon: { fontSize: 18 },

  // Hata
  hataKutu: {
    backgroundColor: `${RENKLER.hata}20`,
    borderWidth: 1,
    borderColor: RENKLER.hata,
    borderRadius: RADIUS.md,
    padding: BOSLUK.md,
    marginBottom: BOSLUK.md,
  },
  hataMetin: {
    color: RENKLER.hata,
    fontSize: YAZI.sm,
  },

  // Giriş butonu
  girisBtn: {
    backgroundColor: RENKLER.turuncu,
    borderRadius: RADIUS.md,
    paddingVertical: BOSLUK.lg,
    alignItems: 'center',
    marginTop: BOSLUK.sm,
    ...GOLGE.turuncu,
  },
  girisBtnDevre: {
    opacity: 0.7,
  },
  girisBtnMetin: {
    color: RENKLER.beyaz,
    fontSize: YAZI.md,
    fontWeight: YAZI.extraKalin,
    letterSpacing: 2,
  },

  // Alt bilgi
  altBilgi: {
    color: RENKLER.metinGri,
    fontSize: YAZI.xs,
    textAlign: 'center',
    marginTop: BOSLUK.xl,
    lineHeight: 18,
  },
  yoneticiToggleMetin: {
    color: RENKLER.turuncu,
    fontSize: YAZI.sm,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: BOSLUK.lg,
    textDecorationLine: 'underline',
  }
});
