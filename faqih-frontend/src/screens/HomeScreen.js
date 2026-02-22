// src/screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';

// GÜNCEL IP ADRESİN BURADA:
const API_URL = 'http://192.168.1.103:8000/api/categories/'; 

export default function HomeScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(API_URL);
      setCategories(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Hata:", error);
      setLoading(false);
    }
  };

  const renderUnit = (unit) => (
    <TouchableOpacity 
      key={unit.id}
      style={styles.unitCard} 
      onPress={() => navigation.navigate('Quiz', { unitId: unit.id, unitTitle: unit.title })}
    >
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>★</Text>
      </View>
      <Text style={styles.unitTitle}>{unit.title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#58CC02" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{item.title}</Text>
            {item.units.map(unit => renderUnit(unit))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  categorySection: { marginBottom: 30 },
  categoryTitle: { fontSize: 22, fontWeight: 'bold', color: '#4B4B4B', marginBottom: 15 },
  unitCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderWidth: 2, 
    borderColor: '#E5E5E5', 
    borderRadius: 15, 
    padding: 15, 
    marginBottom: 10,
    elevation: 2 
  },
  iconCircle: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#FFC800', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  iconText: { fontSize: 20, color: '#fff' },
  unitTitle: { fontSize: 18, fontWeight: '600', color: '#4B4B4B' },
});