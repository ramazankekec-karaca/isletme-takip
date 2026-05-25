import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { RENKLER, YAZI } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import AnaScreen from '../screens/AnaScreen';
import PlanlaScreen from '../screens/PlanlaScreen';
import RaporlarScreen from '../screens/RaporlarScreen';
import OgrenciDetayScreen from '../screens/OgrenciDetayScreen';
import AdminDashboard from '../screens/admin/AdminDashboard';
import TeacherManagementScreen from '../screens/admin/TeacherManagementScreen';
import SchoolManagementScreen from '../screens/admin/SchoolManagementScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Giriş yapılmamışsa gösterilen navigasyon
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

// Alt Menü Navigasyonu
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: RENKLER.lacivert,
        },
        headerTintColor: RENKLER.metinBeyaz,
        headerTitleStyle: {
          fontWeight: YAZI.kalin,
          fontSize: YAZI.lg,
        },
        headerTitleAlign: 'center',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Anasayfa') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Planla') {
            iconName = focused ? 'format-list-bulleted' : 'format-list-bulleted';
          } else if (route.name === 'Raporlar') {
            iconName = focused ? 'chart-bar' : 'chart-bar';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: RENKLER.turuncu,
        tabBarInactiveTintColor: RENKLER.metinGri,
        tabBarStyle: {
          backgroundColor: RENKLER.kart,
          borderTopWidth: 1,
          borderTopColor: RENKLER.lacivertOrta,
          paddingBottom: 5,
          height: 60,
        },
      })}
    >
      <Tab.Screen 
        name="Anasayfa" 
        component={AnaScreen} 
        options={{ title: 'İşletmede Mesleki Eğitim' }} 
      />
      <Tab.Screen 
        name="Planla" 
        component={PlanlaScreen} 
        options={{ title: 'Planla' }} 
      />
      <Tab.Screen 
        name="Raporlar" 
        component={RaporlarScreen} 
        options={{ title: 'Raporlar' }} 
      />
    </Tab.Navigator>
  );
}

// Ana Uygulama Navigasyonu (Tabs + Detay Sayfaları)
function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: RENKLER.lacivertAcik,
        },
        headerTintColor: RENKLER.metinBeyaz,
        headerTitleStyle: {
          fontWeight: YAZI.kalin,
          fontSize: YAZI.lg,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: RENKLER.lacivert,
        },
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OgrenciDetay"
        component={OgrenciDetayScreen}
        options={({ route }) => ({
          title: route.params?.ogrenci?.ad_soyad || 'Öğrenci Detayı',
          headerBackTitle: 'Geri',
        })}
      />
    </Stack.Navigator>
  );
}

// Yönetici (Admin) Navigasyonu
function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: RENKLER.lacivertAcik },
        headerTintColor: RENKLER.metinBeyaz,
        headerTitleStyle: { fontWeight: YAZI.kalin, fontSize: YAZI.lg },
        contentStyle: { backgroundColor: RENKLER.lacivert },
      }}
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ title: 'Yönetici Paneli' }} />
      <Stack.Screen name="TeacherManagement" component={TeacherManagementScreen} options={{ title: 'Öğretmen Yönetimi' }} />
      <Stack.Screen name="SchoolManagement" component={SchoolManagementScreen} options={{ title: 'Okul Yönetimi' }} />
      <Stack.Screen name="TeacherView" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="OgrenciDetay"
        component={OgrenciDetayScreen}
        options={({ route }) => ({
          title: route.params?.ogrenci?.ad_soyad || 'Öğrenci Detayı',
          headerBackTitle: 'Geri',
        })}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { kullanici, yukleniyor } = useAuth();

  if (yukleniyor) {
    return (
      <View style={{ flex: 1, backgroundColor: RENKLER.lacivert, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={RENKLER.turuncu} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!kullanici ? (
        <AuthStack />
      ) : kullanici.rol === 'admin' ? (
        <AdminStack />
      ) : (
        <AppStack />
      )}
    </NavigationContainer>
  );
}
