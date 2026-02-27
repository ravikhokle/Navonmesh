// Singleton alert audio utility – plays /audio/audio.mp3 at full volume
const alertSound = new Audio('/audio/audio.mp3');
alertSound.volume = 1.0; // max volume

/**
 * Play the alert sound. Safe to call rapidly – restarts if already playing.
 */
export function playAlertSound() {
  alertSound.currentTime = 0;
  alertSound.play().catch(() => {
    // Browser may block autoplay until user interacts; silently ignore
  });
}

export default playAlertSound;
