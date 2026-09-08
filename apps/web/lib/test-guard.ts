/**
 * Module-level singleton that tracks whether an assessment (test/assignment)
 * is currently in progress. Components that want to guard navigation
 * (CourseToc sidebar links, back-to-dashboard link, etc.) can check
 * `isTestActive()` before navigating and, if true, invoke
 * `getExitConfirm()` to retrieve the registered confirmation callback.
 */

let _active = false;
let _confirmCallback: (() => Promise<void>) | null = null;

/** Called by TestViewer when a test/assignment phase starts. */
export function registerTestGuard(onConfirmExit: () => Promise<void>) {
  _active = true;
  _confirmCallback = onConfirmExit;
}

/** Called by TestViewer when the test phase ends (submitted, exited, or component unmounts). */
export function clearTestGuard() {
  _active = false;
  _confirmCallback = null;
}

/** Returns true while a test/assignment is in the active 'test' phase. */
export function isTestActive(): boolean {
  return _active;
}

/**
 * Returns the registered exit-confirm callback, or null if no test is active.
 * The callback saves answers and returns the student to the instructions screen.
 */
export function getExitConfirmCallback(): (() => Promise<void>) | null {
  return _confirmCallback;
}
