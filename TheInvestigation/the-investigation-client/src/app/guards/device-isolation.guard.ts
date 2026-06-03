import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Device Isolation Guard
 *
 * Prevents users who arrived via a public device link (QR scan)
 * from navigating to any other page in the application.
 *
 * Mechanism:
 *   - When the public device route loads, DeviceRouterComponent sets
 *     sessionStorage['device_only_slug'] = full path (e.g. 'games/18/devices/iphone-tudor-moga/simulator').
 *   - This guard checks that flag on every protected route.
 *   - Authenticated users (creators) are always allowed through.
 *   - Unauthenticated users with the flag are redirected back to the device.
 */
export const deviceIsolationGuard = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Creators (authenticated) are always allowed — do not restrict them.
    if (authService.isAuthenticated()) {
        return true;
    }

    // Unauthenticated user: check if this is a device-only session.
    const storedPath = sessionStorage.getItem('device_only_slug');
    if (storedPath) {
        // Navigate back to the device — the stored path is already the full route.
        router.navigateByUrl('/' + storedPath);
        return false;
    }

    return true;
};
