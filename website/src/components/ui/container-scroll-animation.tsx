import { type ReactNode, useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

export function ContainerScroll({ titleComponent, children }: { titleComponent: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const [mobile, setMobile] = useState(false)
  useEffect(() => { const resize = () => setMobile(window.innerWidth < 720); resize(); addEventListener('resize', resize); return () => removeEventListener('resize', resize) }, [])
  const rotateX = useTransform(scrollYProgress, [0, 1], [mobile ? 8 : 18, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [mobile ? .92 : 1.03, 1])
  const y = useTransform(scrollYProgress, [0, 1], [0, -64])
  return <section className="scroll-stage" ref={ref}><motion.div className="scroll-title" style={{ y }}>{titleComponent}</motion.div><motion.div className="scroll-card" style={{ rotateX, scale }}>{children}</motion.div></section>
}
