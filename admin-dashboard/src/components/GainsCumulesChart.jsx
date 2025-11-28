import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function GainsCumulesChart({ data }) {
  // data: [{ year: 2026, gain: -9000 }, ...]
  const chartData = {
    labels: data.map((d) => d.year),
    datasets: [
      {
        label: 'Gains cumulés',
        data: data.map((d) => d.gain),
        backgroundColor: data.map((d) => (d.gain >= 0 ? '#FFD600' : '#B0B0B0')),
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => v + ' €' },
      },
    },
  };
  return <Bar data={chartData} options={options} />;
}
