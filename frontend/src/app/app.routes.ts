import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login.component';
import { RegisterComponent } from './pages/auth/register.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { authGuard } from './core/guards/auth.guard';
import { dashboardResolver } from './core/resolvers/dashboard.resolver';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login | ApexAI Recruiter Portal'
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Register | ApexAI Recruiter Portal'
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    resolve: {
      dashboardData: dashboardResolver
    },
    title: 'Dashboard | ApexAI Recruiter Portal'
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
