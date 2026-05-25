import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Alert, Linking, Modal, Platform 
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { ogrenciAPI, raporAPI } from '../api/client';
import { RENKLER, BOSLUK, RADIUS, YAZI, GOLGE } from '../theme';

export default function RaporlarScreen() {
  const [isletmeler, setIsletmeler] = useState({});
  const [seciliOgrenciler, setSeciliOgrenciler] = useState([]);
  const [genisleyenIsletme, setGenisleyenIsletme] = useState(null);
  
  const [yukleniyor, setYukleniyor] = useState(true);
  const [raporUretiliyor, setRaporUretiliyor] = useState(false);
  const [hazirRapor, setHazirRapor] = useState(null);

  useEffect(() => {
    veriGetir();
  }, []);

  const veriGetir = async () => {
    try {
      const res = await ogrenciAPI.listele();
      const ogrenciler = res.data || [];
      
      // İşletmelere göre grupla
      const gruplu = {};
      ogrenciler.forEach(ogr => {
        const isletmeAdi = ogr.isletme_adi || 'Atanmamış';
        if (!gruplu[isletmeAdi]) gruplu[isletmeAdi] = [];
        gruplu[isletmeAdi].push(ogr);
      });
      setIsletmeler(gruplu);
    } catch (error) {
      console.error(error);
    } finally {
      setYukleniyor(false);
    }
  };

  const ogrenciSecToggle = (id) => {
    setSeciliOgrenciler(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const isletmeSecToggle = (isletmeAdi) => {
    setGenisleyenIsletme(prev => prev === isletmeAdi ? null : isletmeAdi);
  };

  const indir = (url) => {
    if (!url) return;
    const fullUrl = `http://localhost:3000${url}`;
    Linking.openURL(fullUrl);
  };

  const ogrenciRaporuAl = async () => {
    if (seciliOgrenciler.length === 0) {
      Alert.alert('Uyarı', 'Lütfen en az bir öğrenci seçin');
      return;
    }
    
    try {
      setRaporUretiliyor(true);
      const res = await raporAPI.ogrenciDegerlendirme(seciliOgrenciler);
      setHazirRapor({ ...res, baslik: 'Öğrenci Değerlendirme Formu' });
      setSeciliOgrenciler([]);
    } catch (error) {
      Alert.alert('Hata', 'Rapor üretilirken bir sorun oluştu.');
    } finally {
      setRaporUretiliyor(false);
    }
  };

  const ogretmenRaporuAl = async () => {
    if (seciliOgrenciler.length === 0) {
      Alert.alert('Uyarı', 'Lütfen en az bir öğrenci seçin');
      return;
    }
    
    try {
      setRaporUretiliyor(true);
      const res = await raporAPI.ogretmenRaporu(seciliOgrenciler);
      setHazirRapor({ ...res, baslik: 'Koordinatör Öğretmen Raporu' });
    } catch (error) {
      Alert.alert('Hata', 'Rapor üretilirken bir sorun oluştu.');
    } finally {
      setRaporUretiliyor(false);
    }
  };

  const ayrilmaSablonuAl = async () => {
    try {
      setRaporUretiliyor(true);
      const res = await raporAPI.ayrilmaSablonu();
      setHazirRapor({ ...res, baslik: 'İşyerinden Ayrılma Formu (Sözleşme Fesih)' });
    } catch (error) {
      Alert.alert('Hata', 'Şablon alınırken bir sorun oluştu.');
    } finally {
      setRaporUretiliyor(false);
    }
  };

  if (yukleniyor) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={RENKLER.turuncu} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.pageTitle}>Belge İşlemleri</Text>
        <Text style={{color: RENKLER.metinGri, marginBottom: BOSLUK.md}}>
          Rapor üretmek istediğiniz öğrencileri seçin. Ardından alttaki menüden Öğrenci Değerlendirme Formu veya Öğretmen Raporu üretebilirsiniz.
        </Text>

        <View style={styles.listeContainer}>
          {Object.keys(isletmeler).sort((a, b) => a.localeCompare(b, 'tr')).map(isletmeAdi => {
            const isletmeOgrencileri = isletmeler[isletmeAdi];
            const acikMi = genisleyenIsletme === isletmeAdi;
            const seciliSayisi = isletmeOgrencileri.filter(ogr => seciliOgrenciler.includes(ogr.id)).length;
            
            return (
              <View key={isletmeAdi} style={styles.isletmeGrup}>
                <TouchableOpacity 
                  style={styles.isletmeBaslik} 
                  onPress={() => isletmeSecToggle(isletmeAdi)}
                >
                  <Icon 
                    name="domain" 
                    size={24} 
                    color={RENKLER.turuncu} 
                  />
                  <View style={{marginLeft: BOSLUK.sm, flex: 1}}>
                    <Text style={styles.isletmeAdText}>{isletmeAdi}</Text>
                    <Text style={styles.isletmeDetayText}>
                      {isletmeOgrencileri.length} Öğrenci {seciliSayisi > 0 ? `(${seciliSayisi} Seçildi)` : ''}
                    </Text>
                  </View>
                  <Icon 
                    name={acikMi ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={RENKLER.metinGri} 
                  />
                </TouchableOpacity>

                {acikMi && (
                  <View style={styles.ogrenciListesi}>
                    {[...isletmeOgrencileri].sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr')).map(ogr => {
                      const secili = seciliOgrenciler.includes(ogr.id);
                      return (
                        <TouchableOpacity 
                          key={ogr.id} 
                          style={[styles.ogrenciItem, secili && styles.ogrenciItemSecili]}
                          onPress={() => ogrenciSecToggle(ogr.id)}
                        >
                          <Icon 
                            name={secili ? "check-box-outline" : "checkbox-blank-outline"} 
                            size={24} 
                            color={secili ? RENKLER.basari : RENKLER.metinGri} 
                          />
                          <View style={{marginLeft: BOSLUK.sm, flex: 1}}>
                            <Text style={styles.ogrenciAd}>{ogr.ad_soyad}</Text>
                            <Text style={styles.ogrenciDetay}>{ogr.sube} - {ogr.dal}</Text>
                          </View>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                )}
              </View>
            )
          })}
        </View>

      </ScrollView>

      {/* ALT BAR */}
      {seciliOgrenciler.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: BOSLUK.sm}}>
            <Text style={styles.bottomBarTitle}>{seciliOgrenciler.length} Öğrenci Seçildi</Text>
            <TouchableOpacity onPress={() => setSeciliOgrenciler([])}>
              <Text style={{color: RENKLER.metinGri, fontWeight: 'bold'}}>Seçimi İptal Et</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.bottomButtonsRow}>
            <TouchableOpacity 
              style={[styles.raporUretBtn, {flex: 1, marginRight: BOSLUK.sm}, raporUretiliyor && {opacity: 0.7}]} 
              onPress={ogrenciRaporuAl}
              disabled={raporUretiliyor}
            >
              <Icon name="file-account" size={20} color={RENKLER.beyaz} style={{marginRight: 8}} />
              <Text style={styles.raporUretBtnText}>Değerlendirme Formu</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.raporUretBtn, {flex: 1, backgroundColor: RENKLER.bilgi}, raporUretiliyor && {opacity: 0.7}]} 
              onPress={ogretmenRaporuAl}
              disabled={raporUretiliyor}
            >
              <Icon name="file-document-edit" size={20} color={RENKLER.beyaz} style={{marginRight: 8}} />
              <Text style={styles.raporUretBtnText}>Öğretmen Raporu</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ marginTop: BOSLUK.sm }}>
            <TouchableOpacity 
              style={[styles.raporUretBtn, {backgroundColor: RENKLER.hata}, raporUretiliyor && {opacity: 0.7}]} 
              onPress={ayrilmaSablonuAl}
              disabled={raporUretiliyor}
            >
              <Icon name="file-export" size={20} color={RENKLER.beyaz} style={{marginRight: 8}} />
              <Text style={styles.raporUretBtnText}>İşyerinden Ayrılma Formu (Sözleşme Fesih)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* RAPOR ÖNİZLEME MODALI */}
      <Modal visible={!!hazirRapor} animationType="slide" presentationStyle="formSheet">
        {hazirRapor && (
          <View style={{flex: 1, backgroundColor: RENKLER.arkaplan}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{hazirRapor.baslik}</Text>
              <TouchableOpacity onPress={() => setHazirRapor(null)}>
                <Icon name="close" size={28} color={RENKLER.metinBeyaz} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {Platform.OS === 'web' && hazirRapor.pdf_url ? (
                <iframe 
                  src={`http://localhost:3000${hazirRapor.pdf_url}`} 
                  style={{flex: 1, width: '100%', height: '100%', border: 'none'}} 
                  title="PDF Önizleme"
                />
              ) : (
                <View style={styles.center}>
                  <Icon name="file-document-check-outline" size={64} color={RENKLER.basari} />
                  <Text style={{color: RENKLER.metinBeyaz, fontSize: YAZI.lg, marginTop: BOSLUK.md}}>Rapor Başarıyla Üretildi!</Text>
                  <Text style={{color: RENKLER.metinGri, textAlign: 'center', marginTop: BOSLUK.sm}}>
                    Raporu indirmek için aşağıdaki butonları kullanabilirsiniz.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalFooter}>
              {hazirRapor.pdf_url && (
                <TouchableOpacity 
                  style={[styles.modalBtn, {backgroundColor: RENKLER.hata}]} 
                  onPress={() => indir(hazirRapor.pdf_url)}
                >
                  <Icon name="file-pdf-box" size={20} color={RENKLER.beyaz} />
                  <Text style={styles.modalBtnText}>PDF</Text>
                </TouchableOpacity>
              )}
              
              {hazirRapor.word_url && (
                <TouchableOpacity 
                  style={[styles.modalBtn, {backgroundColor: '#2b579a'}]} 
                  onPress={() => indir(hazirRapor.word_url)}
                >
                  <Icon name="file-word-box" size={20} color={RENKLER.beyaz} />
                  <Text style={styles.modalBtnText}>Word</Text>
                </TouchableOpacity>
              )}
              {(hazirRapor.xlsx_url || hazirRapor.excel_url) && (
                <TouchableOpacity 
                  style={[styles.modalBtn, {backgroundColor: RENKLER.basari}]} 
                  onPress={() => indir(hazirRapor.xlsx_url || hazirRapor.excel_url)}
                >
                  <Icon name="file-excel-box" size={20} color={RENKLER.beyaz} />
                  <Text style={styles.modalBtnText}>Excel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RENKLER.lacivert,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: BOSLUK.md,
    paddingBottom: 100,
  },
  pageTitle: {
    fontSize: YAZI.lg,
    color: RENKLER.metinBeyaz,
    fontWeight: 'bold',
    marginBottom: BOSLUK.xs,
    marginTop: BOSLUK.md,
  },
  genelKart: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RENKLER.kart,
    padding: BOSLUK.md,
    borderRadius: RADIUS.md,
    ...GOLGE,
  },
  kartBaslik: {
    color: RENKLER.metinBeyaz,
    fontSize: YAZI.md,
    fontWeight: 'bold',
  },
  kartAltMetin: {
    color: RENKLER.metinGri,
    fontSize: YAZI.sm,
    marginTop: 2,
  },
  indirBtn: {
    backgroundColor: RENKLER.turuncu,
    paddingHorizontal: BOSLUK.md,
    paddingVertical: BOSLUK.sm,
    borderRadius: RADIUS.sm,
  },
  indirBtnText: {
    color: RENKLER.beyaz,
    fontWeight: 'bold',
  },
  
  listeContainer: {
    backgroundColor: RENKLER.kart,
    borderRadius: RADIUS.md,
    padding: BOSLUK.sm,
    ...GOLGE,
  },
  isletmeGrup: {
    borderBottomWidth: 1,
    borderBottomColor: RENKLER.lacivertOrta,
  },
  isletmeBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: BOSLUK.sm,
    backgroundColor: RENKLER.lacivertAcik,
    borderRadius: RADIUS.sm,
    marginVertical: 4,
  },
  isletmeAdText: {
    color: RENKLER.metinBeyaz,
    fontSize: YAZI.md,
    fontWeight: 'bold',
  },
  isletmeDetayText: {
    color: RENKLER.turuncu,
    fontSize: YAZI.sm,
    marginTop: 2,
  },
  ogrenciListesi: {
    paddingLeft: BOSLUK.md,
    paddingBottom: BOSLUK.sm,
  },
  ogrenciItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: BOSLUK.sm,
    marginTop: 4,
    backgroundColor: RENKLER.lacivert,
    borderRadius: RADIUS.sm,
  },
  ogrenciItemSecili: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)', // Hafif yeşil arka plan
    borderColor: RENKLER.basari,
    borderWidth: 1,
  },
  ogrenciAd: {
    color: RENKLER.metinBeyaz,
    fontSize: YAZI.md,
  },
  ogrenciDetay: {
    color: RENKLER.metinGri,
    fontSize: YAZI.sm,
  },
  
  // ALT BAR
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: RENKLER.kart,
    padding: BOSLUK.md,
    borderTopWidth: 1,
    borderTopColor: RENKLER.lacivertOrta,
    ...GOLGE,
  },
  bottomBarTitle: {
    color: RENKLER.turuncu,
    fontWeight: 'bold',
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  raporUretBtn: {
    flexDirection: 'row',
    backgroundColor: RENKLER.basari,
    padding: BOSLUK.md,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  raporUretBtnText: {
    color: RENKLER.beyaz,
    fontWeight: 'bold',
    fontSize: 13,
  },
  
  // MODAL STYLES
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: BOSLUK.md,
    backgroundColor: RENKLER.lacivertOrta,
    borderBottomWidth: 1,
    borderBottomColor: RENKLER.kart,
  },
  modalTitle: {
    fontSize: YAZI.md,
    fontWeight: 'bold',
    color: RENKLER.metinBeyaz,
  },
  modalContent: {
    flex: 1,
    backgroundColor: RENKLER.lacivertAcik,
    justifyContent: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: BOSLUK.md,
    backgroundColor: RENKLER.kart,
    borderTopWidth: 1,
    borderTopColor: RENKLER.lacivertOrta,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: BOSLUK.md,
    borderRadius: RADIUS.md,
    marginHorizontal: BOSLUK.xs,
  },
  modalBtnText: {
    color: RENKLER.beyaz,
    fontWeight: 'bold',
    marginLeft: BOSLUK.xs,
  }
});
