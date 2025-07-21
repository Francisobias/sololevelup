import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import './Leaderboard.css';

function Leaderboard() {
  const navigate = useNavigate();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('No authenticated user found. Redirecting to login.');
      setError('User not authenticated. Please log in.');
      setIsLoading(false);
      navigate('/');
      return;
    }

    try {
      console.log('Fetching leaderboard for user:', currentUser.uid);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('xp', 'desc'));
      const snapshot = await getDocs(q);
      console.log('Query snapshot received with', snapshot.size, 'documents');

      const users = snapshot.docs.map((doc, index) => ({
        rank: index + 1,
        id: doc.id,
        name: doc.data().name || doc.data().email?.split('@')[0] || 'Unknown',
        xp: doc.data().xp || 0,
        level: doc.data().level || 1,
      }));
      console.log('Processed users data:', users);
      setLeaderboardData(users);
    } catch (err) {
      console.error('Firestore error details:', err);
      setError(err.message || 'Failed to load leaderboard. Check console for details.');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load leaderboard. Check console for details or try again.',
        confirmButtonColor: '#ff0044',
        background: '#1a1a1a',
        color: '#fff',
      });
    } finally {
      setIsLoading(false);
    }
  }, [navigate]); // navigate is the only dependency that might change

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleRetry = () => {
    fetchLeaderboard();
  };

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
          className="leaderboard-container leaderboard-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="spinner"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          />
          <p>Loading leaderboard...</p>
        </motion.div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {renderBackgroundVideo()}
        <motion.div
          className="leaderboard-container leaderboard-error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="error-message">{error}</p>
          <button onClick={handleRetry} className="retry-button">
            Retry
          </button>
          <button onClick={() => navigate('/dashboard')} className="back-button">
            Back to Dashboard
          </button>
        </motion.div>
      </>
    );
  }

  return (
    <>
      {renderBackgroundVideo()}
      <motion.main
        className="leaderboard-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <motion.div
          className="leaderboard-card"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <header className="leaderboard-header">
            <h1 className="leaderboard-title">Leaderboard</h1>
          </header>
          <section className="leaderboard-table">
            <div className="table-header">
              <span>Rank</span>
              <span>Name</span>
              <span>Level</span>
              <span>XP</span>
            </div>
            <AnimatePresence>
              {leaderboardData.map((user) => (
                <motion.div
                  key={user.id}
                  className="table-row"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <span>{user.rank}</span>
                  <span>{user.name}</span>
                  <span>{user.level}</span>
                  <span>{user.xp}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </section>
          <nav className="leaderboard-buttons">
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: '#00ffc8', color: '#000' }}
              transition={{ type: 'spring', stiffness: 300 }}
              onClick={() => navigate('/dashboard')}
              className="back-button"
            >
              Back to Dashboard
            </motion.button>
          </nav>
        </motion.div>
      </motion.main>
    </>
  );
}

export default Leaderboard;