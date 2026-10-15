'use client';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function BarChartProjects({ data }: { data: { project: string; avg: number | null }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid vertical={false} stroke="#e4e2dc" />
          <XAxis dataKey="project" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis domain={[0, 5]} tickLine={false} axisLine={false} fontSize={12} width={28} />
          <Tooltip cursor={{ fill: '#eef2f8' }} />
          <Bar dataKey="avg" name="Avg Composite" fill="#13294b" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
