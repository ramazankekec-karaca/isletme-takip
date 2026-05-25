import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { RENKLER, YAZI } from '../../theme';
import { adminAPI } from '../../api/client';

export default function AdminDashboard({ navigation }) {
  const { cikisYap } = useAuth();
  const [yukleniyor, setYukleniyor] = useState(false);
  
  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setYukleniyor(true);
    const formData = new FormData();
    formData.append('excelFile', file);

    try {
      const res = await adminAPI.syncExcel(formData);
      alert(res.message || 'Başarılı!');
    } catch (error) {
      console.error(error);
      alert('Yükleme sırasında hata oluştu.');
    } finally {
      setYukleniyor(false);
    }
  };

  const openFilePicker = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsm,.xlsx';
      input.onchange = handleExcelUpload;
      input.click();
    } else {
      Alert.alert("Bilgi", "Bu özellik şimdilik sadece web sürümünde aktiftir.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Yönetici (Admin) Paneli</Text>

      <View style={styles.grid}>
        <TouchableOpacity 
          style={styles.card} 
          onPress={() => navigation.navigate('TeacherManagement')}
        >
          <Text style={styles.cardTitle}>👨‍🏫 Öğretmenleri Yönet</Text>
          <Text style={styles.cardDesc}>Şifre sıfırlama, yetki aç/kapat, rol belirle.</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('SchoolManagement')}
        >
          <Text style={styles.cardTitle}>🏫 Okulları Yönet</Text>
          <Text style={styles.cardDesc}>Sisteme okul ekle veya çıkar.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={openFilePicker} disabled={yukleniyor}>
          {yukleniyor ? (
            <ActivityIndicator color={RENKLER.lacivert} />
          ) : (
            <>
              <Text style={styles.cardTitle}>🔄 Excel Verisi Güncelle</Text>
              <Text style={styles.cardDesc}>İŞLETME TAKİP.xlsm dosyasını yükleyip sistemi güncelle.</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('TeacherView')}
        >
          <Text style={styles.cardTitle}>👀 Öğretmen Görünümü</Text>
          <Text style={styles.cardDesc}>Tüm işletmeleri ve öğrencileri gör.</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={cikisYap}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RENKLER.lacivert,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    color: RENKLER.turuncu,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    maxWidth: 800,
  },
  card: {
    backgroundColor: RENKLER.kart,
    padding: 20,
    borderRadius: 12,
    width: 250,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardTitle: {
    color: RENKLER.metinBeyaz,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  cardDesc: {
    color: RENKLER.metinGri,
    fontSize: 14,
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 50,
    paddingVertical: 12,
    paddingHorizontal: 40,
    backgroundColor: 'red',
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
