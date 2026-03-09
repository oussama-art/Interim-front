import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { GlobalSearchService } from '../../core/services/global-search.service';
import { Subject, filter, takeUntil } from 'rxjs';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnInit, OnDestroy {
  userName = 'John Doe';
  searchQuery = '';
  searchPlaceholder = 'Rechercher...';
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private authService: AuthService,
    private globalSearchService: GlobalSearchService
  ) {}

  ngOnInit(): void {
    // Détecter les changements de route
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateSearchPlaceholder();
        this.clearSearch();
      });

    // Initialiser le placeholder
    this.updateSearchPlaceholder();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateSearchPlaceholder(): void {
    const url = this.router.url;

    if (url.includes('/app/demandes')) {
      this.searchPlaceholder = 'Rechercher une demande (titre, référence...)';
    } else if (url.includes('/app/offers')) {
      this.searchPlaceholder = 'Rechercher une offre (ID, référence du demande...)';
    } else if (url.includes('/app/contracts')) {
      this.searchPlaceholder = 'Rechercher un contrat...';
    } else if (url.includes('/app/timesheets')) {
      this.searchPlaceholder = 'Rechercher une feuille de temps...';
    } else if (url.includes('/app/invoices')) {
      this.searchPlaceholder = 'Rechercher une facture...';
    } else if (url.includes('/app/profil')) {
      this.searchPlaceholder = 'Rechercher...';
    } else {
      this.searchPlaceholder = 'Rechercher...';
    }
  }

  onSearch(): void {
    this.globalSearchService.setSearchQuery(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.globalSearchService.clearSearch();
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
