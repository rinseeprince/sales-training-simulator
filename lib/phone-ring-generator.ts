// Phone Ring Sound Generator
// Creates realistic phone ring sounds using Web Audio API

export class PhoneRingGenerator {
  private audioContext: AudioContext | null = null;
  private currentRing: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  // Generate a realistic phone ring sound
  async generateRingTone(duration: number = 3000): Promise<void> {
    if (!this.audioContext) {
      console.warn('AudioContext not available, using fallback');
      return this.fallbackRing(duration);
    }

    return new Promise((resolve) => {
      const startTime = this.audioContext!.currentTime;
      const endTime = startTime + (duration / 1000);

      // Create gain node for volume control
      this.gainNode = this.audioContext!.createGain();
      this.gainNode.connect(this.audioContext!.destination);

      // Ring pattern: Ring for 2 seconds, pause for 1 second, repeat
      const ringDuration = 2; // seconds
      const pauseDuration = 1; // seconds
      const totalCycleTime = ringDuration + pauseDuration;
      
      let currentTime = startTime;
      
      const createRingCycle = () => {
        if (currentTime >= endTime) {
          resolve();
          return;
        }

        // Create dual-tone ring (like traditional phones)
        const freq1 = 440; // A4 note
        const freq2 = 480; // Slightly higher for that classic ring sound

        // First oscillator
        const osc1 = this.audioContext!.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = freq1;

        // Second oscillator for dual-tone effect
        const osc2 = this.audioContext!.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq2;

        // Create gain for this ring cycle
        const ringGain = this.audioContext!.createGain();
        ringGain.gain.setValueAtTime(0, currentTime);
        ringGain.gain.linearRampToValueAtTime(0.3, currentTime + 0.1); // Fade in
        ringGain.gain.setValueAtTime(0.3, currentTime + ringDuration - 0.1);
        ringGain.gain.linearRampToValueAtTime(0, currentTime + ringDuration); // Fade out

        // Connect oscillators
        osc1.connect(ringGain);
        osc2.connect(ringGain);
        ringGain.connect(this.gainNode!);

        // Start and stop oscillators
        osc1.start(currentTime);
        osc1.stop(currentTime + ringDuration);
        osc2.start(currentTime);
        osc2.stop(currentTime + ringDuration);

        // Schedule next ring cycle
        currentTime += totalCycleTime;
        
        if (currentTime < endTime) {
          setTimeout(createRingCycle, totalCycleTime * 1000);
        } else {
          setTimeout(() => resolve(), ringDuration * 1000);
        }
      };

      createRingCycle();
    });
  }

  // Fallback ring using simple beeping
  private async fallbackRing(duration: number): Promise<void> {
    return new Promise((resolve) => {
      const beepCount = Math.floor(duration / 1000);
      let currentBeep = 0;

      const beep = () => {
        if (currentBeep >= beepCount) {
          resolve();
          return;
        }

        // Create a simple beep using the default system beep (limited browser support)
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance('');
          utterance.volume = 0.1;
          speechSynthesis.speak(utterance);
        }

        currentBeep++;
        setTimeout(beep, 1000);
      };

      beep();
    });
  }

  // Stop current ring
  stopRing(): void {
    if (this.currentRing) {
      this.currentRing.stop();
      this.currentRing = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }

  // Play a quick ring notification
  async playQuickRing(): Promise<void> {
    return this.generateRingTone(2000); // 2 second ring
  }

  // Play extended ring for call start
  async playCallStartRing(): Promise<void> {
    return this.generateRingTone(3000); // 3 second ring
  }

  // Generate phone pickup sound
  async generatePickupSound(): Promise<void> {
    if (!this.audioContext) {
      console.warn('AudioContext not available for pickup sound');
      return;
    }

    return new Promise((resolve) => {
      const currentTime = this.audioContext!.currentTime;
      
      // Create gain node for volume control
      const pickupGain = this.audioContext!.createGain();
      pickupGain.connect(this.audioContext!.destination);
      
      // Simulate phone pickup with a quick click/thud sound
      // Use noise burst to simulate the handset being lifted
      const bufferSize = this.audioContext!.sampleRate * 0.1; // 100ms
      const buffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate pickup sound - starts with a small click, then brief static
      for (let i = 0; i < bufferSize; i++) {
        if (i < bufferSize * 0.1) {
          // Initial click (first 10ms)
          data[i] = (Math.random() * 2 - 1) * 0.3 * Math.exp(-i / (bufferSize * 0.05));
        } else if (i < bufferSize * 0.4) {
          // Brief static/handling noise (next 30ms)
          data[i] = (Math.random() * 2 - 1) * 0.1 * Math.exp(-i / (bufferSize * 0.2));
        } else {
          // Fade to silence (remaining 60ms)
          data[i] = (Math.random() * 2 - 1) * 0.05 * Math.exp(-i / (bufferSize * 0.1));
        }
      }
      
      // Create source and play
      const source = this.audioContext!.createBufferSource();
      source.buffer = buffer;
      source.connect(pickupGain);
      
      // Quick fade in/out for smoother sound
      pickupGain.gain.setValueAtTime(0, currentTime);
      pickupGain.gain.linearRampToValueAtTime(0.4, currentTime + 0.01);
      pickupGain.gain.linearRampToValueAtTime(0.1, currentTime + 0.05);
      pickupGain.gain.linearRampToValueAtTime(0, currentTime + 0.1);
      
      source.start(currentTime);
      source.stop(currentTime + 0.1);
      
      source.onended = () => resolve();
      
      // Fallback timeout
      setTimeout(() => resolve(), 150);
    });
  }

  // Play phone pickup sound
  async playPickupSound(): Promise<void> {
    return this.generatePickupSound();
  }
}

// Singleton instance
let phoneRingInstance: PhoneRingGenerator | null = null;

export function getPhoneRingGenerator(): PhoneRingGenerator {
  if (!phoneRingInstance) {
    phoneRingInstance = new PhoneRingGenerator();
  }
  return phoneRingInstance;
}