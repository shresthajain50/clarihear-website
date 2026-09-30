// Source: React Bits (https://reactbits.dev) SpotlightCard-TS-CSS — MIT + Commons Clause. Vendored unmodified except where marked MODIFIED.
'use client';

// MODIFIED: useEffect added (the pointer is tracked on the existing card, see below).
import React, { useEffect, useRef } from 'react';
import './SpotlightCard.css';

// MODIFIED: children dropped; `target` added. This renders only the spotlight layer inside an
// existing card (which keeps its own element, classes and content), instead of wrapping content.
interface SpotlightCardProps {
  className?: string;
  spotlightColor?: `rgba(${number}, ${number}, ${number}, ${number})`;
  target: HTMLElement;
}

const SpotlightCard: React.FC<SpotlightCardProps> = ({
  className = '',
  spotlightColor = 'rgba(255, 255, 255, 0.25)',
  target
}) => {
  // MODIFIED: a <span> layer (not a wrapping <div>).
  const divRef = useRef<HTMLSpanElement>(null);

  // MODIFIED: a native listener on `target` (the card) instead of onMouseMove on this element,
  // because the layer is pointer-events: none.
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!divRef.current) return;

      const rect = divRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      divRef.current.style.setProperty('--mouse-x', `${x}px`);
      divRef.current.style.setProperty('--mouse-y', `${y}px`);
      divRef.current.style.setProperty('--spotlight-color', spotlightColor);
    };
    target.addEventListener('mousemove', handleMouseMove);
    return () => target.removeEventListener('mousemove', handleMouseMove);
  }, [target, spotlightColor]);

  // MODIFIED: decorative, so aria-hidden; no children.
  return <span ref={divRef} aria-hidden="true" className={`card-spotlight ${className}`} />;
};

export default SpotlightCard;
