import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { HomeComponent } from './pages/home/home.component';
import { DemandesComponent } from './pages/demandes/demandes.component';
import { CreateDemandeComponent } from './pages/create-demande/create-demande.component';
import { DemandeDetailComponent } from './pages/demandes/demande-detail/demande-detail.component';
import { ContractsComponent } from './pages/contracts/contracts.component';
import { TimesheetsComponent } from './pages/timesheets/timesheets.component';
import { InvoicesComponent } from './pages/invoices/invoices.component';
import { InterimComponent } from './pages/interim/interim.component';
import { OffersComponent } from './pages/offers/offers.component';
import { ProfilComponent } from './pages/profil/profil.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { authGuard, publicGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { AdminLayoutComponent } from './admin/admin-layout/admin-layout.component';
import { AdminLoginComponent } from './admin/admin-login/admin-login.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { AdminClientsComponent } from './admin/admin-clients/admin-clients.component';
import { AdminCandidatesComponent } from './admin/admin-candidates/admin-candidates.component';
import { AdminDemandesComponent } from './admin/admin-demandes/admin-demandes.component';

export const routes: Routes = [
  // Routes publiques
  
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [publicGuard]
  },
  {
    path: 'admin/login',
    component: AdminLoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [publicGuard]
  },

  // Routes protégées nécessitant une authentification
  {
    path: 'app',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: HomeComponent },
      { path: 'contracts', component: ContractsComponent },
      { path: 'timesheets', component: TimesheetsComponent },
      { path: 'invoices', component: InvoicesComponent },
      { path: 'interim', component: InterimComponent },
      { path: 'offers', component: OffersComponent },
      { path: 'demandes', component: DemandesComponent },
      { path: 'demandes/create', component: CreateDemandeComponent },
      { path: 'demandes/detail/:id', component: DemandeDetailComponent },
      { path: 'demandes/edit/:id', component: CreateDemandeComponent },
      { path: 'profil', component: ProfilComponent }
    ]
  },

  // Routes admin protégées
  {
    path: 'admin',
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', component: AdminLoginComponent },
      {
        path: '',
        component: AdminLayoutComponent,
        canActivate: [adminGuard],
        children: [
          { path: 'dashboard', component: AdminDashboardComponent },
          { path: 'clients', component: AdminClientsComponent },
          { path: 'candidates', component: AdminCandidatesComponent },
          { path: 'demandes', component: AdminDemandesComponent }
        ]
      }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
