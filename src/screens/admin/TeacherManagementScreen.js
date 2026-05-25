import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Modal, Alert, Platform } from 'react-native';
import { RENKLER, YAZI } from '../../theme';
import { adminAPI } from '../../api/client';

export default function TeacherManagementScreen() {
  const [ogretmenler, setOgretmenler] = useState([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  
  const [yeniAd, setYeniAd] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');

  // Düzenleme Modalı
  const [modalVisible, setModalVisible] = useState(false);
  const [seciliOgretmen, setSeciliOgretmen] = useState(null);
  
  const [editAd, setEditAd] = useState('');
  const [editTel, setEditTel] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSifre, setEditSifre] = useState('');

  useEffect(() => {
    fetchOgretmenler();
  }, []);

  const fetchOgretmenler = async () => {
    try {
      const res = await adminAPI.ogretmenler();
      const sorted = res.data.sort((a, b) => (a.ad_soyad || '').localeCompare(b.ad_soyad || '', 'tr'));
      setOgretmenler(sorted);
    } catch (error) {
      alert('Öğretmenler yüklenemedi.');
    } finally {
      setYukleniyor(false);
    }
  };

  const ekleOgretmen = async () => {
    if (!yeniAd || !yeniSifre) return alert('Ad ve şifre zorunludur.');
    try {
      await adminAPI.ogretmenEkle({ ad_soyad: yeniAd, sifre: yeniSifre });
      setYeniAd('');
      setYeniSifre('');
      fetchOgretmenler();
    } catch (error) {
      alert('Eklerken hata oluştu.');
    }
  };

  const temizleOgretmenler = () => {
    if (Platform.OS === 'web') {
      const confirmResult = window.confirm("Yönetici dışındaki TÜM öğretmenleri silmek istediğinize emin misiniz? Öğrenciler geçici olarak Yönetici'ye atanacaktır.");
      if (confirmResult) {
        onTemizleConfirm();
      }
    } else {
      Alert.alert(
        "Uyarı",
        "Yönetici dışındaki TÜM öğretmenleri silmek istediğinize emin misiniz? Öğrenciler geçici olarak Yönetici'ye atanacaktır.",
        [
          { text: "İptal", style: "cancel" },
          { 
            text: "Evet, Temizle", 
            style: "destructive",
            onPress: onTemizleConfirm
          }
        ]
      );
    }
  };

  const onTemizleConfirm = async () => {
    try {
      setYukleniyor(true);
      const res = await adminAPI.ogretmenleriTemizle();
      alert(res.message || "Öğretmenler temizlendi.");
      fetchOgretmenler();
    } catch (error) {
      alert('Temizleme sırasında hata oluştu.');
      setYukleniyor(false);
    }
  };

  const yetkiDegistir = async (ogretmen) => {
    const yeniDurum = ogretmen.yetki_durumu === 1 ? 0 : 1;
    try {
      await adminAPI.ogretmenGuncelle(ogretmen.id, { yetki_durumu: yeniDurum });
      fetchOgretmenler();
    } catch (error) {
      alert('Yetki güncellenemedi.');
    }
  };

  const ogretmenDuzenleAc = (ogretmen) => {
    setSeciliOgretmen(ogretmen);
    setEditAd(ogretmen.ad_soyad || '');
    setEditTel(ogretmen.telefon || '');
    setEditEmail(ogretmen.email || '');
    setEditSifre(''); // Şifre değiştirilmeyecekse boş kalsın
    setModalVisible(true);
  };

  const kaydetOgretmen = async () => {
    if (!seciliOgretmen) return;
    try {
      const guncelVeri = {
        ad_soyad: editAd,
        telefon: editTel,
        email: editEmail,
      };
      if (editSifre) {
        guncelVeri.sifre = editSifre;
      }
      await adminAPI.ogretmenGuncelle(seciliOgretmen.id, guncelVeri);
      setModalVisible(false);
      fetchOgretmenler();
    } catch (error) {
      alert('Güncelleme sırasında hata oluştu.');
    }
  };

  if (yukleniyor) return <ActivityIndicator size="large" color={RENKLER.turuncu} style={{ marginTop: 50 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Öğretmen Yönetimi</Text>
        <TouchableOpacity style={styles.temizleButon} onPress={temizleOgretmenler}>
          <Text style={styles.temizleMetin}>Tümünü Temizle</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
        <TextInput
          style={[styles.input, { marginBottom: 0 }]}
          placeholder="Öğretmen ara..."
          value={aramaMetni}
          onChangeText={setAramaMetni}
        />
      </View>


      <FlatList
        data={ogretmenler.filter(o => o.ad_soyad && o.ad_soyad.toLocaleLowerCase('tr').includes(aramaMetni.toLocaleLowerCase('tr')))}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.kart}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ad}>{item.ad_soyad}</Text>
              <Text style={styles.detay}>Rol: {item.rol}</Text>
              <Text style={styles.detay}>Yetki: {item.yetki_durumu === 1 ? 'Aktif' : 'Kısıtlanmış'}</Text>
              {item.telefon ? <Text style={styles.detay}>Tel: {item.telefon}</Text> : null}
              {item.email ? <Text style={styles.detay}>Email: {item.email}</Text> : null}
            </View>
            <View style={styles.aksiyonKutusu}>
              <TouchableOpacity 
                style={[styles.yetkiButon, { backgroundColor: item.yetki_durumu === 1 ? RENKLER.hata : RENKLER.basari }]} 
                onPress={() => yetkiDegistir(item)}
              >
                <Text style={styles.yetkiMetin}>{item.yetki_durumu === 1 ? 'Kısıtla' : 'Yetki Ver'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.duzenleButon} onPress={() => ogretmenDuzenleAc(item)}>
                <Text style={styles.duzenleMetin}>Düzenle</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* DÜZENLEME MODALI */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalArkaplan}>
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>Öğretmen Bilgilerini Düzenle</Text>
            
            <Text style={styles.label}>Ad Soyad</Text>
            <TextInput style={styles.modalInput} value={editAd} onChangeText={setEditAd} />

            <Text style={styles.label}>Telefon</Text>
            <TextInput style={styles.modalInput} value={editTel} onChangeText={setEditTel} keyboardType="phone-pad" />

            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.modalInput} value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" />

            <Text style={styles.label}>Yeni Şifre (Boş bırakılırsa değişmez)</Text>
            <TextInput style={styles.modalInput} value={editSifre} onChangeText={setEditSifre} secureTextEntry />

            <View style={styles.modalButonlar}>
              <TouchableOpacity style={styles.modalIptal} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalIptalMetin}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalKaydet} onPress={kaydetOgretmen}>
                <Text style={styles.modalKaydetMetin}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: RENKLER.arkaplan, padding: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: RENKLER.metin },
  temizleButon: { backgroundColor: RENKLER.hata, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
  temizleMetin: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  ekleKutusu: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 10, backgroundColor: '#fff' },
  buton: { backgroundColor: RENKLER.turuncu, padding: 12, borderRadius: 8, alignItems: 'center' },
  butonMetin: { color: '#fff', fontWeight: 'bold' },
  kart: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  ad: { fontSize: 16, fontWeight: 'bold' },
  detay: { fontSize: 12, color: '#666', marginTop: 3 },
  aksiyonKutusu: { flexDirection: 'column', gap: 10 },
  yetkiButon: { padding: 8, borderRadius: 5, alignItems: 'center', width: 80 },
  yetkiMetin: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  duzenleButon: { padding: 8, borderRadius: 5, backgroundColor: '#3498db', alignItems: 'center', width: 80 },
  duzenleMetin: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  
  modalArkaplan: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalKutu: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '90%', elevation: 5 },
  modalBaslik: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  label: { fontSize: 12, color: '#666', marginBottom: 5, marginTop: 10 },
  modalInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 14 },
  modalButonlar: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 },
  modalIptal: { padding: 12, borderRadius: 8, backgroundColor: '#eee', flex: 1, marginRight: 10, alignItems: 'center' },
  modalIptalMetin: { color: '#333', fontWeight: 'bold' },
  modalKaydet: { padding: 12, borderRadius: 8, backgroundColor: RENKLER.turuncu, flex: 1, marginLeft: 10, alignItems: 'center' },
  modalKaydetMetin: { color: '#fff', fontWeight: 'bold' }
});
