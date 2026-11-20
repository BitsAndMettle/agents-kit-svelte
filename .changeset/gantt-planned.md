---
'agents-kit-svelte': minor
---

AgentHandoffGantt draws what is planned, a note a lane and who works it now. A span with `status: 'planned'` is an estimate: outlined in the neutral ink, never pressed or focused, and outside Live, Elapsed and the token sum, while still stretching the axis. `HandoffLane.note` puts one short line in a column at the lane's end, as wide as the longest note. `HandoffLane.worker` draws that name's `Avatar`, breathing, at the end of the lane's label, clips the label short of it, and says ", worked by …" in the lane's name. `laneHeight` (bars 24px in the default 46px lanes, 14px in 30px ones, with no words inside a bar under 20px) and `labelWidth` size the chart. With `breaks`, each stretch of open time is labelled at its own start. `Avatar` and `AvatarGroup` take `size="2xs"`, 16px.

What moves without the new props: grid lines are solid hairlines (a dash is kept for what has not happened), and the phases `gate` and `queue`, where no agent holds the work, are drawn in the neutral ink rather than a series colour.
