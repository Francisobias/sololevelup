// components/Dashboard.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Swal from 'sweetalert2';
import StatsChart from './StatsChart';
import HoloTerminal from './HoloTerminal';
import { motion, AnimatePresence } from 'framer-motion';
import './Dashboard.css';

// Constants
const DEFAULT_STATS = {
  strength: 0,
  stamina: 0,
  agility: 0,
  points: 0,
  level: 1,
  xp: 0,
};
const XP_PER_LEVEL = 100;

// Text-to-speech utility
const speak = (text, lang = 'en-US') => {
  if (window.speechSynthesis) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
};

// Time-based greeting
const getTimeBasedGreeting = (userName, userEmail) => {
  const name = userName || userEmail?.split('@')[0] || 'Anonymous';
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, Hunter ${name}, start your quest today!`;
  if (hour < 17) return `Good afternoon, Hunter ${name}, start your quest!`;
  return `Good evening, Hunter ${name}, start your quest!`;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const hasGreetedRef = useRef(false);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [achievements, setAchievements] = useState([]);
  const [levelUp, setLevelUp] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const capitalize = (name) => (name ? name.charAt(0).toUpperCase() + name.slice(1) : '');

  // Enable audio
  const enableAudio = useCallback(() => {
    if (!audioEnabled) {
      setAudioEnabled(true);
      const silentAudio = new Audio('/sounds/silent.mp3');
      silentAudio.play().catch(() => {
        Swal.fire({
          icon: 'info',
          title: 'Enable Audio',
          text: 'Interact with the page to enable audio feedback.',
          confirmButtonColor: '#00ffc8',
          background: '#1a1a1a',
          color: '#fff',
        });
      });
    }
  }, [audioEnabled]);

  // Load user stats and achievements
  const loadStats = useCallback(async (user) => {
    setIsLoading(true);
    setError(null);
    try {
      const userRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(userRef);
      const data = snapshot.exists() ? snapshot.data() : {};

      const validatedStats = {
        ...DEFAULT_STATS,
        strength: Number.isFinite(data.strength) ? data.strength : DEFAULT_STATS.strength,
        stamina: Number.isFinite(data.stamina) ? data.stamina : DEFAULT_STATS.stamina,
        agility: Number.isFinite(data.agility) ? data.agility : DEFAULT_STATS.agility,
        points: Number.isFinite(data.points) ? data.points : DEFAULT_STATS.points,
        level: Number.isFinite(data.level) ? data.level : DEFAULT_STATS.level,
        xp: Number.isFinite(data.xp) ? data.xp : DEFAULT_STATS.xp,
      };

      setStats(validatedStats);
      setUserName(capitalize(data.displayName || user.displayName || ''));
      setUserEmail(user.email || '');
      setAchievements(data.achievements || []);
      await updateDoc(userRef, validatedStats, { merge: true });

      if (!hasGreetedRef.current) {
        enableAudio();
        speak(getTimeBasedGreeting(validatedStats.displayName, user.email), 'en-US');
        hasGreetedRef.current = true;
      }
    } catch (err) {
      setError('Failed to load user data. Please try again.');
      console.error('Error loading stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enableAudio]);

  // Check and award achievements
  const checkAchievements = useCallback((newLevel, stats) => {
    const newAchievements = [...achievements];
    if (newLevel === 5 && !newAchievements.includes('Level 5 Master')) {
      newAchievements.push('Level 5 Master');
      speak('Congratulations! You’ve earned the Level 5 Master badge!', 'en-US');
    }
    if (stats.xp >= 500 && !newAchievements.includes('XP Champion')) {
      newAchievements.push('XP Champion');
      speak('Well done! You’ve earned the XP Champion badge!', 'en-US');
    }
    if (newAchievements.length > achievements.length) {
      setAchievements(newAchievements);
      updateDoc(doc(db, 'users', auth.currentUser.uid), { achievements: newAchievements });
    }
  }, [achievements]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      Swal.fire({
        icon: 'success',
        title: 'Logged Out',
        text: 'You have been successfully logged out.',
        confirmButtonColor: '#00ffc8',
        background: '#1a1a1a',
        color: '#fff',
      });
      navigate('/login');
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Logout Failed',
        text: 'An error occurred while logging out.',
        confirmButtonColor: '#ff0044',
        background: '#1a1a1a',
        color: '#fff',
      });
    }
  };

  // Handle date navigation
  const handleDateChange = useCallback((direction) => {
    enableAudio();
    const current = new Date(currentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (direction === 'prev') {
      const prevDay = new Date(current);
      prevDay.setDate(current.getDate() - 1);
      setCurrentDate(prevDay.toISOString().split('T')[0]);
      speak('Previous day selected', 'en-US');
    } else if (direction === 'next' && current < today) {
      const nextDay = new Date(current);
      nextDay.setDate(current.getDate() + 1);
      setCurrentDate(nextDay.toISOString().split('T')[0]);
      speak('Next day selected', 'en-US');
    }
  }, [currentDate, enableAudio]);

  // Handle stat upgrade
  const handleUpgradeStat = useCallback(async (statToUpgrade) => {
    if (stats.points <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Points',
        text: 'You have no available points to upgrade.',
        confirmButtonColor: '#00ffc8',
        background: '#1a1a1a',
        color: '#fff',
      });
      return;
    }

    const xpGain = 10;
    let newXP = stats.xp + xpGain;
    let newLevel = stats.level;
    let levelIncreased = false;

    while (newXP >= XP_PER_LEVEL) {
      newXP -= XP_PER_LEVEL;
      newLevel += 1;
      levelIncreased = true;
    }

    const newStats = {
      [statToUpgrade]: stats[statToUpgrade] + 1,
      points: stats.points - 1,
      xp: newXP,
      level: newLevel,
    };

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, newStats);
      setStats((prev) => ({ ...prev, ...newStats }));
      if (levelIncreased) {
        setLevelUp(true);
        setTimeout(() => setLevelUp(false), 2000);
        speak(`Level up! You are now level ${newLevel}`, 'en-US');
        checkAchievements(newLevel, newStats); // Use updated stats
      }
      Swal.fire({
        icon: 'success',
        title: 'Upgrade Successful',
        text: `${statToUpgrade.charAt(0).toUpperCase() + statToUpgrade.slice(1)} increased by 1!`,
        confirmButtonColor: '#00ffc8',
        background: '#1a1a1a',
        color: '#fff',
      });
    } catch (err) {
      setError('Failed to upgrade stat.');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to upgrade stat. Please try again.',
        confirmButtonColor: '#ff0044',
        background: '#1a1a1a',
        color: '#fff',
      });
    }
  }, [stats, checkAchievements]);

  // Handle navigation
  const handleNavigation = useCallback(
    (path) => {
      enableAudio();
      navigate(path, { state: { selectedDate: currentDate } });
    },
    [navigate, currentDate, enableAudio]
  );

  // Auth and date sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadStats(user);
      } else {
        setError('User not authenticated');
        setIsLoading(false);
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [loadStats, navigate]);

  const xpProgress = Math.min(Math.max(stats.xp || 0, 0), XP_PER_LEVEL);
  const today = new Date().toISOString().split('T')[0];
  const isNextDisabled = currentDate === today;

  const renderBackgroundVideo = () => (
    <video
      className="background-video"
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
    >
      <source src="/videos/dashboard-bg.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );

  if (isLoading) {
    return (
      <>
        {renderBackgroundVideo()}
        <motion.div
          className="dashboard-container dashboard-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="spinner"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          />
          <p>Loading your hunter stats...</p>
        </motion.div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {renderBackgroundVideo()}
        <motion.div
          className="dashboard-container dashboard-error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="error-message">{error}</p>
          <button
            onClick={() => loadStats(auth.currentUser)}
            className="retry-button"
            aria-label="Retry loading stats"
          >
            Retry
          </button>
        </motion.div>
      </>
    );
  }

  return (
    <>
      {renderBackgroundVideo()}
      {showTerminal && (
        <AnimatePresence>
          <HoloTerminal onClose={() => setShowTerminal(false)} />
        </AnimatePresence>
      )}
      <AnimatePresence>
        <motion.main
          className="dashboard-container"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          key="dashboard"
        >
          <motion.div
            className="dashboard-card"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {levelUp && (
              <motion.div
                className="level-up-burst"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.6 }}
              >
                🎉 Level Up! Now Level {stats.level}
              </motion.div>
            )}

            <header className="dashboard-header">
              <h1 className="dashboard-title">
                Welcome, Hunter {userName || userEmail.split('@')[0]}
              </h1>
              <motion.span
                className="level-display"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                Level {stats.level || 1}
              </motion.span>
            </header>

            <section className="date-navigator">
              <h2 className="date-heading">Select Date</h2>
              <div className="date-controls">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => handleDateChange('prev')}
                  className="date-button"
                  aria-label="Select previous day"
                >
                  ← Previous
                </motion.button>
                <span className="current-date">
                  {new Date(currentDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => handleDateChange('next')}
                  disabled={isNextDisabled}
                  className="date-button"
                  aria-label="Select next day"
                >
                  Next →
                </motion.button>
              </div>
            </section>

            <section className="stats-summary">
              <h2 className="stats-heading">Stats Overview</h2>
              <div className="xp-progress">
                <div className="xp-bar-container">
                  <motion.div
                    className="xp-bar"
                    style={{ width: `${xpProgress}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 1.2, ease: 'easeInOut' }}
                  />
                </div>
                <span className="xp-text">XP: {stats.xp}/{XP_PER_LEVEL}</span>
              </div>

              <ul className="stats-list">
                {['strength', 'stamina', 'agility'].map((stat) => (
                  <li className="stat-item" key={stat}>
                    <strong>{stat.charAt(0).toUpperCase() + stat.slice(1)}:</strong> {stats[stat]}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => {
                        enableAudio();
                        handleUpgradeStat(stat);
                      }}
                      disabled={stats.points <= 0}
                      className="upgrade-button"
                      aria-label={`Upgrade ${stat}`}
                    >
                      +1
                    </motion.button>
                  </li>
                ))}
                <li className="stat-item">
                  <strong>Available Points:</strong> {stats.points}
                </li>
              </ul>
            </section>

            <section className="achievements-section">
              <h2 className="achievements-heading">Achievements</h2>
              <div className="achievements-list">
                {achievements.length > 0 ? (
                  achievements.map((achievement, index) => (
                    <motion.div
                      key={index}
                      className="achievement-item"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      🎯 {achievement}
                    </motion.div>
                  ))
                ) : (
                  <p>No achievements yet. Keep leveling up!</p>
                )}
              </div>
            </section>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <StatsChart data={[stats]} />
            </motion.div>

            <nav className="dashboard-buttons">
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: '#00ffc8', color: '#000' }}
                transition={{ type: 'spring', stiffness: 300 }}
                onClick={() => handleNavigation('/daily-quest')}
                aria-label="Go to Daily Quest"
              >
                Daily Quest
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: '#00ffc8', color: '#000' }}
                transition={{ type: 'spring', stiffness: 300 }}
                onClick={() => {
                  enableAudio();
                  setShowTerminal(true);
                }}
                aria-label="Open Holographic Terminal"
              >
                Open Holographic Terminal
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: '#00ffc8', color: '#000' }}
                transition={{ type: 'spring', stiffness: 300 }}
                onClick={() => handleNavigation('/leaderboard')}
                aria-label="Go to Leaderboard"
              >
                Leaderboard
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: '#ff0044', color: '#fff' }}
                transition={{ type: 'spring', stiffness: 300 }}
                onClick={handleLogout}
                className="logout-button"
                aria-label="Log out"
              >
                🚪 Logout
              </motion.button>
            </nav>
          </motion.div>
        </motion.main>
      </AnimatePresence>
    </>
  );
};

export default Dashboard;