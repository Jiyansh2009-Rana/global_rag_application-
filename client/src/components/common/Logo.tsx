interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  useImage?: boolean;
}

export function Logo({
  size = 'md',
  showText = true,
  className = '',
  useImage = false,
}: LogoProps) {
  const sizeMap = {
    sm: { icon: 24, text: 'text-base', gap: 'gap-2' },
    md: { icon: 32, text: 'text-lg', gap: 'gap-2.5' },
    lg: { icon: 42, text: 'text-2xl', gap: 'gap-3' },
    xl: { icon: 56, text: 'text-3xl', gap: 'gap-3.5' },
  };

  const currentSize = sizeMap[size];

  if (useImage) {
    return (
      <div className={`inline-flex items-center ${currentSize.gap} ${className}`}>
        <img
          src="/askmydocsai-logo.jpg"
          alt="Askmydocsai"
          style={{ height: currentSize.icon, width: 'auto', objectFit: 'contain' }}
        />
        {showText && (
          <span
            className={`font-semibold tracking-tight text-white font-['Open_Sans'] ${currentSize.text}`}
          >
            ask<span className="text-[#00C2DE]">my</span>docs<span className="text-[#0051C6]">ai</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center ${currentSize.gap} select-none ${className}`}>
      {/* Precision SVG Vector Mark adapted to AMD Cyan & Cobalt Blue */}
      <svg
        width={currentSize.icon}
        height={currentSize.icon}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="amd-logo-cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00C2DE" />
            <stop offset="100%" stopColor="#0051C6" />
          </linearGradient>
          <linearGradient id="amd-circuit-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0051C6" />
            <stop offset="50%" stopColor="#00C2DE" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
          <filter id="amd-cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Document / Chat Bubble Frame with folded corner */}
        <path
          d="M32 18 H66 L78 30 V72 C78 75.3 75.3 78 72 78 H48 L36 90 V78 H26 C22.7 78 20 75.3 20 72 V30 C20 23.4 25.4 18 32 18 Z"
          stroke="url(#amd-logo-cyan-grad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="rgba(0, 194, 222, 0.05)"
        />

        {/* Folded corner flap */}
        <path
          d="M66 18 V30 H78"
          stroke="#00C2DE"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Intersecting Document Outline */}
        <path
          d="M40 28 H62 M40 38 H55"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Micro-Circuit Traces with AI Node Connection Points */}
        <path
          d="M32 64 L46 50 L56 60 L68 46"
          stroke="url(#amd-circuit-grad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#amd-cyan-glow)"
        />

        {/* Circuit nodes (dots) */}
        <circle cx="32" cy="64" r="4" fill="#0051C6" stroke="#00C2DE" strokeWidth="2" />
        <circle cx="46" cy="50" r="3.5" fill="#00C2DE" />
        <circle cx="56" cy="60" r="3.5" fill="#00C2DE" />
        <circle cx="68" cy="46" r="4.5" fill="#FFFFFF" stroke="#00C2DE" strokeWidth="2" />
      </svg>

      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <span
            className={`font-bold tracking-tight text-white font-['Open_Sans'] ${currentSize.text}`}
          >
            ask<span className="text-[#00C2DE]">my</span>docs<span className="text-[#0051C6]">ai</span>
          </span>
        </div>
      )}
    </div>
  );
}
