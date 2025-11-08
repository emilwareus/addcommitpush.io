import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

// Apple Icon generation
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
        }}
      >
        <svg
          width="180"
          height="180"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#00d9ff', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#bd00ff', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#ff00ea', stopOpacity: 1 }} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle
            cx="60"
            cy="60"
            r="55"
            fill="none"
            stroke="url(#borderGradient)"
            stroke-width="3"
            filter="url(#glow)"
          />

          <g fill="#00d9ff" filter="url(#glow)">
            <path
              d="M 45 40 L 30 60 L 45 80"
              stroke="#00d9ff"
              stroke-width="6"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
            />

            <path
              d="M 75 40 L 90 60 L 75 80"
              stroke="#00d9ff"
              stroke-width="6"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
            />
          </g>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
