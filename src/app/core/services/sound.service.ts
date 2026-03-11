import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationSoundService {
  private audioContext?: AudioContext;

  initialize(): void {
    try {
      if (this.audioContext) {
        return;
      }

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      const unlockAudio = () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(error => {
            console.error('Erreur reprise AudioContext:', error);
          });
        }
      };

      document.addEventListener('click', unlockAudio, { once: true });
      document.addEventListener('touchstart', unlockAudio, { once: true });
      document.addEventListener('keydown', unlockAudio, { once: true });
    } catch (error) {
      console.error('Erreur lors de l\'initialisation audio:', error);
    }
  }

  play(): void {
    try {
      if (!this.audioContext) {
        console.warn('AudioContext non initialisé');
        return;
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume()
          .then(() => this.createAndPlayBeep())
          .catch(error => console.error('Erreur reprise audio:', error));
      } else {
        this.createAndPlayBeep();
      }
    } catch (error) {
      console.error('Erreur lors de la lecture du son:', error);
    }
  }

  private createAndPlayBeep(): void {
    if (!this.audioContext) {
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      oscillator.start(now);
      oscillator.stop(now + 0.5);
    } catch (error) {
      console.error('Erreur lors de la création du son:', error);
    }
  }
}
