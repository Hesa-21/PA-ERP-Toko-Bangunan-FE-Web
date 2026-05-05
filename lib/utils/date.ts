const ID_LOCALE = "id-ID"
const JAKARTA_TZ = "Asia/Jakarta"
const JAKARTA_UTC_OFFSET_HOURS = 7

export function isValidDate(value: unknown): value is Date {
	return value instanceof Date && !Number.isNaN(value.getTime())
}

export function parseIsoSafe(value: unknown): Date | null {
	if (value instanceof Date) return isValidDate(value) ? value : null
	if (typeof value === "number") {
		const d = new Date(value)
		return isValidDate(d) ? d : null
	}
	if (typeof value === "string") {
		const trimmed = value.trim()
		if (!trimmed) return null
		const d = new Date(trimmed)
		return isValidDate(d) ? d : null
	}
	return null
}

export function toIsoDate(input: Date | string | number | null | undefined): string {
	const d = parseIsoSafe(input)
	return d ? d.toISOString().slice(0, 10) : ""
}

export function toIsoDateOnlyString(iso: string | undefined): string {
	const d = parseIsoSafe(iso)
	return d ? d.toISOString().slice(0, 10) : "-"
}

export function formatDateId(input?: string | Date | number | null): string {
	const d = parseIsoSafe(input)
	return d ? d.toLocaleDateString(ID_LOCALE) : "-"
}

export function formatDateIdJakarta(input?: string | Date | number | null): string {
	const d = parseIsoSafe(input)
	if (!d) return "-"
	return new Intl.DateTimeFormat(ID_LOCALE, { timeZone: JAKARTA_TZ }).format(d)
}

export function getJakartaDayBoundsMs(date: Date): { startMs: number; endMs: number } {
	const year = date.getFullYear()
	const month = date.getMonth()
	const day = date.getDate()

	const startMs = Date.UTC(year, month, day, 0, 0, 0, 0) - JAKARTA_UTC_OFFSET_HOURS * 60 * 60 * 1000
	return {
		startMs,
		endMs: startMs + 24 * 60 * 60 * 1000 - 1,
	}
}

export function formatDateTimeId(input?: string | Date | number | null): string {
	const d = parseIsoSafe(input)
	return d ? d.toLocaleString(ID_LOCALE) : "-"
}

export function startOfDay(date: Date): Date {
	const d = new Date(date)
	d.setHours(0, 0, 0, 0)
	return d
}

export function endOfDay(date: Date): Date {
	const d = new Date(date)
	d.setHours(23, 59, 59, 999)
	return d
}

export function addDays(date: Date, days: number): Date {
	const d = new Date(date)
	d.setDate(d.getDate() + Math.trunc(Number(days) || 0))
	return d
}

export function diffDays(a: Date, b: Date): number {
	const startA = startOfDay(a).getTime()
	const startB = startOfDay(b).getTime()
	return Math.trunc((startA - startB) / 86_400_000)
}

export function isSameDay(a: Date, b: Date): boolean {
	return startOfDay(a).getTime() === startOfDay(b).getTime()
}

export function isToday(input: Date | string | number | null | undefined, now = new Date()): boolean {
	const d = parseIsoSafe(input)
	if (!d) return false
	return isSameDay(d, now)
}

export function isOverdue(dueDate: string | Date | null | undefined, now = new Date()): boolean {
	const due = parseIsoSafe(dueDate)
	if (!due) return false
	return endOfDay(due).getTime() < startOfDay(now).getTime()
}

export function dayKeyJakarta(date: Date): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: JAKARTA_TZ,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date)

	const y = parts.find((p) => p.type === "year")?.value ?? "0000"
	const m = parts.find((p) => p.type === "month")?.value ?? "00"
	const d = parts.find((p) => p.type === "day")?.value ?? "00"
	return `${y}-${m}-${d}`
}

export function isTodayJakarta(iso: string | undefined, now: Date): boolean {
	const when = new Date(iso ?? "")
	if (Number.isNaN(when.getTime())) return false
	return dayKeyJakarta(when) === dayKeyJakarta(now)
}

export function formatWeekdayShortJakarta(date: Date): string {
	return new Intl.DateTimeFormat(ID_LOCALE, {
		weekday: "short",
		timeZone: JAKARTA_TZ,
	}).format(date)
}
