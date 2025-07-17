import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { db, auth } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Swal from 'sweetalert2';
import './DailyQuest.css';

const ONE_HOUR_MS = 60 * 60 * 1000;

const DailyQuest = () => {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [user, setUser] = useState(null);
  const [userLevel, setUserLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(null);
  const [warningShown, setWarningShown] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showWarningBg, setShowWarningBg] = useState(false);
  const intervalRef = useRef(null);
  const location = useLocation();

  const completeSoundRef = useRef(null);
  const warningSoundRef = useRef(null);

  const convertToDate = (timestamp) =>
    timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;

  const generateWorkoutQuests = (level) => {
    const workouts = {
      1: { pushups: 10, situps: 15, squats: 20, jumpingjacks: 30 },
      5: { pushups: 15, situps: 20, squats: 25, jumpingjacks: 40 },
    }[level] || { pushups: 10, situps: 15, squats: 20, jumpingjacks: 30 };

    return [
      { title: `${workouts.pushups} Push-ups`, completed: false },
      { title: `${workouts.situps} Sit-ups`, completed: false },
      { title: `${workouts.squats} Squats`, completed: false },
      { title: `${workouts.jumpingjacks} Jumping Jacks`, completed: false },
    ];
  };

  const enableAudio = useCallback(() => {
    if (!audioEnabled) {
      setAudioEnabled(true);
      const silentAudio = new Audio('/sounds/silent.mp3');
      silentAudio.play().catch(() => {
        console.log('Silent audio playback failed');
      });
    }
  }, [audioEnabled]);

  const fetchQuests = useCallback(async (uid) => {
    setLoading(true);
    try {
      const questsRef = collection(db, 'quests');
      const q = query(questsRef, where('uid', '==', uid));
      const snapshot = await getDocs(q);
      const questsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: convertToDate(doc.data().date || new Date()),
        startTime: convertToDate(doc.data().startTime || new Date()),
      }));
      setQuests(questsData);
      console.log('Quests fetched:', questsData);
    } catch (error) {
      console.error('Error fetching quests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const startCountdown = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayQuest = quests.find(
      (q) => convertToDate(q.date).toISOString().split('T')[0] === today
    );

    if (!todayQuest) {
      setTimeLeft(null);
      setWarningShown(false);
      setShowWarningBg(false);
      console.log('No quests for today, showing dashboard-bg');
      return;
    }

    const startTime = convertToDate(todayQuest.startTime);

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const now = new Date();
      const diff = startTime.getTime() + ONE_HOUR_MS - now.getTime();

      const todayUncompleted = quests
        .filter((q) => convertToDate(q.date).toISOString().split('T')[0] === today)
        .some((q) => !q.completed);

      if (!todayUncompleted) {
        clearInterval(intervalRef.current);
        setTimeLeft(null);
        setWarningShown(false);
        setShowWarningBg(false);
        console.log('All quests completed, switching to dashboard-bg');
        return;
      }

      setTimeLeft(diff > 0 ? diff : 0);

      if (diff < 5 * 60 * 1000 && !warningShown && diff > 0) {
        setWarningShown(true);
        setShowWarningBg(true);
        console.log('Less than 5 minutes left, showing warning-bg');
        if (warningSoundRef.current && audioEnabled) {
          warningSoundRef.current.play().catch((error) => {
            console.error('Warning sound playback failed:', error);
            Swal.fire({
              icon: 'info',
              title: 'Enable Audio',
              text: 'Audio playback was blocked. Interact with the page (e.g., click a button) to enable sound.',
              confirmButtonColor: '#ff0044',
              background: '#1a1a1a',
              color: '#fff',
            });
          });
        }
      } else if (diff >= 5 * 60 * 1000 && warningShown) {
        setWarningShown(false);
        setShowWarningBg(false);
        console.log('Time no longer urgent, switching to dashboard-bg');
      }
    }, 1000);
  }, [quests, warningShown, audioEnabled]);

  const checkForPenalty = useCallback(async (uid) => {
    const today = new Date().toISOString().split('T')[0];
    const todayQuests = quests.filter(
      (q) => convertToDate(q.date).toISOString().split('T')[0] === today
    );

    if (todayQuests.length === 0 || todayQuests[0]?.penalized) return;

    const startTime = convertToDate(todayQuests[0].startTime);
    const now = new Date();
    const passed = now - startTime > ONE_HOUR_MS;
    const uncompleted = todayQuests.some((q) => !q.completed);

    if (passed && uncompleted) {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        await updateDoc(userRef, {
          xp: Math.max((userData.xp || 0) - 10, 0),
          points: Math.max((userData.points || 0) - 1, 0),
        });

        for (const quest of todayQuests) {
          await updateDoc(doc(db, 'quests', quest.id), { penalized: true });
        }

        Swal.fire({
          icon: 'error',
          title: '❌ Penalty!',
          text: 'You didn’t complete your quests within 1 hour.\nXP -10 | Points -1',
          confirmButtonColor: '#ff0044',
          background: '#1a1a1a',
          color: '#fff',
        });
      }
    }
  }, [quests]);

  useEffect(() => {
    const handleAuthStateChange = (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userRef = doc(db, 'users', firebaseUser.uid);
        getDoc(userRef).then((userSnap) => {
          if (userSnap.exists()) {
            setUserLevel(userSnap.data().level || 1);
          }
          fetchQuests(firebaseUser.uid);
        });
      }
    };

    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);

    const locationState = location.state;
    if (locationState?.selectedDate) {
      setSelectedDate(locationState.selectedDate);
    } else {
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }

    return () => {
      unsubscribe();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchQuests, location]);

  useEffect(() => {
    if (user) {
      startCountdown();
      checkForPenalty(user.uid);
    }
  }, [quests, user, startCountdown, checkForPenalty]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fallback to ensure background switches when quests are completed
  useEffect(() => {
    if (user && quests.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const todayUncompleted = quests
        .filter((q) => convertToDate(q.date).toISOString().split('T')[0] === today)
        .some((q) => !q.completed);
      if (!todayUncompleted) {
        setShowWarningBg(false);
        console.log('Fallback: All quests completed, ensuring dashboard-bg');
      }
    }
  }, [quests, user]);

  const formatTime = (ms) => {
    if (ms <= 0) return '00:00';
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (date) => {
    return date.toLocaleString('en-PH', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const addQuest = async () => {
    if (!user) return;
    enableAudio();
    const today = new Date().toISOString().split('T')[0];
    const exists = quests.some(
      (q) => convertToDate(q.date).toISOString().split('T')[0] === today
    );
    if (exists) return;

    const newQuests = generateWorkoutQuests(userLevel);
    const now = new Date();
    for (const quest of newQuests) {
      await addDoc(collection(db, 'quests'), {
        uid: user.uid,
        ...quest,
        date: Timestamp.fromDate(now),
        startTime: Timestamp.fromDate(now),
        penalized: false,
      });
    }

    await fetchQuests(user.uid);
  };

  const markAsCompleted = async (id) => {
    if (!user) return;
    await updateDoc(doc(db, 'quests', id), { completed: true });

    if (completeSoundRef.current && audioEnabled) {
      completeSoundRef.current.play().catch((error) => {
        console.error('Complete sound playback failed:', error);
      });
    }

    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const points = (snap.data().points || 0) + 1;
      await updateDoc(userRef, { points });
    }

    await fetchQuests(user.uid);
    startCountdown();
  };

  const filtered = quests.filter(
    (q) => convertToDate(q.date).toISOString().split('T')[0] === selectedDate
  );

  return (
    <div className="daily-quest-wrapper">
      <video
        className="background-video dashboard-bg"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/videos/dashboard-bg.mp4" type="video/mp4" />
      </video>
      {showWarningBg && (
        <video
          className="background-video warning-bg"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/videos/warning-bg.mp4" type="video/mp4" />
        </video>
      )}

      <div className="daily-quest-container">
        <h2>🔥 Daily Quests</h2>

        <div className="real-time-display">
          🕒 {formatDateTime(currentTime)}
        </div>

        {timeLeft !== null && (
          <div className={`countdown-timer ${timeLeft < 5 * 60 * 1000 ? 'urgent' : ''}`}>
            ⏳ Time Left: {formatTime(timeLeft)}
          </div>
        )}

        <div className="date-filter">
          <label>📅 Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <button className="add-quest-btn" onClick={addQuest} disabled={!user || loading}>
          ➕ Add Workout Routine
        </button>

        {loading ? (
          <p>Loading quests...</p>
        ) : filtered.length === 0 ? (
          <p>No quests for this date.</p>
        ) : (
          <ul className="quest-list">
            {filtered.map((q) => (
              <li key={q.id} className={q.completed ? 'completed' : 'pending'}>
                <span>
                  {q.title} - <strong>{q.completed ? '✅ Done' : '⏳ Pending'}</strong>
                </span>
                {!q.completed && (
                  <button className="complete-btn" onClick={() => markAsCompleted(q.id)}>
                    ✔ Complete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <audio ref={completeSoundRef} src="/sounds/quest-complete.mp3" preload="auto" />
      <audio ref={warningSoundRef} src="/sounds/countdown-warning.mp3" preload="auto" />
    </div>
  );
};

export default DailyQuest;