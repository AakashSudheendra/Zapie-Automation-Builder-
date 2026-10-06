"use client"

import Image from "next/image"
import React from "react"
import { cn } from "@/lib/utils"

interface InfiniteMovingCardsProps {
  items: {
    href: string
  }[]
  direction?: "left" | "right"
  speed?: "fast" | "normal" | "slow"
  pauseOnHover?: boolean
  className?: string
}

export const InfiniteMovingCards = ({
  items,
  direction = "left",
  speed = "fast",
  pauseOnHover = true,
  className,
}: InfiniteMovingCardsProps) => {
  const duration = speed === "fast" ? "20s" : speed === "normal" ? "40s" : "80s"

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        "[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]",
        className
      )}
    >
      <div
        className={cn(
          "infinite-track flex w-max items-center gap-16",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
        style={{
          animationDuration: duration,
          animationDirection: direction === "right" ? "reverse" : "normal",
        }}
      >
        {/* First set */}
        {items.map((item, index) => (
          <div
            key={`first-${index}`}
            className="flex h-16 w-[180px] shrink-0 items-center justify-center"
          >
            <Image
              src={item.href}
              width={180}
              height={60}
              alt="Client logo"
              className="h-10 w-auto object-contain opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
            />
          </div>
        ))}

        {/* Duplicate set */}
        {items.map((item, index) => (
          <div
            key={`second-${index}`}
            className="flex h-16 w-[180px] shrink-0 items-center justify-center"
          >
            <Image
              src={item.href}
              width={180}
              height={60}
              alt="Client logo"
              className="h-10 w-auto object-contain opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
