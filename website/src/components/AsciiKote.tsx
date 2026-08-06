import { useEffect, useRef } from 'react'
import hero from '../assets/hero.png'

const word = 'KOTE'
export function AsciiKote() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!; const ctx = canvas.getContext('2d')!; const image = new Image(); image.src = hero
    let frame = 0; let id = 0
    const draw = (time: number) => {
      const width = canvas.clientWidth * devicePixelRatio; const height = canvas.clientHeight * devicePixelRatio
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#161311'; ctx.fillRect(0, 0, width, height)
      const small = document.createElement('canvas'); small.width = Math.max(1, Math.floor(width / 14)); small.height = Math.max(1, Math.floor(height / 14)); const s = small.getContext('2d')!
      s.drawImage(image, 0, 0, small.width, small.height); const pixels = s.getImageData(0, 0, small.width, small.height).data
      ctx.font = `${Math.max(10, width / small.width)}px ui-monospace`; ctx.textBaseline = 'top'
      for (let y = 0; y < small.height; y++) for (let x = 0; x < small.width; x++) { const i = (y * small.width + x) * 4; const light = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 765; if (light < .16) continue; const flicker = .78 + Math.sin(time / 380 + x * .7 + y) * .22; ctx.fillStyle = `rgba(${Math.round(47 + light * 160)},${Math.round(211 - light * 95)},${Math.round(112 - light * 65)},${light * flicker})`; ctx.fillText(word[(x + y + frame) % word.length], x * 14, y * 14) }
      ctx.fillStyle = 'rgba(0,255,102,.08)'; ctx.fillRect(0, 0, width, height); frame++; id = requestAnimationFrame(draw)
    }
    image.onload = () => { id = requestAnimationFrame(draw) }; return () => cancelAnimationFrame(id)
  }, [])
  return <canvas className="ascii-canvas" ref={ref} aria-label="Motif animé Koté" />
}
