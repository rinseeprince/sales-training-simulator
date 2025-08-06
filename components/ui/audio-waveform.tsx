'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface AudioWaveformProps {
  isRecording: boolean
  isPaused: boolean
  className?: string
}

export function AudioWaveform({ isRecording, isPaused, className = '' }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bars = 20
    const barWidth = canvas.width / bars
    const barSpacing = 2

    const animate = () => {
      if (!isRecording || isPaused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'hsl(var(--primary))'

      for (let i = 0; i < bars; i++) {
        const height = Math.random() * (canvas.height * 0.8) + canvas.height * 0.1
        const x = i * (barWidth + barSpacing)
        const y = (canvas.height - height) / 2

        ctx.fillRect(x, y, barWidth, height)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isRecording, isPaused])

  return (
    <div className={`flex items-center justify-center space-x-1 ${className}`}>
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-primary rounded-full"
          style={{
            height: isRecording && !isPaused ? `${20 + Math.random() * 40}px` : '20px',
          }}
          animate={{
            height: isRecording && !isPaused 
              ? [20, 60, 20] 
              : 20,
          }}
          transition={{
            duration: 0.5,
            repeat: isRecording && !isPaused ? Infinity : 0,
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  )
} 