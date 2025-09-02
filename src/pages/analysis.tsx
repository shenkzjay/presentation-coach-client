import { useEffect, useState } from "react";

export default function Analysis() {
  const [audioAnalysisData, setAudioAnalysisData] = useState();
  console.log(audioAnalysisData);

  useEffect(() => {
    const fetchAnalysisData = async () => {
      try {
        const response = await fetch("http://localhost:8000/transcriptions", {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setAudioAnalysisData(data);
      } catch (error) {
        console.error("Failed to fetch transcriptions:", error);
      }
    };

    fetchAnalysisData();
  }, []);
  console.log(audioAnalysisData);

  return <div className="container mx-auto">annlyze my ass!</div>;
}
