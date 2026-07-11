import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import Link from "next/link"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-mv-green text-mv-cream-soft hover:bg-mv-green-dark shadow-mv-sm",
        primary: "bg-mv-green text-mv-cream-soft hover:bg-mv-green-dark shadow-mv-sm",
        outline:
          "border-mv-border bg-mv-surface hover:bg-mv-cream-soft aria-expanded:bg-mv-cream-soft",
        secondary:
          "bg-mv-surface border border-mv-border text-mv-ink hover:bg-mv-cream-soft shadow-mv-sm",
        ghost: "text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink",
        destructive: "bg-mv-red text-white hover:bg-[#963a2f] shadow-mv-sm",
        danger: "bg-mv-red text-white hover:bg-[#963a2f] shadow-mv-sm",
        lime: "bg-mv-lime text-mv-green-darker hover:brightness-95 shadow-mv-sm",
        link: "text-mv-green-dark underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5 text-[13.5px] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        md: "h-9 px-3.5 text-[13.5px] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-2.5 text-[12.5px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-1.5 px-4 text-sm",
        icon: "size-9",
        "icon-xs": "size-6 rounded-[min(var(--radius-md),10px)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-[min(var(--radius-md),12px)]",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonBaseProps = VariantProps<typeof buttonVariants> & {
  className?: string
  children?: React.ReactNode
}

type ButtonAsLink = ButtonBaseProps & {
  href: string
  onClick?: () => void
}

type ButtonAsButton = ButtonBaseProps &
  Omit<React.ComponentProps<typeof ButtonPrimitive>, "className"> & {
    href?: undefined
  }

function Button(props: ButtonAsLink | ButtonAsButton) {
  const { className, variant, size, children } = props
  const classes = cn(buttonVariants({ variant, size, className }))

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={classes} onClick={props.onClick}>
        {children}
      </Link>
    )
  }

  const { href: _href, variant: _v, size: _s, className: _c, ...rest } =
    props as ButtonAsButton
  void _href
  void _v
  void _s
  void _c
  return (
    <ButtonPrimitive data-slot="button" className={classes} {...rest}>
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
