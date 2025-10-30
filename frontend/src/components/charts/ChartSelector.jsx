import React from "react";
import LiveChart from "./LiveChart";
import HistoricalChart from "./HistoricalChart";

export default function ChartSelector({ 
  timeMode, 
  data = [], 
  stats = {}, 
  violations = [] 
}) {
  console.log(`[ChartSelector] Rendering ${timeMode} chart with ${data.length} data points`);

  // Render the appropriate chart based on time mode
  switch (timeMode) {
    case "live":
      return (
        <LiveChart 
          data={data} 
          stats={stats} 
          violations={violations} 
        />
      );
    
    case "6h":
      return (
        <HistoricalChart 
          data={data} 
          stats={stats} 
          violations={violations} 
          timeWindow="6h"
        />
      );
    
    case "24h":
      return (
        <HistoricalChart 
          data={data} 
          stats={stats} 
          violations={violations} 
          timeWindow="24h"
        />
      );
    
    default:
      console.warn(`[ChartSelector] Unknown timeMode: ${timeMode}, defaulting to LiveChart`);
      return (
        <LiveChart 
          data={data} 
          stats={stats} 
          violations={violations} 
        />
      );
  }
}