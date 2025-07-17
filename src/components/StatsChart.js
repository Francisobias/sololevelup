// StatsChart.js
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

function StatsChart({ data }) {
  return (
    <section className="chart-section">
      <h2 className="stats-heading">Progress Chart</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tick={{ fill: '#00ffc8' }} />
          <YAxis tick={{ fill: '#00ffc8' }} />
          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none' }} labelStyle={{ color: '#00ffc8' }} />
          <Legend />
          <Line type="monotone" dataKey="strength" stroke="#00ffc8" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="stamina" stroke="#ffc800" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="agility" stroke="#ff0077" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}

export default StatsChart;
