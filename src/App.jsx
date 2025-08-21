import { useState } from "react";
import Confetti from "react-confetti";
import { motion, AnimatePresence } from "framer-motion";

export default function App() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      {open && <Confetti numberOfPieces={300} recycle={false} />}

      <motion.div
        onClick={() => setOpen(true)}
        className="cursor-pointer select-none"
        initial={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence>
          {!open ? (
            <motion.div
              key="box"
              className="w-48 h-48 bg-gradient-to-tr from-pink-500 to-red-500 rounded-2xl shadow-2xl flex items-center justify-center relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="absolute top-2 w-full flex justify-center">
                <div className="w-32 h-2 bg-white rounded-full" />
              </div>
              <span className="text-white font-semibold text-lg">🎁</span>
            </motion.div>
          ) : (
            <motion.div
              key="message"
              className="w-80 p-8 bg-white rounded-2xl shadow-2xl text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p className="text-xl font-semibold text-gray-800 leading-relaxed">
                Sana aşığım <span className="text-pink-600">Sude</span>,<br />
                merak etme <span className="text-red-500">her şey geçecek ❤️</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
