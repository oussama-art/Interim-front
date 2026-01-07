import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { LoginRequest } from '../../core/models/auth.models';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./normalize-admin-login.scss', './admin-login.component.scss']
})
export class AdminLoginComponent {
  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      emailAddress: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;

      const loginRequest: LoginRequest = {
        emailAddress: this.loginForm.value.emailAddress,
        password: this.loginForm.value.password
      };

      // loginWithCredentials définit automatiquement le contexte 'admin'
      this.authService.loginWithCredentials(loginRequest, 'admin').subscribe({
        next: (response) => {
          this.isLoading = false;

          // Vérifier si l'utilisateur a le rôle ADMIN
          if (this.authService.isAdmin()) {
            this.snackBar.open('Connexion réussie!', 'OK', { duration: 3000 });
            this.router.navigate(['/admin/dashboard']);
          } else {
            this.snackBar.open('Accès refusé: Vous n\'avez pas les droits administrateur', 'Fermer', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
            this.authService.logout('/admin/login');
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Erreur de connexion:', error);

          const errorMessage = error.error?.message || 'Email ou mot de passe incorrect';
          this.snackBar.open(errorMessage, 'Fermer', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  loginWithGoogle(): void {
    // loginWithGoogle définit automatiquement le contexte 'admin'
    this.authService.loginWithGoogle('admin');
  }

  getEmailErrorMessage(): string {
    const emailControl = this.loginForm.get('emailAddress');
    if (emailControl?.hasError('required')) {
      return 'L\'email est requis';
    }
    if (emailControl?.hasError('email')) {
      return 'Email invalide';
    }
    return '';
  }

  getPasswordErrorMessage(): string {
    const passwordControl = this.loginForm.get('password');
    if (passwordControl?.hasError('required')) {
      return 'Le mot de passe est requis';
    }
    if (passwordControl?.hasError('minlength')) {
      return 'Le mot de passe doit contenir au moins 6 caractères';
    }
    return '';
  }
}
