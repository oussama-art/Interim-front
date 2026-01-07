import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent {
  userName = 'John Doe';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    console.log('Search:', value);
  }

  onProfile() {
    console.log('Profile clicked');
  }

  onLogout(): void {
    // Utiliser le service d'authentification pour déconnecter
    // Cela supprimera automatiquement les tokens du localStorage
    this.authService.logout();
  }
}
