/**
 * Where a value sits between min and max, from 0 to 1, for painting a slider's filled track.
 * Clamped, and 0 when the range is empty or a number is not finite.
 */
export function sliderRatio(value: number, min: number, max: number): number {
	if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
	return Math.min(1, Math.max(0, (value - min) / (max - min)));
}
