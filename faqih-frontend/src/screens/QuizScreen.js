// src/screens/QuizScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, ImageBackground, ActivityIndicator } from 'react-native';
import axios from 'axios';

// GÜNCEL IP ADRESİN:
const API_BASE = 'http://192.168.1.103:8000/api/unit/';

export default function QuizScreen({ route, navigation }) {
  const { unitId, unitTitle } = route.params;
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(""); 

  useEffect(() => {
    fetchQuestions();
    navigation.setOptions({ title: unitTitle });
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await axios.get(`${API_BASE}${unitId}/`);
      setQuestions(response.data.questions);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
      Alert.alert("Hata", "Sorular yüklenemedi. IP adresini kontrol et.");
    }
  };

  const handleOptionSelect = (optionId) => {
    if (isAnswerChecked) return;
    setSelectedOption(optionId);
    
    // Hotspot modundaysa seçer seçmez kontrol etsin (daha havalı)
    const currentQuestion = questions[currentIndex];
    if (currentQuestion.question_type === 'hotspot') {
        checkAnswer(optionId);
    }
  };

  const checkAnswer = (instantOption = null) => {
    setIsAnswerChecked(true);
    const currentQuestion = questions[currentIndex];
    const answerToCheck = instantOption || selectedOption;
    
    if (answerToCheck === currentQuestion.correct_option) {
      setFeedbackMsg("✅ " + (currentQuestion.explanation || "Doğru!"));
    } else {
      setFeedbackMsg("❌ Yanlış! " + (currentQuestion.explanation || "Tekrar dene."));
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setIsAnswerChecked(false);
      setFeedbackMsg("");
    } else {
      Alert.alert("Tebrikler!", "Üniteyi tamamladın!", [
        { text: "Çıkış", onPress: () => navigation.goBack() }
      ]);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#58CC02"/></View>;
  if (!questions || questions.length === 0) return <View style={styles.center}><Text>Soru bulunamadı.</Text></View>;

  const currentQuestion = questions[currentIndex];
  
  // Soru Tipini Anlama
  const isImageSelection = currentQuestion.question_type === 'image_selection';
  const isHotspot = currentQuestion.question_type === 'hotspot';

  // Hotspot verisini hazırla
  let hotspotData = null;
  if (isHotspot) {
    hotspotData = currentQuestion.options; 
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* İlerleme Çubuğu */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]} />
      </View>

      <Text style={styles.questionText}>{currentQuestion.text}</Text>

      {/* --- HOTSPOT MODU (Vücut Dokunma) --- */}
      {isHotspot && hotspotData && (
        <View style={styles.hotspotContainer}>
          <ImageBackground 
            source={{ uri: hotspotData.background_image }} 
            style={styles.hotspotImage}
            resizeMode="contain"
          >
            {hotspotData.hotspots.map((spot) => {
              const isSelected = selectedOption === spot.id;
              const isCorrect = currentQuestion.correct_option === spot.id;
              
              // Renk Ayarları: Normalde görünmez, seçilince renklenir
              let borderCol = 'transparent'; 
              let bgCol = 'transparent';

              if (isAnswerChecked) {
                 if (spot.id === currentQuestion.correct_option) {
                    // Doğru olan yeri her zaman yeşil yak (ipucu olsun diye)
                    borderCol = '#58CC02'; 
                    bgCol = 'rgba(88, 204, 2, 0.3)';
                 } else if (isSelected && !isCorrect) {
                    // Yanlış seçtiyse kırmızı yak
                    borderCol = '#FF4B4B';
                    bgCol = 'rgba(255, 75, 75, 0.3)';
                 }
              }

              // Geliştirirken yerleri görmek istersen bunu aç:
              // borderCol = 'blue'; borderWidth = 1;

              return (
                <TouchableOpacity
                  key={spot.id}
                  style={[styles.hotspotTouch, spot.style, { borderColor: borderCol, backgroundColor: bgCol }]}
                  onPress={() => handleOptionSelect(spot.id)}
                />
              );
            })}
          </ImageBackground>
        </View>
      )}

      {/* --- RESİM SEÇME MODU (Su Çeşitleri) --- */}
      {isImageSelection && (
        <View style={styles.imageGrid}>
          {currentQuestion.options.map((opt) => {
            const isSelected = selectedOption === opt.id;
            const isCorrect = currentQuestion.correct_option === opt.id;
            let borderColor = '#E5E5E5'; 
            let bgColor='#fff';

            if (isAnswerChecked) {
              if (isSelected && isCorrect) { borderColor='#58CC02'; bgColor='#D7FFB8'; }
              else if (isSelected && !isCorrect) { borderColor='#FF4B4B'; bgColor='#FFDFE0'; }
              else if (!isSelected && isCorrect) { borderColor='#58CC02'; }
            } else if (isSelected) {
               borderColor='#1CB0F6'; bgColor='#E2F0FF';
            }

            return (
              <TouchableOpacity key={opt.id} style={[styles.imageCard, {borderColor, backgroundColor: bgColor}]} onPress={() => handleOptionSelect(opt.id)}>
                <Image source={{ uri: opt.image }} style={styles.optionImage} />
                <Text style={styles.imageText}>{opt.text}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {/* --- KLASİK METİN MODU --- */}
      {!isHotspot && !isImageSelection && (
        <View style={styles.listContainer}>
           {currentQuestion.options.map((opt) => {
             const isSelected = selectedOption === opt.id;
             let borderColor = isSelected ? '#1CB0F6' : '#E5E5E5';
             if (isAnswerChecked && opt.id === currentQuestion.correct_option) borderColor = '#58CC02';
             
             return (
               <TouchableOpacity key={opt.id} style={[styles.textCard, {borderColor}]} onPress={() => handleOptionSelect(opt.id)}>
                  <Text style={styles.optionText}>{opt.text}</Text>
               </TouchableOpacity>
             )
           })}
        </View>
      )}

      {/* GERİ BİLDİRİM KUTUSU */}
      {isAnswerChecked && (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackText}>{feedbackMsg}</Text>
        </View>
      )}

      {/* BUTON (Hotspot dışındakiler için) */}
      {(!isHotspot || isAnswerChecked) && (
        <TouchableOpacity 
          style={[styles.checkButton, { backgroundColor: (selectedOption || isAnswerChecked) ? '#58CC02' : '#E5E5E5' }]}
          disabled={!selectedOption && !isAnswerChecked}
          onPress={isAnswerChecked ? nextQuestion : () => checkAnswer()}
        >
          <Text style={styles.checkButtonText}>{isAnswerChecked ? "DEVAM ET" : "KONTROL ET"}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progressBarBg: { height: 15, backgroundColor: '#E5E5E5', borderRadius: 10, marginBottom: 20 },
  progressBarFill: { height: '100%', backgroundColor: '#58CC02', borderRadius: 10 },
  questionText: { fontSize: 20, fontWeight: 'bold', color: '#4B4B4B', marginBottom: 20, textAlign: 'center' },
  
  // HOTSPOT STİLLERİ
  hotspotContainer: { width: '100%', height: 400, marginBottom: 20 },
  hotspotImage: { width: '100%', height: '100%' },
  hotspotTouch: { position: 'absolute', borderWidth: 3, borderRadius: 15 },

  // DİĞER STİLLER
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  imageCard: { width: '48%', aspectRatio: 1, marginBottom: 15, borderWidth: 3, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  optionImage: { width: '70%', height: '60%', resizeMode: 'contain' },
  imageText: { fontWeight: 'bold', marginTop: 5 },
  
  listContainer: { width: '100%' },
  textCard: { padding: 20, borderWidth: 2, borderRadius: 15, marginBottom: 10 },
  optionText: { fontSize: 18 },

  feedbackBox: { padding: 15, backgroundColor: '#f0f0f0', borderRadius: 10, marginBottom: 20, marginTop: 10 },
  feedbackText: { fontSize: 16, color: '#333', fontStyle: 'italic' },
  
  checkButton: { marginTop: 20, padding: 15, borderRadius: 15, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.2)' },
  checkButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});