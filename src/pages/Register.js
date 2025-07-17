import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import './Register.css';

function Register() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    height: '',
    weight: '',
    activity: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const { email, password, name, age, height, weight, activity } = form;

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!name || !age || !height || !weight || !activity) {
      setError('Please complete all profile fields.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        name,
        age: parseInt(age),
        height: parseFloat(height),
        weight: parseFloat(weight),
        activity,
        strength: 0,
        stamina: 0,
        agility: 0,
        points: 0,
        xp: 0,
        level: 1,
        createdAt: new Date()
      });

      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err.message.includes('auth/email-already-in-use')
        ? 'This email is already in use.'
        : 'Failed to register. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Create Account</h2>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Full Name"
          required
        />
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          required
        />
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Password"
          required
        />
        <input
          type="number"
          name="age"
          value={form.age}
          onChange={handleChange}
          placeholder="Age"
          min="10"
          required
        />
        <input
          type="number"
          name="height"
          value={form.height}
          onChange={handleChange}
          placeholder="Height (cm)"
          min="50"
          required
        />
        <input
          type="number"
          name="weight"
          value={form.weight}
          onChange={handleChange}
          placeholder="Weight (kg)"
          min="20"
          required
        />

        <select
          name="activity"
          value={form.activity}
          onChange={handleChange}
          required
        >
          <option value="">Select Activity Level</option>
          <option value="not_active">🛋️ Not Active</option>
          <option value="slightly_active">🚶 Slightly Active</option>
          <option value="active">🏃 Active</option>
          <option value="very_active">💪 Very Active</option>
        </select>

        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>

        {error && <p className="error">{error}</p>}
      </form>

      <p>
        Already have an account? <Link to="/">Login</Link>
      </p>
    </div>
  );
}

export default Register;
