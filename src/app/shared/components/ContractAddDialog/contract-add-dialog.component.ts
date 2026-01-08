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

@Component({
  selector: 'app-contract-add-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatDatepickerModule
  ],
  templateUrl: './contract-add-dialog.component.html',
  styleUrl: './contract-add-dialog.component.scss' // On réutilise le même SCSS premium
})
export class ContractAddDialog {
  addForm: FormGroup;

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
      endDate: [null, Validators.required]
    });
  }

  onSubmit() {
    if (this.addForm.valid) {
      // On retourne l'objet avec un ID temporaire ou généré
      this.dialogRef.close({ ...this.addForm.value, id: Math.random() });
    }
  }
}