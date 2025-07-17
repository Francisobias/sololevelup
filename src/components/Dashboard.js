import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Swal from 'sweetalert2';
import StatsChart from './StatsChart';
import HoloTerminal from './HoloTerminal';
import { motion, AnimatePresence } from 'framer-motion';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();

  const defaultStats = useMemo(() => ({
    strength: 0,
    stamina: 0,
    agility: 0,
    points: 0,
    level: 1,
    xp: 0,
  }), []);

  const [stats, setStats] = useState(defaultStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [levelUp, setLevelUp] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);

  const capitalize = (name) => name ? name.charAt(0).toUpperCase() + name.slice(1) : '';

  const loadStats = useCallback(async (user) => {
    setIsLoading(true);
    setError(null);
    try {
      const userRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(userRef);
      const data = snapshot.exists() ? snapshot.data() : {};
      const validatedStats = { ...defaultStats };

      for (const key in validatedStats) {
        validatedStats[key] = typeof data[key] === 'number' ? data[key] : defaultStats[key];
      }

      setStats(validatedStats);
      setUserName(capitalize(data.name || ''));
      setUserEmail(user.email || '');
      await setDoc(userRef, validatedStats, { merge: true });
    } catch (err) {
      console.error('Error loading stats:', err);
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }, [defaultStats]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        loadStats(firebaseUser);
      } else {
        setError('User not authenticated');
        setIsLoading(false);
      }
    });

    const interval = setInterval(() => {
      setCurrentDate(new Date().toISOString().split('T')[0]);
    }, 60000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [loadStats]);

  const handleUpgradeStat = useCallback(async (statToUpgrade) => {
    if (stats.points <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Points',
        text: 'You have no available points to upgrade.',
        confirmButtonColor: '#00ffc8',
      });
      return;
    }

    const xpGain = 10;
    let newXP = stats.xp + xpGain;
    let newLevel = stats.level;
    let levelIncreased = false;

    while (newXP >= 100) {
      newXP -= 100;
      newLevel += 1;
      levelIncreased = true;
    }

    const newStats = {
      ...stats,
      [statToUpgrade]: stats[statToUpgrade] + 1,
      points: stats.points - 1,
      xp: newXP,
      level: newLevel,
    };

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, newStats);
      setStats(newStats);
      if (levelIncreased) {
        setLevelUp(true);
        setTimeout(() => setLevelUp(false), 2000);
      }
      Swal.fire({
        icon: 'success',
        title: 'Upgrade Successful',
        text: `${statToUpgrade.charAt(0).toUpperCase() + statToUpgrade.slice(1)} increased by 1!`,
        confirmButtonColor: '#00ffc8',
      });
    } catch (err) {
      console.error('Error upgrading stat:', err);
      setError('Failed to upgrade stat. Please try again.');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to upgrade stat. Please try again.',
        confirmButtonColor: '#00ffc8',
      });
    }
  }, [stats]);

  const handleNavigation = useCallback((path) => {
    navigate(path, { state: { selectedDate: currentDate } });
  }, [navigate, currentDate]);

  const xpProgress = Math.min(Math.max(stats.xp || 0, 0), 100);

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
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
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
          <button onClick={() => loadStats(auth.currentUser)} className="retry-button">
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
                🎉 Level Up!
              </motion.div>
            )}

            <header className="dashboard-header">
              <h1 className="dashboard-title">
                Welcome, Hunter {userName || userEmail.split('@')[0]}
              </h1>
              <span className="level-display">Level {stats.level}</span>
            </header>

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
                <span className="xp-text">XP: {stats.xp}/100</span>
              </div>

              <ul className="stats-list">
                {['strength', 'stamina', 'agility'].map((stat) => (
                  <li className="stat-item" key={stat}>
                    <strong>{stat.charAt(0).toUpperCase() + stat.slice(1)}:</strong> {stats[stat]}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => handleUpgradeStat(stat)}
                      disabled={stats.points <= 0}
                      className="upgrade-button"
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
              >
                Daily Quest
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: '#00ffc8', color: '#000' }}
                transition={{ type: 'spring', stiffness: 300 }}
                onClick={() => setShowTerminal(true)}
              >
                Open Holographic Terminal
              </motion.button>
            </nav>
          </motion.div>
        </motion.main>
      </AnimatePresence>
    </>
  );
}

export default Dashboard;
