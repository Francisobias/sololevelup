import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../firebase'; // Ensure this path is correct
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password');
      console.error('Email/Password Login Error:', err.message); // For debugging
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider); // Removed unused 'result'
      navigate('/dashboard');
    } catch (err) {
      setError('Google Sign-In failed');
      console.error('Google Sign-In Error:', err.message); // For debugging
      // Check specific Firebase errors
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Popup was closed by the user.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Popup request was cancelled.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Unauthorized domain. Please check Firebase settings.');
      }
    }
  };

  return (
    <div className="login-page">
      <video className="login-bg-video" autoPlay loop muted playsInline>
        <source src="/videos/dashboard-bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <motion.div 
        className="login-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <h2 className="login-title">Hunter Login</h2>
        <form className="login-form" onSubmit={handleLogin}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            className="login-input"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="login-input"
            required
          />
          <motion.button 
            type="submit" 
            className="login-button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Log In
          </motion.button>
        </form>

        <div className="google-section">
          <p className="or-text">OR</p>
          <motion.button
            onClick={handleGoogleLogin}
            className="google-button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img src="/icons/google-icon.svg" alt="Google" className="google-icon" />
            Continue with Google
          </motion.button>
        </div>

        {error && <p className="login-error">{error}</p>}

        <p className="login-register">
          Need an account? <Link to="/register">Register</Link>
        </p>
      </motion.div>
    </div>
  );
}

export default Login;