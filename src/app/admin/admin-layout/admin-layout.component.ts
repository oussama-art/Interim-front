import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule
  ],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent implements OnInit {
  currentYear = new Date().getFullYear();
  sidebarOpen = false;

  menuItems = [
    {
      title: 'Dashboard',
      icon: 'dashboard',
      route: '/admin/dashboard',
      active: false
    },
    {
      title: 'Demandes de mission',
      icon: 'assignment',
      route: '/admin/demandes',
      active: false
    },
    {
      title: 'Offres',
      icon: 'work_outline',
      route: '/admin/offers',
      active: false
    },
    {
      title: 'Contrats',
      icon: 'description',
      route: '/admin/contracts',
      active: false
    },
    {
      title: 'Inscriptions entreprises',
      icon: 'business_center',
      route: '/admin/account-requests',
      active: false
    },
    {
      title: 'Clients',
      icon: 'business',
      route: '/admin/clients',
      active: false
    },
    {
      title: 'Candidats',
      icon: 'people',
      route: '/admin/candidates',
      active: false
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.updateActiveMenuItem();
  }

  updateActiveMenuItem(): void {
    const currentRoute = this.router.url;
    this.menuItems.forEach(item => {
      item.active = currentRoute.startsWith(item.route);
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.authService.logout('/admin/login');
  }
}
