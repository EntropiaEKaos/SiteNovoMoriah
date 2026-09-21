// Firebase is intentionally disabled for the initial launch certification.
// Reintroduce it in an isolated post-launch change once production is stable.
export const firebaseConfigured=false;
export function getFirebaseApp(){return null}
