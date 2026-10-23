# Cleanup list

Code kept on purpose for a while, with the date to look at it again. When a date has passed, ask Menno before
deleting anything; if he agrees, remove it, update the comments that point here, and take the row off this list.

| Look again on | What | Where | Why it's kept |
|---|---|---|---|
| 22 Dec 2026 | The "🎲 Automatic" choice under ☰ → Rolling, and the `ui.rolling === 'auto'` branch | `src/engine/06b-throw-dice.js` (`throwOn`, `rollStyleRow`, `setRollStyle`), `rollstyle` in `20-events.js` | "Throw it yourself" became the default on 23 Oct 2026. The old always-automatic way stays as a menu choice in case players miss it or it needs rolling back. **Not** to delete: the automatic throw itself (`dice3d`, §6), which "Roll for me", reduced motion, devices without 3D and the dice-set previews still use. |
