import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";

export const PauseVisualization = ({ silence_analysis }) => {
  const pauses = silence_analysis?.all_pauses || [];

  const pauseData = pauses.map((pause, index) => ({
    name: `Pause ${index + 1}`,
    start: pause.start,
    duration: pause.duration,
    end: pause.end,
    label: `${pause.start.toFixed(1)}s`,
  }));

  return (
    <div className="w-full mt-6">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={pauseData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <XAxis
            fontSize={14}
            dataKey="start"
            // label={{ value: "Time in Speech (seconds)", position: "insideBottom", offset: -5 }}
            width="auto"
            tickFormatter={(value) => `${value.toFixed(0)}s`}
          />
          <YAxis
            dataKey="duration"
            fontSize={14}
            // label={{
            //   value: "Pause Duration (s)",
            //   angle: -90,

            //   position: "insideCenter",
            // }}

            domain={[0, "dataMax + 0.2"]}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              value.toFixed(2) + "s",
              name === "duration" ? "Duration" : name,
            ]}
            labelFormatter={(label) => `At ${label}s`}
            contentStyle={{ background: "white", border: "1px solid #ccc" }}
          />
          <Legend align="right" />
          <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
          <Bar
            dataKey="duration"
            fill="#f97316"
            name="Pause Duration"
            barSize={20}
            background={{ fill: "#e4e4e4" }}
          >
            {/* <LabelList dataKey="label" position="top" formatter={(val: string) => `${val}`} /> */}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
