import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SceneCanvas } from './components/scene/SceneCanvas'
import './App.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const detailBlocks = [
  {
    title: 'Sculptural Form',
    text: 'A softened vertical silhouette that reads as an object first, then a fountain.',
  },
  {
    title: 'Layered Composition',
    text: 'Stacked elements are proportioned to create rhythm, tension, and visual calm.',
  },
  {
    title: 'Water Detail',
    text: 'Transitions are shaped for smooth flow, controlled spill, and quiet movement.',
  },
  {
    title: 'Material Presence',
    text: 'A warm stone sensibility that holds light gently across curved surfaces.',
  },
]

function App() {
  const rootRef = useRef<HTMLDivElement>(null)
  const assemblySectionRef = useRef<HTMLElement>(null)
  const detailsSectionRef = useRef<HTMLElement>(null)
  const finalSectionRef = useRef<HTMLElement>(null)

  const assemblyProgressRef = useRef(0)
  const finalPhaseRef = useRef(0)

  useGSAP(
    () => {
      const assemblyState = { value: 0 }
      const finalState = { value: 0 }

      gsap.set(['.hero-copy', '.hero-scroll-label'], { autoAlpha: 0, y: 30 })
      gsap.set('.assembly-copy', { autoAlpha: 0, y: 22 })
      gsap.set('.detail-block', { autoAlpha: 0, y: 32 })
      gsap.set(['.closing-line', '.designer-credit'], { autoAlpha: 0, y: 24 })

      gsap.to('.hero-copy', {
        autoAlpha: 1,
        y: 0,
        duration: 1.2,
        ease: 'power2.out',
      })

      gsap.to('.hero-scroll-label', {
        autoAlpha: 1,
        y: 0,
        duration: 1.1,
        delay: 0.25,
        ease: 'power2.out',
      })

      gsap.fromTo(
        '.assembly-copy',
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: assemblySectionRef.current,
            start: 'top 82%',
          },
        },
      )

      gsap
        .timeline({
          scrollTrigger: {
            trigger: assemblySectionRef.current,
            start: 'top top',
            end: '+=360%',
            pin: true,
            scrub: 1.35,
            anticipatePin: 1,
          },
        })
        // Hold on the exploded object and foreground copy before assembly starts.
        .to({}, { duration: 0.84 })
        .to(
          '.assembly-copy',
          {
            autoAlpha: 0,
            y: -28,
            duration: 0.58,
            ease: 'power2.out',
          },
          0.72,
        )
        .to(
          assemblyState,
          {
            value: 1,
            duration: 2.95,
            ease: 'none',
            onUpdate: () => {
              assemblyProgressRef.current = assemblyState.value
            },
          },
          0.9,
        )

      gsap.to('.detail-block', {
        autoAlpha: 1,
        y: 0,
        duration: 1,
        ease: 'power2.out',
        stagger: 0.16,
        scrollTrigger: {
          trigger: detailsSectionRef.current,
          start: 'top 74%',
        },
      })

      gsap.to(finalState, {
        value: 1,
        ease: 'none',
        onUpdate: () => {
          finalPhaseRef.current = finalState.value
        },
        scrollTrigger: {
          trigger: finalSectionRef.current,
          start: 'top 80%',
          end: 'bottom bottom',
          scrub: 1,
        },
      })

      gsap
        .timeline({
          scrollTrigger: {
            trigger: finalSectionRef.current,
            start: 'top 72%',
          },
        })
        .to('.closing-line', {
          autoAlpha: 1,
          y: 0,
          duration: 1.05,
          ease: 'power2.out',
        })
        .to(
          '.designer-credit',
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
          },
          '-=0.45',
        )
    },
    { scope: rootRef },
  )

  return (
    <div ref={rootRef} className="app-shell">
      <SceneCanvas
        assemblyProgressRef={assemblyProgressRef}
        finalPhaseRef={finalPhaseRef}
      />

      <main className="site-content">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="section-eyebrow">Zambak / Lily Fountain</p>
            <h1 className="hero-title">
              A sculptural fountain study in calm movement.
            </h1>
            <p className="hero-subtitle">
              Designed as a warm, quiet centrepiece where proportion, flow, and
              surface come into balance.
            </p>
          </div>
          <p className="hero-scroll-label">Scroll to assemble the form</p>
        </section>

        <section ref={assemblySectionRef} className="assembly-section">
          <div className="assembly-copy">
            <p className="section-eyebrow assembly-kicker">Assembly Sequence</p>
            <h2 className="assembly-title">
              Individual elements settle into one composed silhouette.
            </h2>
            <p className="assembly-note">
              The motion is restrained and deliberate, emphasizing structure
              rather than spectacle.
            </p>
          </div>
        </section>

        <section ref={detailsSectionRef} className="details-section">
          <div className="details-grid">
            {detailBlocks.map((block) => (
              <article key={block.title} className="detail-block">
                <h3>{block.title}</h3>
                <p>{block.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section ref={finalSectionRef} className="final-section">
          <div className="final-copy">
            <p className="closing-line">
              “A quiet object, composed through form, balance, and detail.”
            </p>
            <p className="designer-credit">
              <span className="designer-credit-prefix">BY</span>
              <span className="designer-credit-name">Jusra Meneri</span>
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
