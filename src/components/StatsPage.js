import React, { useEffect, useState, useCallback } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import './StatsPage.css';

function StatsPage() {
  const [stats, setStats] = useState({
    strength: 0,
    stamina: 0,
    agility: 0,
    points: 0,
    level: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (
          typeof data.strength === 'number' &&
          typeof data.stamina === 'number' &&
          typeof data.agility === 'number' &&
          typeof data.points === 'number' &&
          typeof data.level === 'number'
        ) {
          setStats(data);
        } else {
          throw new Error('Invalid stats format');
        }
      } else {
        const defaultStats = {
          strength: 0,
          stamina: 0,
          agility: 0,
          points: 0,
          level: 1,
        };
        await setDoc(docRef, defaultStats);
        setStats(defaultStats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setError(error.message || 'Failed to load stats. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const updateStat = useCallback(
    async (key) => {
      if (stats.points <= 0 || isUpdating) return;

      setIsUpdating(true);
      setError(null);
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        const docRef = doc(db, 'users', user.uid);
        const newStats = {
          [key]: stats[key] + 1,
          points: stats.points - 1,
        };
        await updateDoc(docRef, newStats);
        setStats((prev) => ({
          ...prev,
          [key]: prev[key] + 1,
          points: prev.points - 1,
        }));
      } catch (error) {
        console.error('Failed to update stat:', error);
        setError('Failed to update stat. Please try again.');
      } finally {
        setIsUpdating(false);
      }
    },
    [stats, isUpdating]
  );

  return (
    <div className="stats-wrapper">
      <video className="background-video" autoPlay loop muted playsInline aria-hidden="true">
        <source src="/videos/dashboard-bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {isLoading ? (
        <div className="stats-container stats-loading" aria-live="polite">
          <p>Loading character stats...</p>
        </div>
      ) : error ? (
        <div className="stats-container stats-error" role="alert">
          <p className="error-message">{error}</p>
          <button
            onClick={fetchStats}
            className="retry-button"
            aria-label="Retry loading stats"
          >
            Retry
          </button>
        </div>
      ) : (
        <main className="stats-container" aria-labelledby="stats-heading">
          <h1 id="stats-heading" className="stats-title">
            🧠 Character Stats
          </h1>
          <section className="stats-overview" aria-label="Character statistics">
            <p>
              <strong>Level:</strong> {stats.level}
            </p>
            <p>
              <strong>Available Points:</strong> {stats.points}
            </p>
            <ul className="stats-list">
              {[
                { key: 'strength', icon: '💪', label: 'Strength' },
                { key: 'stamina', icon: '🏃', label: 'Stamina' },
                { key: 'agility', icon: '⚡', label: 'Agility' },
              ].map(({ key, icon, label }) => (
                <li key={key} className="stat-row">
                  <span>
                    <span aria-hidden="true">{icon} </span>
                    <strong>{label}:</strong> {stats[key]}
                  </span>
                  <button
                    onClick={() => updateStat(key)}
                    disabled={stats.points <= 0 || isUpdating}
                    aria-label={`Increase ${label}`}
                  >
                    +
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </main>
      )}
    </div>
  );
}

export default StatsPage;
