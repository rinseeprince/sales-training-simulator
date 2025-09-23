'use client'

import { motion } from 'framer-motion'

interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  title: string
  height?: number
}

export function SimpleBarChart({ data, title, height = 200 }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-slate-700">{title}</h4>
      <div className="flex items-end space-x-2" style={{ height }}>
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(item.value / maxValue) * (height - 40)}px` }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className={`w-full rounded-t-md ${item.color || 'bg-primary'} min-h-[4px]`}
            />
            <div className="text-xs text-slate-600 mt-2 text-center">
              <div className="font-medium">{item.value}</div>
              <div className="text-slate-500">{item.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface LineChartProps {
  data: { label: string; value: number }[]
  title: string
  height?: number
}

export function SimpleLineChart({ data, title, height = 200 }: LineChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue
  
  if (data.length === 0) {
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-slate-700">{title}</h4>
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
          No data available
        </div>
      </div>
    )
  }
  
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = range > 0 ? ((maxValue - item.value) / range) * (height - 60) + 20 : height / 2
    return `${x},${y}`
  }).join(' ')
  
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-slate-700">{title}</h4>
      <div className="relative" style={{ height }}>
        <svg className="w-full h-full">
          <motion.polyline
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2 }}
            fill="none"
            stroke="rgb(59 130 246)"
            strokeWidth="2"
            points={points}
            vectorEffect="non-scaling-stroke"
          />
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 100
            const y = range > 0 ? ((maxValue - item.value) / range) * (height - 60) + 20 : height / 2
            return (
              <motion.circle
                key={index}
                initial={{ r: 0 }}
                animate={{ r: 4 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                cx={`${x}%`}
                cy={y}
                fill="rgb(59 130 246)"
              />
            )
          })}
        </svg>
        <div className="flex justify-between mt-2">
          {data.map((item, index) => (
            <div key={index} className="text-xs text-slate-500 text-center">
              <div className="font-medium">{item.value}</div>
              <div>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface PieChartProps {
  data: { label: string; value: number; color: string }[]
  title: string
  size?: number
}

export function SimplePieChart({ data, title, size = 120 }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  if (total === 0) {
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-slate-700">{title}</h4>
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
          No data available
        </div>
      </div>
    )
  }
  
  let currentAngle = 0
  const radius = size / 2 - 10
  const center = size / 2
  
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-slate-700">{title}</h4>
      <div className="flex items-center space-x-4">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size}>
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100
              const angle = (item.value / total) * 360
              
              if (item.value === 0) return null
              
              const startAngle = currentAngle
              const endAngle = currentAngle + angle
              currentAngle = endAngle
              
              const startAngleRad = (startAngle * Math.PI) / 180
              const endAngleRad = (endAngle * Math.PI) / 180
              
              const x1 = center + radius * Math.cos(startAngleRad)
              const y1 = center + radius * Math.sin(startAngleRad)
              const x2 = center + radius * Math.cos(endAngleRad)
              const y2 = center + radius * Math.sin(endAngleRad)
              
              const largeArc = angle > 180 ? 1 : 0
              
              const pathData = [
                `M ${center} ${center}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ')
              
              return (
                <motion.path
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  d={pathData}
                  fill={item.color}
                  stroke="white"
                  strokeWidth="2"
                />
              )
            })}
          </svg>
        </div>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-slate-700">
                {item.label}: {item.value} ({Math.round((item.value / total) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}