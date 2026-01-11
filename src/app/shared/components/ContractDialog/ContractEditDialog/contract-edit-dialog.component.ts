import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
  selector: 'app-contract-edit-dialog',
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
    MatNativeDateModule
  ],
  templateUrl: './contract-edit-dialog.component.html',
  styleUrl: './contract-edit-dialog.component.scss' // On réutilise les styles pro
})
export class ContractEditDialog implements OnInit {
  editForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ContractEditDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.editForm = this.fb.group({
      reference: [{ value: data.reference, disabled: true }], // On ne modifie pas la ref
      candidateName: [data.candidateName, Validators.required],
      clientName: [data.clientName, Validators.required],
      position: [data.position, Validators.required],
      salary: [data.salary, [Validators.required, Validators.min(0)]],
      status: [data.status, Validators.required],
      startDate: [data.startDate, Validators.required],
      endDate: [data.endDate, Validators.required]
    });
  }

  ngOnInit(): void {}

  onSave() {
    if (this.editForm.valid) {
      this.dialogRef.close(this.editForm.getRawValue());
    }
  }
}