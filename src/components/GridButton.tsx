/**
 *  __   __  ________
 *  \ \ / / |___  __/
 *   \ V /      / /   
 *    > <      / /    
 *   / ^ \    / /___  
 *  /_/ \_\  /______/ 
 * 
 * Botón Individual de la Cuadrícula - XYZ Dashboard
 * #xyz-rainbow #xyz-rainbowtechnology #rainbowtechnology.xyz
 */

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
import { toDisplaySrc } from '../utils/fileImageSrc';

interface Props {
  button: ButtonConfig;
  onHover: () => void;
}

export default function GridButton({ button, onHover }: Props) {
  const { executeButton, setSettingsOpen, setEditingButton, windowScalePercent } = useStore();
  const [imgError, setImgError] = useState(false);
  const hasCommand = button.command.trim().length > 0;
  const isLibIcon = isLibraryIcon(button.icon);
  const isPack = isPackIcon(button.icon);
  const IconComponent = getLibraryIconComponent(button.icon);
  const { src: packSrc } = useResolvedPackIconSrc(button.icon);
  
  // Determina si se debe mostrar el fallback (inicial del nombre o símbolo +)
  const showFallback =
    !button.icon ||
    (isLibIcon && !IconComponent) ||
    (isPack && (!packSrc || imgError)) ||
    (!isLibIcon && !isPack && imgError);
    
  // Cálculos de escala basados en el tamaño de la ventana
  const uiScale = Math.min(1.8, Math.max(1, windowScalePercent / 100));
  const iconPx = Math.min(86, Math.max(28, Math.round(30 * uiScale)));
  const labelPx = Math.min(13, Math.max(10, Math.round(10 * Math.sqrt(uiScale))));
  const buttonPadPx = Math.min(12, Math.max(8, Math.round(8 * Math.sqrt(uiScale))));

  // Reiniciar error de imagen cuando cambia la ruta del icono para reintentar la carga
  useEffect(() => {
    setImgError(false);
  }, [button.icon]);

  const handleClick = () => {
    if (hasCommand) {
      executeButton(button);
    } else {
      // Abrir ajustes en este botón para edición directa
      setEditingButton(button.id);
      setSettingsOpen(true);
    }
  };

  return (
    <motion.button
      className="glass-button flex flex-col items-center justify-center cursor-pointer relative aspect-square w-full p-2"
      style={{ padding: `${buttonPadPx}px` }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onHoverStart={onHover}
      onClick={handleClick}
      layout
    >
      {/* Etiqueta superior del icono */}
      {button.label && (
        <span
          className="text-white/50 truncate max-w-full px-1 leading-tight shrink-0"
          style={{ fontSize: `${labelPx}px` }}
        >
          {button.label}
        </span>
      )}

      {/* Área del Icono */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden min-h-0">
        {showFallback ? (
          button.label ? (
            <span
              className="font-semibold text-white/70"
              style={{ fontSize: `${Math.round(24 * Math.sqrt(uiScale))}px` }}
            >
              {button.label.charAt(0).toUpperCase()}
            </span>
          ) : (
            <span
              className="text-white/20"
              style={{ fontSize: `${Math.round(18 * Math.sqrt(uiScale))}px` }}
            >
              +
            </span>
          )
        ) : isLibIcon && IconComponent ? (
          <IconComponent
            className="text-white/75"
            style={{ width: `${iconPx}px`, height: `${iconPx}px` }}
          />
        ) : isPack && packSrc ? (
          <img
            src={packSrc}
            alt={button.label}
            className="object-contain"
            style={{ width: `${iconPx}px`, height: `${iconPx}px` }}
            onError={() => setImgError(true)}
            draggable={false}
          />
        ) : (
          <img
            src={toDisplaySrc(button.icon ?? '')}
            alt={button.label}
            className="object-contain"
            style={{ width: `${iconPx}px`, height: `${iconPx}px` }}
            onError={() => setImgError(true)}
            draggable={false}
          />
        )}
      </div>
    </motion.button>
  );
}
