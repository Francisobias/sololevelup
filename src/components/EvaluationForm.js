import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../firebase';
import './EvaluationForm.css'; // Import optional CSS

function EvaluationForm() {
  const [formData, setFormData] = useState({ height: '', weight: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isValidInput = () => {
    return (
      formData.height.trim() !== '' &&
      formData.weight.trim() !== '' &&
      !isNaN(formData.height) &&
      !isNaN(formData.weight)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidInput()) {
      alert('Please enter valid numeric values for height and weight.');
      return;
    }

    try {
      setSubmitting(true);
      await addDoc(collection(db, 'evaluations'), {
        uid: auth.currentUser.uid,
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
        date: new Date()
      });
      alert('✅ Evaluation submitted successfully!');
      setFormData({ height: '', weight: '' });
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      alert('❌ Failed to submit evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="evaluation-form" onSubmit={handleSubmit}>
      <h2>📋 Evaluation Form</h2>

      <input
        type="text"
        name="height"
        placeholder="Height (cm)"
        value={formData.height}
        onChange={handleChange}
      />
      <input
        type="text"
        name="weight"
        placeholder="Weight (kg)"
        value={formData.weight}
        onChange={handleChange}
      />

      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Evaluation'}
      </button>
    </form>
  );
}

export default EvaluationForm;
