import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import type { ButtonConfig } from '../types';
import {
  getLibraryIconComponent,
  isLibraryIcon,
  isPackIcon,
} from '../iconLibrary';
import { useResolvedPackIconSrc } from '../hooks/useResolvedPackIcon';

interface Props {
  button: ButtonConfig;
  onHover: () => void;
}

export default function GridButton({ button, onHover }: Props) {
  const { executeButton, setSettingsOpen, setEditingButton } = useStore();
  const [imgError, setImgError] = useState(false);
  const hasCommand = button.command.trim().length > 0;
  const isLibIcon = isLibraryIcon(button.icon);
  const isPack = isPackIcon(button.icon);
  const IconComponent = getLibraryIconComponent(button.icon);
  const { src: packSrc } = useResolvedPackIconSrc(button.icon);
  const showFallback =
    !button.icon ||
    (isLibIcon && !IconComponent) ||
    (isPack && (!packSrc || imgError)) ||
    (!isLibIcon && !isPack && imgError);

  // Reset imgError when icon path changes so it retries loading
  useEffect(() => {
    setImgError(false);
  }, [button.icon]);

  const handleClick = () => {
    if (hasCommand) {
      executeButton(button);
    } else {
      // Open settings on this button for editing
      setEditingButton(button.id);
      setSettingsOpen(true);
    }
  };

  return (
    <motion.button
      className="glass-button flex flex-col items-center justify-center cursor-pointer relative aspect-square w-full p-2"
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onHoverStart={onHover}
      onClick={handleClick}
      layout
    >
      {/* Label above icon */}
      {button.label && (
        <span className="text-[10px] text-white/50 truncate max-w-full px-1 leading-tight shrink-0">
          {button.label}
        </span>
      )}

      {/* Icon */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden min-h-0">
        {showFallback ? (
          button.label ? (
            <span className="text-2xl font-semibold text-white/70">
              {button.label.charAt(0).toUpperCase()}
            </span>
          ) : (
            <span className="text-lg text-white/20">+</span>
          )
        ) : isLibIcon && IconComponent ? (
          <IconComponent className="w-8 h-8 text-white/75" />
        ) : isPack && packSrc ? (
          <img
            src={packSrc}
            alt={button.label}
            className="max-w-full max-h-full object-contain"
            onError={() => setImgError(true)}
            draggable={false}
          />
        ) : (
          <img
            src={button.icon}
            alt={button.label}
            className="max-w-full max-h-full object-contain"
            onError={() => setImgError(true)}
            draggable={false}
          />
        )}
      </div>
    </motion.button>
  );
}
