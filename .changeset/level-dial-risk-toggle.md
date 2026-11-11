---
'agents-kit-svelte': minor
---

New in `agents-kit-svelte/chat`: `LevelDial` and `RiskToggle`, two controls for how far an agent may go on its own.

`LevelDial` shows ordered autonomy levels (for example Careful, Balanced, Trusted, Autopilot) as a keyboard-friendly track, with what the selected level does on its own and what it still asks about. Selecting only previews. Moving up asks for a confirm that names what the level newly allows; moving down applies in one press. It is controlled: pass `value`, handle `onChange(levelId, { direction })`, and pass the new value back. `levelChanges()` and `levelDirection()` are exported helpers.

`RiskToggle` is a switch for a risky setting. Turning it the risky way opens the risk points and an "I understand" checkbox, and the confirm button stays disabled until it is ticked; `onChange(next, { acknowledged })` reports the choice. The safe direction applies at once. Both are registered for `IntelligentUIRenderer` as `level-dial` and `risk-toggle`, and sample data is in `SAMPLE_AUTONOMY_LEVELS` and `SAMPLE_RISK_TOGGLE` (`agents-kit-svelte/fixtures`).
