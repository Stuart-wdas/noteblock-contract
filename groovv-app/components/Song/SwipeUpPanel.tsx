import { motion, useMotionValue, useTransform } from 'framer-motion';

export default function SwipeUpPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-300, 0], [1, 0]);

  return (
    <motion.div
      className='fixed bottom-0 left-0 right-0 bg-gray-900 rounded-t-xl shadow-lg z-1500'
      style={{ y, opacity }}
      drag='y'
      dragConstraints={{ top: -300, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={(e, info) => {
        if (info.point.y > 100) {
          y.set(0); // collapse
        } else {
          y.set(-300); // fully open
        }
      }}
    >
      <div className='p-4'>{children}</div>
    </motion.div>
  );
}
