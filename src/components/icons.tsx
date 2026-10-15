import { useId, type SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const NewChatIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-5" />
    <path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L13 13.8l-4 1 1-4z" />
  </Icon>
)

export const LogoutIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14 4h3a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-3" />
    <path d="M10 17l-5-5 5-5" />
    <path d="M5 12h11" />
  </Icon>
)

export const BackIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M15 18l-6-6 6-6" />
  </Icon>
)

export const SendIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 19V5" />
    <path d="M6 11l6-6 6 6" />
  </Icon>
)

export const UserIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icon>
)

export const ClockIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l2.5 2" />
  </Icon>
)

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
)

export const DoubleCheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2 12.5l4.5 4.5L16 7.5" />
    <path d="M12 16l1 1 9.5-9.5" />
  </Icon>
)

export const AlertIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5" />
    <path d="M12 16.5h.01" />
  </Icon>
)

/** The MAX logo silhouette with the brand gradient. */
export function MaxLogo({ size = 48 }: { size?: number }) {
  const gradientId = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#08d7f3" />
          <stop offset="0.5" stopColor="#526eff" />
          <stop offset="1" stopColor="#bf97ff" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        fillRule="evenodd"
        d="M24 4C13 4 4 12.6 4 23.4c0 4.4 1.5 8.4 4 11.6l-1.6 7.2c-.2 1 .8 1.8 1.7 1.3l6.6-3.3c2.8 1.3 6 2.1 9.3 2.1 11 0 20-8.6 20-19.4S35 4 24 4Zm0 9c-5.8 0-10.4 4.6-10.4 10.4S18.2 33.8 24 33.8s10.4-4.7 10.4-10.4S29.8 13 24 13Z"
      />
    </svg>
  )
}
