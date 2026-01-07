import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  isExpanded = signal(false);

  private allNavItems: NavItem[] = [
    { path: '/app/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/app/contracts', icon: 'description', label: 'Contracts' },
    { path: '/app/timesheets', icon: 'schedule', label: 'Timesheets' },
    { path: '/app/invoices', icon: 'receipt_long', label: 'Invoices' },
    { path: '/app/interim', icon: 'work', label: 'Interim' },
    { path: '/app/offers', icon: 'local_offer', label: 'Offers' },
    { path: '/app/demandes', icon: 'assignment', label: 'Demandes' },
    { path: '/app/profil', icon: 'person', label: 'Profil' }
  ];

  // Computed property that filters nav items based on user role
  navItems = computed(() => {
    const isCandidate = this.authService.isCandidate();
    return this.allNavItems.filter(item => {
      // Hide 'Demandes' for candidates
      if (item.path === '/app/demandes' && isCandidate) {
        return false;
      }
      return true;
    });
  });

  constructor(private authService: AuthService) {}

  onMouseEnter() {
    this.isExpanded.set(true);
  }

  onMouseLeave() {
    this.isExpanded.set(false);
  }
}
