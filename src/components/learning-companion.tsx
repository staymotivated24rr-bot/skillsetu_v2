'use client';
import { useId, type CSSProperties } from 'react';
import styles from './learning-companion.module.css';
export function LearningCompanion({
  mood = 'thinking',
  compact = false,
}: {
  mood?: 'thinking' | 'matched' | 'explore';
  compact?: boolean;
}) {
  const gradientId = useId();
  return (
    <div className={styles.companion} data-mood={mood} data-compact={compact} aria-hidden="true">
      <span className={styles.shadow} />
      <svg className={styles.robot} viewBox="0 0 180 180" fill="none">
        <defs>
          <linearGradient
            id={`orbit-shell-${gradientId}`}
            x1="45"
            y1="35"
            x2="142"
            y2="144"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#d0b1ff" />
            <stop offset="1" stopColor="#7855b1" />
          </linearGradient>
        </defs>
        <g className={styles.body}>
          <path d="M89 39V24" stroke="#b89bdc" strokeWidth="5" strokeLinecap="round" />
          <circle className={styles.beacon} cx="89" cy="20" r="7" fill="#ffc877" />
          <path
            className={styles.leftArm}
            d="M49 91L28 81L21 91"
            stroke="#bba1e3"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className={styles.rightArm}
            d="M131 91L151 72L158 77"
            stroke="#bba1e3"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M51 56Q89 36 128 56L140 111Q129 143 91 148Q53 143 40 111Z"
            fill={`url(#orbit-shell-${gradientId})`}
            stroke="#e0c7ff"
            strokeWidth="3"
          />
          <rect x="54" y="67" width="73" height="48" rx="19" fill="#2c2341" />
          <g className={styles.eyes}>
            <ellipse cx="75" cy="87" rx="5" ry="7" fill="#a4f1dc" />
            <ellipse cx="107" cy="87" rx="5" ry="7" fill="#a4f1dc" />
          </g>
          <path
            d={mood === 'explore' ? 'M86 102Q92 99 98 102' : 'M83 101Q91 109 100 101'}
            stroke="#a4f1dc"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M79 128L90 135L102 126"
            stroke="#e7d5fc"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
      {mood === 'matched' && (
        <div className={styles.sparkles}>
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} style={{ '--piece': i } as CSSProperties} />
          ))}
        </div>
      )}
    </div>
  );
}
