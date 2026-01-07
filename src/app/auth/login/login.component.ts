import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { LoginRequest } from '../../core/models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./normalize-login.scss', './login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  hidePassword = true;
  userType = signal<'candidate' | 'client'>('candidate');

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.checkForRoleConflictError();
  }

  checkForRoleConflictError(): void {
    this.route.queryParams.subscribe(params => {
      if (params['error'] === 'role_conflict') {
        const existingRole = params['existing'];
        let roleLabel = '';

        if (existingRole === 'client') {
          roleLabel = 'entreprise';
        } else if (existingRole === 'candidate') {
          roleLabel = 'candidat';
        } else if (existingRole === 'admin') {
          roleLabel = 'administrateur';
        }

        this.snackBar.open(
          `Ce compte Google est déjà enregistré en tant que ${roleLabel}. Veuillez utiliser un autre compte ou vous connecter avec le rôle approprié.`,
          'Fermer',
          {
            duration: 8000,
            panelClass: ['error-snackbar'],
            horizontalPosition: 'center',
            verticalPosition: 'top'
          }
        );

        // Nettoyer les query params après avoir affiché le message
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }
    });
  }

  initForm(): void {
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

      // loginWithCredentials définit automatiquement le contexte 'user'
      this.authService.loginWithCredentials(loginRequest, 'user').subscribe({
        next: (response) => {
          this.isLoading = false;

          // Vérifier si l'utilisateur est un admin
          if (this.authService.isAdmin()) {
            this.snackBar.open('Les administrateurs doivent se connecter via /admin/login', 'Fermer', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
            this.authService.logout('/login');
            return;
          }

          this.snackBar.open('Connexion réussie!', 'OK', { duration: 3000 });

          // Rediriger vers le dashboard approprié
          this.router.navigate(['/app/dashboard']);
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
    } else {
      this.markFormGroupTouched(this.loginForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  switchUserType(type: 'candidate' | 'client'): void {
    this.userType.set(type);
  }

  loginWithGoogle(): void {
    // loginWithGoogle définit automatiquement le contexte 'user'
    this.authService.loginWithGoogle(this.userType());
  }


  navigateToRegister(): void {
    this.router.navigate(['/register'], {
      queryParams: { type: this.userType() }
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.loginForm.get(fieldName);
    if (control?.hasError('required')) {
      return 'Ce champ est requis';
    }
    if (control?.hasError('email')) {
      return 'Email invalide';
    }
    if (control?.hasError('minlength')) {
      return 'Minimum 6 caractères requis';
    }
    return '';
  }
}
