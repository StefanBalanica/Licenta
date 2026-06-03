import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DeviceService } from '../../services/device.service';
import { AuthService } from '../../services/auth.service';
import { IPhoneDeviceComponent } from './iphone/iphone-device.component';
import { AndroidDeviceComponent } from './android/android-device.component';
import { LaptopDeviceComponent } from './laptop/laptop-device.component';
import { DeviceType } from '../../models/device.models';
import { parseDeviceSlug, createDeviceSlug } from '../../utils/slug.util';
import { ChatbotComponent } from '../chatbot/chatbot.component';

@Component({
    selector: 'app-device-router',
    standalone: true,
    imports: [
        CommonModule,
        IPhoneDeviceComponent,
        AndroidDeviceComponent,
        LaptopDeviceComponent,
        ChatbotComponent
    ],
    template: `
    <div *ngIf="loading" class="loading">
      <div class="loader"></div>
      <p>Loading device...</p>
    </div>

    <app-iphone-device *ngIf="!loading && deviceType === 'iPhone'"></app-iphone-device>
    <app-android-device *ngIf="!loading && deviceType === 'Android'"></app-android-device>
    <app-laptop-device *ngIf="!loading && deviceType === 'Laptop'"></app-laptop-device>

    <div *ngIf="!loading && !deviceType" class="error">
      <h2>Unknown device type</h2>
      <p>Could not determine device type</p>
    </div>

    <!-- Chatbot hint assistant (visible on all device pages) -->
    <app-chatbot *ngIf="!loading && gameId" [gameId]="gameId"></app-chatbot>
  `,
    styles: [`
    .loading, .error {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .loader {
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error h2 {
      margin: 0 0 8px 0;
    }

    .error p {
      margin: 0;
      opacity: 0.8;
    }
  `]
})
export class DeviceRouterComponent implements OnInit, OnDestroy {
    deviceType: DeviceType | null = null;
    loading: boolean = true;
    gameId: number = 0;
    deviceId: number = 0;

    /** True when accessed via public QR route (no gameId in URL) */
    isPublicMode: boolean = false;

    private popstateListener?: () => void;

    constructor(
        private route: ActivatedRoute,
        private deviceService: DeviceService,
        private authService: AuthService
    ) { }

    ngOnInit() {
        const gameIdParam    = this.route.snapshot.paramMap.get('gameId');
        const deviceSlugParam = this.route.snapshot.paramMap.get('deviceSlug');
        const uniqueUrlParam  = this.route.snapshot.paramMap.get('uniqueUrl');

        if (gameIdParam && deviceSlugParam) {
            this.gameId = parseInt(gameIdParam);

            if (this.authService.isAuthenticated()) {
                // ── Creator (authenticated): use auth API ──
                this.loadDeviceBySlug(deviceSlugParam);
            } else {
                // ── Player scanning QR (unauthenticated): use public API ──
                this.isPublicMode = true;
                this.lockBackButton();
                this.loadPublicDeviceByGameAndSlug(this.gameId, deviceSlugParam);
            }
        } else if (uniqueUrlParam) {
            // ── Legacy: /d/:uniqueUrl (GUID-based) ──
            this.isPublicMode = true;
            this.lockBackButton();
            this.loadPublicDeviceByUniqueUrl(uniqueUrlParam);
        } else if (deviceSlugParam) {
            // ── Legacy: /:deviceSlug (name-based) ──
            this.isPublicMode = true;
            this.lockBackButton();
            this.loadPublicDevice(deviceSlugParam);
        } else {
            this.loading = false;
        }
    }

    ngOnDestroy() {
        if (this.popstateListener) {
            window.removeEventListener('popstate', this.popstateListener);
        }
    }

    // ── Public route loader ────────────────────────────────────────────────

    private loadPublicDevice(slug: string) {
        // Mark this tab as a device-only session.
        // The deviceIsolationGuard reads this flag to block navigation to other pages.
        sessionStorage.setItem('device_only_slug', slug);

        this.deviceService.getDeviceByPublicSlug(slug).subscribe({
            next: (device) => {
                this.gameId = device.gameId;
                this.deviceId = device.deviceId;
                this.deviceType = device.deviceType as DeviceType || 'iPhone';
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading public device:', error);
                this.loading = false;
            }
        });
    }

    private loadPublicDeviceByUniqueUrl(uniqueUrl: string) {
        sessionStorage.setItem('device_only_slug', `d/${uniqueUrl}`);

        this.deviceService.getDeviceByUniqueUrl(uniqueUrl).subscribe({
            next: (device) => {
                this.gameId = device.gameId;
                this.deviceId = device.deviceId;
                this.deviceType = device.deviceType as DeviceType || 'iPhone';
                this.loading = false;
                // Rewrite to pretty slug
                const slug = createDeviceSlug(device.deviceType, device.ownerName);
                history.replaceState(null, '', `/games/${device.gameId}/devices/${slug}/simulator`);
            },
            error: (error) => {
                console.error('Error loading public device by uniqueUrl:', error);
                this.loading = false;
            }
        });
    }

    private loadPublicDeviceByGameAndSlug(gameId: number, slug: string) {
        // Store the full simulator path so deviceIsolationGuard can redirect back if needed
        sessionStorage.setItem('device_only_slug', `games/${gameId}/devices/${slug}/simulator`);

        this.deviceService.getDeviceByGameAndSlug(gameId, slug).subscribe({
            next: (device) => {
                this.gameId  = device.gameId;
                this.deviceId = device.deviceId;
                this.deviceType = device.deviceType as DeviceType || 'iPhone';
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading public device by game+slug:', error);
                this.loading = false;
            }
        });
    }

    // ── Internal route loader ──────────────────────────────────────────────

    private loadDeviceBySlug(slugOrId: string) {
        const numericId = parseInt(slugOrId, 10);
        if (!isNaN(numericId) && slugOrId === String(numericId)) {
            this.deviceId = numericId;
            this.deviceService.getDeviceWithApps(this.gameId, numericId).subscribe({
                next: (device) => {
                    this.deviceType = device.deviceType as DeviceType || 'iPhone';
                    this.loading = false;
                },
                error: (error) => {
                    console.error('Error loading device by ID:', error);
                    this.loading = false;
                }
            });
            return;
        }

        const parsed = parseDeviceSlug(slugOrId);
        if (!parsed) {
            console.error('Invalid device slug:', slugOrId);
            this.loading = false;
            return;
        }

        this.deviceService.getDeviceBySlug(this.gameId, parsed.deviceType, parsed.ownerName).subscribe({
            next: (device) => {
                this.deviceId = device.deviceId;
                this.deviceService.getDeviceWithApps(this.gameId, device.deviceId).subscribe({
                    next: (deviceWithApps) => {
                        this.deviceType = deviceWithApps.deviceType as DeviceType || 'iPhone';
                        this.loading = false;
                    },
                    error: (error) => {
                        console.error('Error loading device type:', error);
                        this.deviceType = 'iPhone';
                        this.loading = false;
                    }
                });
            },
            error: (error) => {
                console.error('Error loading device by slug:', error);
                this.loading = false;
            }
        });
    }

    // ── Back-button blocker (kiosk mode) ──────────────────────────────────

    private lockBackButton() {
        history.pushState(null, '', location.href);
        this.popstateListener = () => {
            history.pushState(null, '', location.href);
        };
        window.addEventListener('popstate', this.popstateListener);
    }
}
