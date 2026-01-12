import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core'; // CRITICAL: Missing import

@Component({
  selector: 'app-contract-add-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule // CRITICAL: Must be imported for datepicker to work
  ],
  templateUrl: './contract-add-dialog.component.html',
  styleUrl: './contract-add-dialog.component.scss'
})
export class ContractAddDialog {
  addForm: FormGroup;
  logoPreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ContractAddDialog>
  ) {
    this.addForm = this.fb.group({
      reference: [`CTR-${new Date().getFullYear()}-00X`, Validators.required],
      candidateName: ['', Validators.required],
      clientName: ['', Validators.required],
      position: ['', Validators.required],
      salary: [null, [Validators.required, Validators.min(0)]],
      status: ['pending', Validators.required],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      logo: [null]
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image valide');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('L\'image ne doit pas dépasser 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        this.logoPreview = e.target?.result as string;
        this.addForm.patchValue({ logo: this.logoPreview });
      };
      reader.readAsDataURL(file);
    }
  }

  triggerFileInput() {
    const fileInput = document.getElementById('logoInput') as HTMLInputElement;
    fileInput?.click();
  }

  removeLogo() {
    this.logoPreview = null;
    this.addForm.patchValue({ logo: null });
    const fileInput = document.getElementById('logoInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  onSubmit() {
    if (this.addForm.valid) {
      // Format dates to ISO string if they're Date objects
      const formValue = {
        ...this.addForm.value,
        id: Date.now(), // Better ID generation
        startDate: this.addForm.value.startDate?.toISOString?.() || this.addForm.value.startDate,
        endDate: this.addForm.value.endDate?.toISOString?.() || this.addForm.value.endDate
      };
      this.dialogRef.close(formValue);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}