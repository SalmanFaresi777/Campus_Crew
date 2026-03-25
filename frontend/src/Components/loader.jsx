/**
 * Unified Loader Component
 * Reusable spinner displayed during page load, API calls, or data processing
 * Supports both light and dark modes via theme-aware color prop
 */

import React from 'react';
import '../CSS/loader.css';

function Loader({ color = 'black', variant = 'default', ariaLabel = 'Loading' }) {
  const svgStyle = {
    '--uib-color': color
  };

  // Determine CSS class based on variant (for different modal styles)
  const containerClass = variant === 'login' ? 'loader-modal' : 'modal';
  const svgClass = variant === 'login' ? 'loader-svg' : 'container';

  return (
    <div className={containerClass} role="status" aria-label={ariaLabel}>
      <svg 
        className={svgClass}
        x="0px" 
        y="0px" 
        viewBox="0 0 40 40" 
        height="40" 
        width="40" 
        preserveAspectRatio="xMidYMid meet"
        style={svgStyle}
      >
        {/* Track: background path */}
        <path 
          className="track" 
          fill="none" 
          strokeWidth="2" 
          pathLength="100" 
          d="M29.760000000000005 18.72 c0 7.28 -3.9200000000000004 13.600000000000001 -9.840000000000002 16.96 c -2.8800000000000003 1.6800000000000002 -6.24 2.64 -9.840000000000002 2.64 c -3.6 0 -6.88 -0.96 -9.76 -2.64 c0 -7.28 3.9200000000000004 -13.52 9.840000000000002 -16.96 c2.8800000000000003 -1.6800000000000002 6.24 -2.64 9.76 -2.64 S26.880000000000003 17.040000000000003 29.760000000000005 18.72 c5.84 3.3600000000000003 9.76 9.68 9.840000000000002 16.96 c -2.8800000000000003 1.6800000000000002 -6.24 2.64 -9.76 2.64 c -3.6 0 -6.88 -0.96 -9.840000000000002 -2.64 c -5.84 -3.3600000000000003 -9.76 -9.68 -9.76 -16.96 c0 -7.28 3.9200000000000004 -13.600000000000001 9.76 -16.96 C25.84 5.120000000000001 29.760000000000005 11.440000000000001 29.760000000000005 18.72z" />
        
        {/* Animated car: foreground animation path */}
        <path 
          className="car" 
          fill="none" 
          strokeWidth="3" 
          pathLength="100" 
          d="M29.760000000000005 18.72 c0 7.28 -3.9200000000000004 13.600000000000001 -9.840000000000002 16.96 c -2.8800000000000003 1.6800000000000002 -6.24 2.64 -9.840000000000002 2.64 c -3.6 0 -6.88 -0.96 -9.76 -2.64 c0 -7.28 3.9200000000000004 -13.52 9.840000000000002 -16.96 c2.8800000000000003 -1.6800000000000002 6.24 -2.64 9.76 -2.64 S26.880000000000003 17.040000000000003 29.760000000000005 18.72 c5.84 3.3600000000000003 9.76 9.68 9.840000000000002 16.96 c -2.8800000000000003 1.6800000000000002 -6.24 2.64 -9.76 2.64 c -3.6 0 -6.88 -0.96 -9.840000000000002 -2.64 c -5.84 -3.3600000000000003 -9.76 -9.68 -9.76 -16.96 c0 -7.28 3.9200000000000004 -13.600000000000001 9.76 -16.96 C25.84 5.120000000000001 29.760000000000005 11.440000000000001 29.760000000000005 18.72z" />
      </svg>
    </div>
  );
}

export default Loader;
