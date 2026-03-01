# Zambak / Lily Fountain Showcase

Premium single-page project presentation for a 3D fountain model, built with Vite, React, TypeScript, Three.js, and GSAP ScrollTrigger.

## Stack

- Vite + React + TypeScript
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `gsap`
- `ScrollTrigger`
- `@gsap/react`

## Local Development

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.

## Build

```bash
npm run build
```

## Model Asset

The GLB is loaded from:

`/public/models/zambak.glb`

and referenced in code as:

`/models/zambak.glb`

## Project Structure

```text
src/
  components/
    scene/
      SceneCanvas.tsx
      FountainModel.tsx
  App.tsx
  App.css
  index.css
```

## Notes

- The assembly animation is mesh-name agnostic: the model is traversed at runtime and visible meshes are grouped dynamically for best-effort exploded-to-assembled motion.
- Scroll-triggered timelines are wired with `useGSAP()` and cleaned up through GSAP context scoping.
