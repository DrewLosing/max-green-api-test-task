import { useState } from 'react'
import { UserIcon } from './icons'
import styles from './Avatar.module.css'

/** MAX avatar gradients (--avatar-chat-* tokens). */
const GRADIENTS = [
  ['#08d7f3', '#5398ff'],
  ['#bf97ff', '#526eff'],
  ['#ff48b6', '#ff8a35'],
  ['#14e1d5', '#03c722'],
  ['#ffc93d', '#ff832a'],
] as const

function hash(value: string): number {
  let result = 0
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) >>> 0
  return result
}

function initials(name: string): string | null {
  const letters = name
    .split(/\s+/)
    .filter((word) => /^\p{L}/u.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
  return letters || null
}

interface AvatarProps {
  name: string
  /** Picks the gradient, so a chat keeps its color when renamed. */
  seed: string
  size: number
  /** Profile photo; initials show while it loads and if it fails. */
  src?: string
}

export function Avatar({ name, seed, size, src }: AvatarProps) {
  const [brokenSrc, setBrokenSrc] = useState<string>()
  const [from, to] = GRADIENTS[hash(seed) % GRADIENTS.length]
  const letters = initials(name)
  return (
    <span
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
      }}
      aria-hidden="true"
    >
      {letters ?? <UserIcon width={size * 0.5} height={size * 0.5} />}
      {src && src !== brokenSrc && (
        <img
          className={styles.image}
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setBrokenSrc(src)}
        />
      )}
    </span>
  )
}
