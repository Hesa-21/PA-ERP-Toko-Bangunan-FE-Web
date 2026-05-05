"use client"

import { useEffect, useState } from "react"

function formatIndonesianDate(date: Date) {
  // Use a fixed timezone to avoid server/client mismatches in production.
  const formatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date)

  // Common output is "Senin, 12/01/2026" → convert to "Senin, 12-01-2026".
  return formatted.replaceAll("/", "-")
}

export function CurrentDate() {
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const update = () => setNow(new Date())
    // Update at the start, then every minute
    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <time
      className="text-base md:text-lg text-gray-800"
      aria-label="Tanggal sekarang"
      dateTime={now.toISOString()}
      suppressHydrationWarning
    >
      {formatIndonesianDate(now)}
    </time>
  )
}
