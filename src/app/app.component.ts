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
    if (this.authService.isLoggedIn()) {
      // Vérifier et configurer l'utilisateur Google si nécessaire
      await this.authService.checkAndSetupGoogleUser();
    }
  }
}
