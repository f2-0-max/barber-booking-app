import React from 'react';
import { motion } from 'framer-motion';

interface PromoBannerProps {
  imageUrl?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({
  imageUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663749492245/hoKEj8UJ2qK57LEiRureBK/promo-banner-Fc822e8ER4TMb7qdQGQh5m.webp',
  onClose,
  showCloseButton = true,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="relative w-full overflow-hidden rounded-lg shadow-2xl"
    >
      {/* Banner Image */}
      <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden">
        <img
          src={imageUrl}
          alt="Exclusive Offer - Free Skin Care Treatment"
          className="w-full h-full object-cover"
        />
        
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
      </div>

      {/* Close Button */}
      {showCloseButton && onClose && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all"
          aria-label="Close banner"
        >
          <svg
            className="w-5 h-5 text-gray-800"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </motion.button>
      )}

      {/* Shine Effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{
          x: ['100%', '-100%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatType: 'loop',
        }}
      />
    </motion.div>
  );
};

export default PromoBanner;
