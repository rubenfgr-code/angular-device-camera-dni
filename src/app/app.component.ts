import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { createWorker } from 'tesseract.js';

// declare const Buffer: typeof Buffer;
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  timerId!: NodeJS.Timeout;
  worker: any;

  @ViewChild('video') video!: ElementRef;
  @ViewChild('progress') progress!: ElementRef;

  ocrResult = '---';
  loading = false;

  ngAfterViewInit() {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((mediaStream) => {
        this.video.nativeElement.srcObject = mediaStream;
        this.video.nativeElement.onloadedmetadata = () =>
          this.video.nativeElement.play();
      })
      .catch((err) => console.log('Error:', err));
  }

  takePhoto = async () => {
    this.ocrResult = '---';
    const canvas = document.createElement('canvas');
    canvas.height = this.video.nativeElement.videoHeight;
    canvas.width = this.video.nativeElement.videoWidth;
    canvas
      .getContext('2d')
      ?.drawImage(
        this.video.nativeElement,
        0,
        0,
        this.video.nativeElement.videoWidth,
        this.video.nativeElement.videoHeight
      );

    this.loading = true;

    if (!this.worker) {
      this.worker = createWorker({
        logger: (m) => {
          const value = m.progress.toFixed(2);
          const pro = value * 100;
          if (pro > 98 && m.status === 'recognizing text') {
            this.loading = false;
          }
          this.progress.nativeElement.style.width = `${pro}%`;
        },
      });

      await this.worker.load();
      await this.worker.loadLanguage('spa');
      await this.worker.initialize('spa');
      this.takePhoto();
    } else {
      const { data } = await this.worker.recognize(canvas, {});
      if (data && data.text) {
        this.checkDNI(data.text);
      }
    }
  };

  checkDNI(text: string) {
    console.log(text);
    let dnis = text.match(/(.*)([0-9]{8}[A-Z]{1})(.*)/);

    if (dnis && dnis.length > 3) {
      const dni = dnis[2];
      this.ocrResult = dni;
    } else {
      dnis = text.match(/(.*)([0-9]{8})(.*)/);
      if (dnis && dnis.length > 3) {
        const ABC = 'TRWAGMYFPDXBNJZSQVHLCKE';
        const dniNumbers = dnis[2];
        const letter = ABC.charAt(Number.parseInt(dniNumbers) % 23);
        this.ocrResult = dniNumbers + letter;
      } else {
        this.ocrResult = 'N/A';
      }
    }
  }

  ngOnDestroy = async () => {
    await this.worker.terminate();
  };
}
