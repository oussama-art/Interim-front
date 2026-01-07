import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'interim-app';

  constructor(private authService: AuthService) {}

  async ngOnInit() {
    console.log('=== APP COMPONENT INIT ===');
    console.log('Utilisateur connecté:', this.authService.isLoggedIn());

    if (this.authService.isLoggedIn()) {
      console.log('Rôles actuels:', this.authService.getUserRoles());
      console.log('selectedRole dans sessionStorage:', sessionStorage.getItem('selectedRole'));

      // Vérifier et configurer l'utilisateur Google si nécessaire
      await this.authService.checkAndSetupGoogleUser();
    } else {
      console.log('Utilisateur non connecté, skip checkAndSetupGoogleUser');
    }
  }
}
