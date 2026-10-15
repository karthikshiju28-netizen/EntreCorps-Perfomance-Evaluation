'use client';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function BarChartProjects({ data }: { data: { project: string; avg: number | null }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="project" />
          <YAxis domain={[0, 5]} />
          <Tooltip />
          <Bar dataKey="avg" name="Avg Composite" fill="#1d4ed8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
