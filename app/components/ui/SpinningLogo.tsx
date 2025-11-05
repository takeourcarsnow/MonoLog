import Image from 'next/image';

interface SpinningLogoProps {
  size?: number;
  className?: string;
  invertInLight?: boolean;
  noScale?: boolean;
}

export function SpinningLogo({ size = 24, className = '', invertInLight = false, noScale = false }: SpinningLogoProps) {
  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes subtleSpin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes spinOnly {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(180deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <Image
        src="/logo.svg"
        alt="loading"
        width={size}
        height={size}
        className={`mx-auto ${className}`}
        style={{ animation: `fadeIn 50ms forwards, ${noScale ? 'spinOnly' : 'subtleSpin'} 1.5s infinite`, filter: invertInLight ? 'invert(1)' : 'none' }}
      />
    </>
  );
}