import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './components/Dashboard';
import EvaluationForm from './components/EvaluationForm';
import ReEvaluationForm from './components/ReEvaluationForm';
import DailyQuest from './components/DailyQuest';
import StatsPage from './components/StatsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/daily-quest" element={<DailyQuest />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/evaluate" element={<EvaluationForm />} />
        <Route path="/reevaluate" element={<ReEvaluationForm />} />
      </Routes>
    </Router>
  );
}

export default App;