import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

function ReEvaluationForm() {
  const navigate = useNavigate();
  const [strengthLevel, setStrengthLevel] = useState('');
  const [enduranceLevel, setEnduranceLevel] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReEvaluation = async (e) => {
    e.preventDefault();
    setError('');

    if (!strengthLevel.trim() || !enduranceLevel.trim()) {
      setError('Please select both strength and endurance levels.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return navigate('/');

      await updateDoc(doc(db, 'users', user.uid), {
        reEvaluation: {
          strengthLevel,
          enduranceLevel,
          completedAt: new Date().toISOString(),
        },
      });

      alert('✅ Re-evaluation submitted successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('❌ Failed to submit re-evaluation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="container d-flex justify-content-center align-items-center min-vh-100"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      <div className="card p-4 shadow-lg solo-leveling-card bg-dark text-white" style={{ maxWidth: '500px', width: '100%' }}>
        <h2 className="text-center mb-4">⚔️ Hunter Re-Evaluation</h2>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleReEvaluation}>
          <div className="mb-3">
            <label htmlFor="strength" className="form-label">Strength Level</label>
            <select
              id="strength"
              className="form-select"
              value={strengthLevel}
              onChange={(e) => setStrengthLevel(e.target.value)}
              required
            >
              <option value="" disabled>Select Strength Level</option>
              <option value="Low">Low (E-rank)</option>
              <option value="Moderate">Moderate (C-rank)</option>
              <option value="High">High (A-rank)</option>
            </select>
          </div>

          <div className="mb-3">
            <label htmlFor="endurance" className="form-label">Endurance Level</label>
            <select
              id="endurance"
              className="form-select"
              value={enduranceLevel}
              onChange={(e) => setEnduranceLevel(e.target.value)}
              required
            >
              <option value="" disabled>Select Endurance Level</option>
              <option value="Low">Low (E-rank)</option>
              <option value="Moderate">Moderate (C-rank)</option>
              <option value="High">High (A-rank)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Re-Evaluation'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

export default ReEvaluationForm;
