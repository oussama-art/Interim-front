import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ProfilSummary {
  profilName: string;
  required: number;
  selected: number;
  alreadyProposed: number;
  remaining: number;
  isComplete: boolean;
}

export interface ConfirmOfferData {
  profils: ProfilSummary[];
  totalSelected: number;
  hasIncomplete: boolean;
}

@Component({
  selector: 'app-confirm-offer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="confirm-offer-dialog">
      <h2 mat-dialog-title>
        <mat-icon>send</mat-icon>
        Confirmation d'envoi
      </h2>

      <mat-dialog-content>
        <!-- Message simple si tout est complet -->
        <div class="simple-confirmation" *ngIf="!data.hasIncomplete">
          <p class="confirm-text">
            Vous êtes sur le point d'envoyer une offre avec <strong>{{ data.totalSelected }}</strong> candidat(s).
          </p>
          <p class="confirm-question">Voulez-vous confirmer l'envoi ?</p>
        </div>

        <!-- Message avec détails si incomplet -->
        <div class="incomplete-warning" *ngIf="data.hasIncomplete">
          <div class="alert-header">
            <mat-icon>warning</mat-icon>
            <div>
              <strong>Attention : Profils incomplets</strong>
              <p>Certains profils n'ont pas le nombre requis de candidats.</p>
            </div>
          </div>

          <div class="missing-profils">
            <h3>Profils manquants :</h3>
            <div class="profil-missing" *ngFor="let profil of getIncompleteProfils()">
              <div class="profil-info">
                <span class="profil-name">{{ profil.profilName }}</span>
                <span class="profil-count">
                  {{ profil.selected + profil.alreadyProposed }} / {{ profil.required }}
                </span>
              </div>
              <div class="missing-info">
                <mat-icon>error_outline</mat-icon>
                <span>Il manque encore <strong>{{ profil.remaining }}</strong> candidat(s)</span>
              </div>
            </div>
          </div>

          <div class="completion-note">
            <mat-icon>info</mat-icon>
            <p>Vous pourrez compléter ces profils ultérieurement en ajoutant d'autres candidats.</p>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          Annuler
        </button>
        <button mat-flat-button color="primary" (click)="onConfirm()">
          <mat-icon>send</mat-icon>
          Confirmer l'envoi
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-offer-dialog {
      min-width: 450px;
      max-width: 550px;
    }

    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0;
      padding: 1.5rem 1.5rem 1rem 1.5rem;
      color: #1e293b;
      font-size: 1.375rem;

      mat-icon {
        color: #2563eb;
        font-size: 26px;
        width: 26px;
        height: 26px;
      }
    }

    mat-dialog-content {
      padding: 0 1.5rem 1.5rem 1.5rem;
      max-height: 60vh;
      overflow-y: auto;
    }

    /* Message simple si tout est OK */
    .simple-confirmation {
      text-align: center;
      padding: 1.5rem 0;

      .confirm-text {
        margin: 0 0 1rem 0;
        font-size: 1rem;
        color: #475569;
        line-height: 1.6;
      }

      .confirm-question {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 500;
        color: #1e293b;
      }
    }

    /* Message d'alerte si incomplet */
    .incomplete-warning {
      .alert-header {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        background: #fef3c7;
        border: 1px solid #fbbf24;
        border-radius: 8px;
        margin-bottom: 1.5rem;

        mat-icon {
          color: #f59e0b;
          flex-shrink: 0;
          font-size: 24px;
          width: 24px;
          height: 24px;
        }

        strong {
          display: block;
          color: #92400e;
          margin-bottom: 0.25rem;
          font-size: 1rem;
        }

        p {
          margin: 0;
          color: #92400e;
          font-size: 0.875rem;
        }
      }
    }

    .missing-profils {
      h3 {
        margin: 0 0 1rem 0;
        font-size: 0.9375rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    }

    .profil-missing {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #ef4444;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 0.75rem;

      .profil-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;

        .profil-name {
          font-weight: 600;
          color: #1e293b;
          font-size: 1rem;
        }

        .profil-count {
          padding: 0.25rem 0.625rem;
          background: #fee2e2;
          color: #dc2626;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.875rem;
        }
      }

      .missing-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #dc2626;
        font-size: 0.875rem;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .completion-note {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      margin-top: 1.5rem;

      mat-icon {
        color: #2563eb;
        flex-shrink: 0;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      p {
        margin: 0;
        color: #1e40af;
        font-size: 0.875rem;
      }
    }

    mat-dialog-actions {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      gap: 0.75rem;

      button {
        mat-icon {
          margin-right: 0.375rem;
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }
  `]
})
export class ConfirmOfferDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmOfferDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmOfferData
  ) {}

  getIncompleteProfils(): ProfilSummary[] {
    return this.data.profils.filter(p => !p.isComplete);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
