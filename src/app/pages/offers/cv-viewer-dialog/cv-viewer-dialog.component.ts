import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-cv-viewer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './cv-viewer-dialog.component.html',
  styleUrls: ['./cv-viewer-dialog.component.scss']
})
export class CvViewerDialogComponent {
  safePdfUrl: SafeResourceUrl | null = null;
  safeImageUrl: SafeResourceUrl | null = null;
  candidateName: string;
  fileType: 'pdf' | 'image' | 'document' | 'unknown' = 'unknown';

  constructor(
    public dialogRef: MatDialogRef<CvViewerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { pdfUrl: string; candidateName: string; mimeType?: string },
    private sanitizer: DomSanitizer
  ) {
    this.candidateName = data.candidateName;
    this.detectFileType(data.pdfUrl, data.mimeType);
  }

  private detectFileType(url: string, mimeType?: string): void {
    // Détecter le type via le mimeType ou l'extension
    if (mimeType) {
      if (mimeType.includes('pdf')) {
        this.fileType = 'pdf';
        this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url + '#toolbar=0&navpanes=0&scrollbar=0');
      } else if (mimeType.includes('image')) {
        this.fileType = 'image';
        this.safeImageUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      } else if (mimeType.includes('word') || mimeType.includes('document') || mimeType.includes('msword')) {
        this.fileType = 'document';
        // Utiliser Google Docs Viewer pour les documents Word
        const encodedUrl = encodeURIComponent(url);
        this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`
        );
      }
    } else {
      // Fallback sur l'extension
      const extension = url.split('.').pop()?.toLowerCase();
      if (extension === 'pdf') {
        this.fileType = 'pdf';
        this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url + '#toolbar=0&navpanes=0&scrollbar=0');
      } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '')) {
        this.fileType = 'image';
        this.safeImageUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      } else if (['doc', 'docx'].includes(extension || '')) {
        this.fileType = 'document';
        const encodedUrl = encodeURIComponent(url);
        this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`
        );
      } else {
        this.fileType = 'pdf'; // Par défaut, essayer en PDF
        this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url + '#toolbar=0&navpanes=0&scrollbar=0');
      }
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
