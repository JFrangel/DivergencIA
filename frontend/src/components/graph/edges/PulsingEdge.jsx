import { memo } from 'react'
import { getBezierPath } from 'reactflow'

function PulsingEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}) {
  const [edgePath] = getBezierPath({
    sourceX, sourceY,
    targetX, targetY,
    sourcePosition,
    targetPosition,
  })

  const color = data?.color || 'rgba(255,255,255,0.12)'

  return (
    <>
      {/* Base edge */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          stroke: color,
          strokeWidth: 1.5,
          fill: 'none',
          ...style,
        }}
      />
      {/* Animated dash overlay */}
      <path
        d={edgePath}
        style={{
          stroke: color,
          strokeWidth: 1.5,
          fill: 'none',
          strokeDasharray: '5 5',
          strokeDashoffset: 0,
          animation: 'dashmove 1.5s linear infinite',
          opacity: 0.6,
        }}
      />
      <style>{`
        @keyframes dashmove {
          to { stroke-dashoffset: -20; }
        }
      `}</style>
    </>
  )
}

export default memo(PulsingEdge)
