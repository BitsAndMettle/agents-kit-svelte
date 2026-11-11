---
'agents-kit-svelte': minor
---

Two cards for running a fleet of agents from a phone. `FleetStatus` (workflows entry) lists the machines that run agent work: presence and last seen, busy slots as "4 of 6" with a segmented bar, what runs on each machine (collapsed to "+N more"), warning chips for missing safeguards, the machine the operator agent lives on, and a summary header. `ActionReceipt` (chat entry) is one record of something an agent did or refused to do, with the reason, who did it, the run that proposed it and an Undo that shows while it is done; use `compact` for inbox rows. Both are registered in the Intelligent UI registry as `fleet-status` and `action-receipt`. New types: `Machine`, `MachineWork`, `MachineFlag`, `ActionTarget`, `ActionOutcome` and friends, plus the `fleetSummary`, `slotSegments`, `relativeTime` and `workPreview` helpers.
