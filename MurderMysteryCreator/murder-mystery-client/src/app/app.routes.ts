import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login.component';
import { RegisterComponent } from './components/auth/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { GameBuilderComponent } from './components/game-builder/game-builder.component';
import { GameDetailsComponent } from './components/game-details/game-details.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
    { path: 'games/new', component: GameBuilderComponent, canActivate: [authGuard] },
    { path: 'games/:id/edit', component: GameBuilderComponent, canActivate: [authGuard] },
    { path: 'games/:id', component: GameDetailsComponent, canActivate: [authGuard] },
    {
        path: 'games/:gameId/devices/:deviceSlug/simulator',
        loadComponent: () => import('./components/devices/device-router.component')
            .then(m => m.DeviceRouterComponent),
        canActivate: [authGuard]
    },
    // Public device page — accessed via QR code, no auth required
    // URL format: /:deviceSlug e.g. /iphone-elodia
    {
        path: ':deviceSlug',
        loadComponent: () => import('./components/devices/device-router.component')
            .then(m => m.DeviceRouterComponent)
    },
    { path: '**', redirectTo: '/dashboard' }
];
