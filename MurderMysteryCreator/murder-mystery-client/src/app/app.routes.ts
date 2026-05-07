import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login.component';
import { RegisterComponent } from './components/auth/register.component';
import { ForgotPasswordComponent } from './components/auth/forgot-password.component';
import { ResetPasswordComponent } from './components/auth/reset-password.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { GameBuilderComponent } from './components/game-builder/game-builder.component';
import { GameDetailsComponent } from './components/game-details/game-details.component';
import { authGuard } from './guards/auth.guard';
import { deviceIsolationGuard } from './guards/device-isolation.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login',            component: LoginComponent,          canActivate: [deviceIsolationGuard] },
    { path: 'register',         component: RegisterComponent,       canActivate: [deviceIsolationGuard] },
    { path: 'forgot-password',  component: ForgotPasswordComponent, canActivate: [deviceIsolationGuard] },
    { path: 'reset-password',   component: ResetPasswordComponent,  canActivate: [deviceIsolationGuard] },
    // Creator routes: protected by both authGuard (must be logged in)
    // and deviceIsolationGuard (blocks device-only sessions).
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard, deviceIsolationGuard] },
    { path: 'games/new', component: GameBuilderComponent, canActivate: [authGuard, deviceIsolationGuard] },
    { path: 'games/:id/edit', component: GameBuilderComponent, canActivate: [authGuard, deviceIsolationGuard] },
    { path: 'games/:id', component: GameDetailsComponent, canActivate: [authGuard, deviceIsolationGuard] },
    {
        path: 'games/:gameId/devices/:deviceSlug/simulator',
        loadComponent: () => import('./components/devices/device-router.component')
            .then(m => m.DeviceRouterComponent),
        canActivate: [authGuard, deviceIsolationGuard]
    },
    // Public device page — accessed via QR code, no auth required.
    // URL format: /:deviceSlug e.g. /iphone-elodia
    {
        path: ':deviceSlug',
        loadComponent: () => import('./components/devices/device-router.component')
            .then(m => m.DeviceRouterComponent)
    },
    { path: '**', redirectTo: '/dashboard' }
];
