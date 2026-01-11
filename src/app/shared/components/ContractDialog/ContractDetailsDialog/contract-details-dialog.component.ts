import { Component, Inject, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-contract-details-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './contract-details-dialog.component.html',
  styleUrls: ['./contract-details-dialog.component.scss']
})
export class ContractDetailsDialog {
  displayData: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<ContractDetailsDialog>,
    private cdr: ChangeDetectorRef
  ) {
    this.displayData = { ...data };
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      active: 'Contrat Actif',
      pending: 'En attente',
      completed: 'Terminé'
    };
    return labels[status] || status;
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  onLogoUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.displayData.companyLogo = reader.result;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(input.files[0]);
  }

generatePdf() {
  const element = document.getElementById('contract-pdf');
  if (!element) return;

  // Afficher temporairement l’élément
  element.style.display = 'block';

  const options = {
    margin: [15, 15, 15, 15] as [number, number, number, number],
    filename: `Contrat_${this.displayData.reference}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait' as const
    }
  };

  html2pdf()
    .set(options)
    .from(element)
    .save()
    .finally(() => {
      // Remettre display:none après génération
      element.style.display = 'none';
    });
}

}
