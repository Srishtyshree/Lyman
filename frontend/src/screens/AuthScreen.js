import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './AuthScreen.styles';
import { supabase } from '../utils/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Ensure the auth session closes correctly when redirecting back
WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export const AuthScreen = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Background Gradient Animation setup
  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(bgAnim, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bgAnim]);

  // Interpolate the animation value to shift the giant background view
  const translateX = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -width],
  });
  
  const translateY = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height / 2],
  });

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    if (!isLogin && (!firstName || !lastName)) {
      setError('Please fill in your first and last name.');
      return;
    }

    setLoading(true);
    setError(null);
    let authError = null;

    if (isLogin) {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      authError = err;
    } else {
      const { data, error: err } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });
      authError = err;
      if (!err && data?.session === null) {
        Alert.alert('Verify Email', 'Account created! Please check your email to verify your account before logging in.');
        setIsLogin(true);
      }
    }

    if (authError) {
      setError(authError.message);
    }
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const redirectUrl = Linking.createURL(''); // Creates the correct deep link URL for Expo Go
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      
      // If we got an OAuth URL back from Supabase, let's open it
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success') {
          // Supabase passes the access_token and refresh_token in the URL fragment (after the #)
          const fragment = result.url.split('#')[1];
          if (fragment) {
            const params = fragment.split('&').reduce((acc, current) => {
              const [key, value] = current.split('=');
              acc[key] = value;
              return acc;
            }, {});
            
            if (params.access_token && params.refresh_token) {
              await supabase.auth.setSession({
                access_token: params.access_token,
                refresh_token: params.refresh_token,
              });
            } else if (params.error_description) {
              setError(decodeURIComponent(params.error_description).replace(/\+/g, ' '));
            }
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { overflow: 'hidden' }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Animated Gradient Background */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: width * 3,
          height: height * 3,
          transform: [{ translateX }, { translateY }]
        }}
      >
        <LinearGradient
          colors={['#FFFFFF', '#FFF5F0', '#FFD1B3', '#FFF1EB', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color="#2C2522" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Layman</Text>
        <Text style={styles.headerBlack}>{isLogin ? 'Authentication' : 'Create Account'}</Text>
        <Text style={styles.subHeader}>
          {isLogin ? 'Sign in to continue your cognitive comfort journey.' : 'Sign up to start your cognitive comfort journey.'}
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.card}>
          {!isLogin && (
            <>
              <View style={styles.inputWrapper}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>First Name</Text>
                </View>
                <View style={styles.inputField}>
                  <Ionicons name="person" size={20} color="#655A55" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="John"
                    placeholderTextColor="#A09690"
                    value={firstName}
                    onChangeText={(text) => { setFirstName(text); setError(null); }}
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Last Name</Text>
                </View>
                <View style={styles.inputField}>
                  <Ionicons name="person" size={20} color="#655A55" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Doe"
                    placeholderTextColor="#A09690"
                    value={lastName}
                    onChangeText={(text) => { setLastName(text); setError(null); }}
                  />
                </View>
              </View>
            </>
          )}

          <View style={styles.inputWrapper}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Email Address</Text>
            </View>
            <View style={styles.inputField}>
              <Ionicons name="mail" size={20} color="#655A55" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#A09690"
                value={email}
                onChangeText={(text) => { setEmail(text); setError(null); }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Password</Text>
              {isLogin && (
                <TouchableOpacity>
                  <Text style={styles.forgotText}>Forgot?</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.inputField}>
              <Ionicons name="lock-closed" size={20} color="#655A55" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#A09690"
                value={password}
                onChangeText={(text) => { setPassword(text); setError(null); }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#655A55" style={styles.eyeIcon} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.buttonPrimary} 
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonPrimaryText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity style={styles.socialButton} onPress={signInWithGoogle} disabled={loading}>
              <Ionicons name="logo-google" size={18} color="#2C2522" style={{marginRight: 8}} />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </Text>
          <TouchableOpacity onPress={() => { setIsLogin(!isLogin); setError(null); }}>
            <Text style={styles.footerLink}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

