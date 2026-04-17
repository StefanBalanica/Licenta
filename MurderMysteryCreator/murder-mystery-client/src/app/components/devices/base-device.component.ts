import { Directive, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { DeviceService } from '../../services/device.service';
import { Conversation, Photo, Email, Note, FileItem, CallLog, DeviceType } from '../../models/device.models';
import { parseDeviceSlug } from '../../utils/slug.util';

@Directive()
export abstract class BaseDeviceComponent implements OnInit, OnDestroy {
    protected routeSubscription?: Subscription;
    protected isLoadingDevice: boolean = false; // Prevent multiple simultaneous loads
    gameId: number = 0;
    deviceId: number = 0;
    ownerName: string = 'Device';
    currentScreen: string = 'home';
    selectedConversation: Conversation | null = null;
    selectedEmail: Email | null = null;
    selectedNote: Note | null = null;
    selectedFile: FileItem | null = null;
    selectedPhoto: Photo | null = null;
    loading: boolean = true;
    deviceType: DeviceType = 'iPhone';
    /** Home screen page index (0-based) for swipe left/right between app pages */
    homePageIndex: number = 0;
    homePageCount: number = 3;

    // ── Lock screen ───────────────────────────────────────────────────────────
    isLocked: boolean = false;
    passcode: string = '';
    pinEntry: string = '';
    pinShake: boolean = false;

    conversations: Conversation[] = [];
    photos: Photo[] = [];
    emails: Email[] = [];
    emailsInbox: Email[] = [];
    emailsSent: Email[] = [];
    emailsDrafts: Email[] = [];
    notes: Note[] = [];
    files: FileItem[] = [];
    calls: CallLog[] = [];
    protected photosAppId: number | null = null;

    // Swipe detection properties
    protected touchStartX: number = 0;
    protected touchStartY: number = 0;
    protected touchEndX: number = 0;
    protected touchEndY: number = 0;
    protected touchStartTime: number = 0;
    protected readonly swipeThreshold: number = 100; // Increased threshold to avoid interference with clicks
    protected readonly swipeTimeThreshold: number = 300; // Max time for a swipe (ms)

    // Audio Calling State
    activeCall: CallLog | null = null;
    callDuration: string = '00:00';
    protected audioObj = new Audio();
    protected callTimer: any;
    protected callSeconds: number = 0;

    constructor(
        protected route: ActivatedRoute,
        protected deviceService: DeviceService
    ) { }

    ngOnInit() {
        // Subscribe to route params changes to reload data when deviceSlug changes
        this.routeSubscription = this.route.paramMap.subscribe(params => {
            const gameIdParam = params.get('gameId');
            const deviceSlugParam = params.get('deviceSlug');

            if (gameIdParam && deviceSlugParam) {
                // ── Internal route: games/:gameId/devices/:deviceSlug/simulator ──
                const newGameId = parseInt(gameIdParam);
                const newDeviceSlug = deviceSlugParam;

                if (this.gameId !== newGameId || this.deviceId === 0) {
                    this.resetDeviceData();
                    this.gameId = newGameId;
                    this.loadDeviceBySlug(newDeviceSlug);
                } else {
                    if (this.loading) {
                        this.loadDeviceBySlug(newDeviceSlug);
                    }
                }
            } else if (deviceSlugParam) {
                // ── Public route: /:deviceSlug (QR code access) ──
                if (this.deviceId === 0) {
                    this.resetDeviceData();
                    this.loadPublicDeviceBySlug(deviceSlugParam);
                }
            }
        });
    }

    /**
     * Load device via the public (no-auth) API — used when accessed from a QR code (/:deviceSlug route).
     */
    protected loadPublicDeviceBySlug(slug: string) {
        if (this.isLoadingDevice) return;
        this.isLoadingDevice = true;
        this.loading = true;

        this.deviceService.getDeviceByPublicSlug(slug).subscribe({
            next: (device) => {
                this.gameId = device.gameId;
                this.deviceId = device.deviceId;
                this.ownerName = device.ownerName;
                this.deviceType = (device.deviceType as import('../../models/device.models').DeviceType) || 'iPhone';
                this.passcode = device.passcode ?? '';
                this.isLocked = !!device.passcode;
                this.pinEntry = '';

                // Parse app data directly from the public response
                this.conversations = [];
                this.photos = [];
                this.emailsInbox = [];
                this.emailsSent = [];
                this.emailsDrafts = [];
                this.notes = [];
                this.files = [];
                this.calls = [];

                (device.apps ?? []).forEach((app: any) => {
                    const data = app.appData || {};
                    if (app.appType === 'Messages') {
                        const incoming = this.normalizeConversations(data.conversations ?? data.Conversations ?? []);
                        this.conversations = [...this.conversations, ...incoming];
                    } else if (app.appType === 'Photos') {
                        const incoming = this.normalizePhotos(data.photos ?? data.Photos ?? []);
                        this.photos = [...this.photos, ...incoming];
                    } else if (app.appType === 'Email') {
                        const incomingInbox = this.normalizeEmails(Array.isArray(data.inbox ?? data.Inbox) ? (data.inbox ?? data.Inbox) : []);
                        const incomingSent = this.normalizeEmails(Array.isArray(data.sent ?? data.Sent) ? (data.sent ?? data.Sent) : []);
                        const incomingDrafts = this.normalizeEmails(Array.isArray(data.drafts ?? data.Drafts) ? (data.drafts ?? data.Drafts) : []);
                        this.emailsInbox = [...this.emailsInbox, ...incomingInbox];
                        this.emailsSent = [...this.emailsSent, ...incomingSent];
                        this.emailsDrafts = [...this.emailsDrafts, ...incomingDrafts];
                        this.emails = this.emailsInbox;
                    } else if (app.appType === 'Notes') {
                        const incoming = this.normalizeNotes(data.notes ?? data.Notes ?? []);
                        this.notes = [...this.notes, ...incoming];
                    } else if (app.appType === 'Files') {
                        const incoming = this.normalizeFiles(data.items ?? data.Items ?? []);
                        this.files = [...this.files, ...incoming];
                    } else if (app.appType === 'Phone' || app.appType === 'Calls') {
                        const incoming = this.normalizeCalls(data.calls ?? data.Calls ?? []);
                        this.calls = [...this.calls, ...incoming];
                    }
                });

                this.loading = false;
                this.isLoadingDevice = false;
            },
            error: (error) => {
                console.error('Error loading public device:', error);
                this.loading = false;
                this.isLoadingDevice = false;
                this.loadDemoData();
            }
        });
    }

    /**
     * Load device data by slug (deviceType-ownerName) or by numeric deviceId (backward compatibility)
     */
    protected loadDeviceBySlug(slugOrId: string) {
        // Prevent multiple simultaneous loads
        if (this.isLoadingDevice) {
            console.log('Device load already in progress, skipping...');
            return;
        }

        this.isLoadingDevice = true;
        this.loading = true;

        // Backward compatibility: if numeric ID, load directly
        const numericId = parseInt(slugOrId, 10);
        if (!isNaN(numericId) && slugOrId === String(numericId)) {
            this.deviceId = numericId;
            this.loadDeviceData();
            return;
        }

        const parsed = parseDeviceSlug(slugOrId);
        if (!parsed) {
            console.error('Invalid device slug:', slugOrId);
            this.loading = false;
            this.isLoadingDevice = false;
            return;
        }

        this.deviceService.getDeviceBySlug(this.gameId, parsed.deviceType, parsed.ownerName).subscribe({
            next: (device) => {
                this.deviceId = device.deviceId;
                this.loadDeviceData();
            },
            error: (error) => {
                console.error('Error loading device by slug:', error);
                this.loading = false;
                this.isLoadingDevice = false;
            }
        });
    }

    ngOnDestroy() {
        // Clean up subscription to prevent memory leaks
        if (this.routeSubscription) {
            this.routeSubscription.unsubscribe();
        }
        // Stop audio playback if destroying
        this.endCall();
    }

    /**
     * Reset all device data to prevent showing stale data from previous device
     */
    protected resetDeviceData() {
        this.ownerName = 'Device';
        this.currentScreen = 'home';
        this.selectedConversation = null;
        this.selectedEmail = null;
        this.selectedNote = null;
        this.selectedFile = null;
        this.selectedPhoto = null;
        this.loading = true;
        this.conversations = [];
        this.photos = [];
        this.emails = [];
        this.emailsInbox = [];
        this.emailsSent = [];
        this.emailsDrafts = [];
        this.notes = [];
        this.files = [];
        this.calls = [];
        this.photosAppId = null;
        this.homePageIndex = 0;
    }

    loadDeviceData() {
        this.deviceService.getDeviceWithApps(this.gameId, this.deviceId).subscribe({
            next: (device) => {
                this.ownerName = device.ownerName;
                this.deviceType = device.deviceType as DeviceType || 'iPhone';

                // Lock screen: set passcode if device has one
                this.passcode = device.passcode ?? '';
                this.isLocked = !!device.passcode;
                this.pinEntry = '';

                // Load app data (accept both camelCase from API and PascalCase from older DB)
                this.conversations = [];
                this.photos = [];
                this.emailsInbox = [];
                this.emailsSent = [];
                this.emailsDrafts = [];
                this.notes = [];
                this.files = [];
                this.calls = [];

                device.apps.forEach((app: any) => {
                    const data = app.appData || {};
                    if (app.appType === 'Messages') {
                        const convs = data.conversations ?? data.Conversations ?? [];
                        const incoming = this.normalizeConversations(convs);
                        this.conversations = [...this.conversations, ...incoming];
                    } else if (app.appType === 'Photos') {
                        this.photosAppId = app.appId ?? this.photosAppId;
                        const list = data.photos ?? data.Photos ?? [];
                        const incoming = this.normalizePhotos(list);
                        this.photos = [...this.photos, ...incoming];
                    } else if (app.appType === 'Email') {
                        const inbox = data.inbox ?? data.Inbox ?? data.emails ?? data.Emails ?? [];
                        const sent = data.sent ?? data.Sent ?? [];
                        const drafts = data.drafts ?? data.Drafts ?? [];
                        const incomingInbox = this.normalizeEmails(Array.isArray(inbox) ? inbox : []);
                        const incomingSent = this.normalizeEmails(Array.isArray(sent) ? sent : []);
                        const incomingDrafts = this.normalizeEmails(Array.isArray(drafts) ? drafts : []);
                        this.emailsInbox = [...this.emailsInbox, ...incomingInbox];
                        this.emailsSent = [...this.emailsSent, ...incomingSent];
                        this.emailsDrafts = [...this.emailsDrafts, ...incomingDrafts];
                        this.emails = this.emailsInbox;
                    } else if (app.appType === 'Notes') {
                        const list = data.notes ?? data.Notes ?? [];
                        const incoming = this.normalizeNotes(list);
                        this.notes = [...this.notes, ...incoming];
                    } else if (app.appType === 'Files') {
                        const list = data.items ?? data.Items ?? [];
                        const incoming = this.normalizeFiles(list);
                        this.files = [...this.files, ...incoming];
                    } else if (app.appType === 'Phone' || app.appType === 'Calls') {
                        const list = data.calls ?? data.Calls ?? [];
                        const incoming = this.normalizeCalls(list);
                        this.calls = [...this.calls, ...incoming];
                    }
                });

                this.loading = false;
                this.isLoadingDevice = false;
            },
            error: (error) => {
                console.error('Error loading device:', error);
                this.loading = false;
                this.isLoadingDevice = false;
                this.loadDemoData();
            }
        });
    }

    /** Normalize app data from API (accepts PascalCase or camelCase) to camelCase for templates. If messages array is empty but lastMessage exists, use it as single message. */
    protected normalizeConversations(convs: any[]): Conversation[] {
        return (convs || []).map((c: any) => {
            const contact = c.contact ?? c.Contact ?? '';
            let lastMessage = c.lastMessage ?? c.LastMessage ?? '';
            let time = c.time ?? c.Time ?? '';
            let messages = (c.messages ?? c.Messages ?? []).map((m: any) => ({
                sender: m.sender ?? m.Sender ?? '',
                content: m.content ?? m.Content ?? '',
                timestamp: m.timestamp ?? m.Timestamp ?? '',
                isOutgoing: m.isOutgoing ?? m.IsOutgoing ?? false
            }));
            if (messages.length > 0 && (!lastMessage || !time)) {
                const last = messages[messages.length - 1];
                if (!lastMessage) lastMessage = last.content ?? '';
                if (!time) time = last.timestamp ?? '';
            }
            if (messages.length === 0 && lastMessage) {
                messages = [{ sender: contact, content: lastMessage, timestamp: time, isOutgoing: false }];
            }
            if (messages.length === 0) {
                messages = [{ sender: contact, content: '(fără conținut)', timestamp: time, isOutgoing: false }];
            }
            return {
                contact,
                avatar: c.avatar ?? c.Avatar ?? '👤',
                lastMessage,
                time,
                messages
            };
        });
    }
    protected normalizePhotos(list: any[]): Photo[] {
        return (list || []).map((p: any) => {
            const parsed = this.parsePhotoUploadRequirement(p.url ?? p.Url ?? '');
            return {
                ...parsed,
                caption: p.caption ?? p.Caption ?? ''
            };
        });
    }
    protected parsePhotoUploadRequirement(rawUrl: string): Partial<Photo> & { url: string } {
        const value = rawUrl || '';
        if (!value.startsWith('upload-required://')) {
            return { url: value, isUploadPlaceholder: false };
        }
        const withoutScheme = value.substring('upload-required://'.length);
        const [requiredUploadName, query] = withoutScheme.split('?');
        const params = new URLSearchParams(query || '');
        return {
            url: '',
            isUploadPlaceholder: true,
            requiredUploadName,
            requiredTypes: params.get('types') || 'jpg,jpeg,png',
            requiredSize: params.get('size') || '1080x1920'
        };
    }
    protected normalizeEmails(list: any[]): Email[] {
        return (list || []).map((e: any) => ({
            from: e.from ?? e.From ?? '',
            subject: e.subject ?? e.Subject ?? '',
            preview: e.preview ?? e.Preview ?? '',
            body: e.body ?? e.Body,
            time: e.time ?? e.Time ?? ''
        }));
    }
    protected normalizeNotes(list: any[]): Note[] {
        return (list || []).map((n: any) => ({
            title: n.title ?? n.Title ?? '',
            content: n.content ?? n.Content ?? '',
            time: n.time ?? n.Time ?? ''
        }));
    }
    protected normalizeFiles(list: any[]): FileItem[] {
        return (list || []).map((f: any) => ({
            name: f.name ?? f.Name ?? '',
            type: f.type ?? f.Type ?? 'Document',
            description: f.description ?? f.Description ?? ''
        }));
    }

    protected normalizeCalls(list: any[]): CallLog[] {
        return (list || []).map((c: any) => {
            const type = c.type ?? c.Type ?? '';
            const isIncoming = (type === 'Primit' || c.isIncoming) ?? c.IsIncoming ?? true;
            const answered = type !== 'Pierdut' && (c.answered ?? c.Answered ?? type !== 'Pierdut');
            const audioUrl = c.audioUrl ?? c.AudioUrl ?? '';
            return {
                contact: c.contact ?? c.Contact ?? c.number ?? c.Number ?? 'Unknown',
                time: c.time ?? c.Time ?? '',
                date: c.date ?? c.Date ?? '',
                duration: c.duration ?? c.Duration ?? '0 min',
                type: type || (isIncoming ? 'Primit' : 'Efectuat'),
                isIncoming,
                answered,
                // Only store audioUrl if it's a real data URL (not placeholder)
                audioUrl: (audioUrl && !audioUrl.startsWith('upload-required://')) ? audioUrl : '',
                audioFileName: c.audioFileName ?? c.AudioFileName ?? ''
            };
        });
    }

    loadDemoData() {
        this.ownerName = 'Evidence';
        this.conversations = [
            {
                contact: 'Detective Wilson',
                avatar: '🕵️',
                lastMessage: 'I need to speak with you about the incident',
                time: '2:45 PM',
                messages: [
                    { sender: 'Detective Wilson', content: 'Hello, I need to ask you a few questions', timestamp: '2:30 PM', isOutgoing: false },
                    { sender: 'Me', content: 'Of course, what do you need to know?', timestamp: '2:32 PM', isOutgoing: true },
                    { sender: 'Detective Wilson', content: 'Where were you last night between 8 and 10 PM?', timestamp: '2:35 PM', isOutgoing: false },
                    { sender: 'Me', content: 'I was at home watching TV', timestamp: '2:40 PM', isOutgoing: true },
                    { sender: 'Detective Wilson', content: 'I need to speak with you about the incident', timestamp: '2:45 PM', isOutgoing: false }
                ]
            },
            {
                contact: 'Sarah Mitchell',
                avatar: '👩',
                lastMessage: 'Did you hear what happened?',
                time: '1:20 PM',
                messages: [
                    { sender: 'Sarah Mitchell', content: 'OMG did you hear what happened?', timestamp: '1:15 PM', isOutgoing: false },
                    { sender: 'Me', content: 'No, what?', timestamp: '1:18 PM', isOutgoing: true },
                    { sender: 'Sarah Mitchell', content: 'Did you hear what happened?', timestamp: '1:20 PM', isOutgoing: false }
                ]
            }
        ];

        this.photos = [
            { url: 'https://via.placeholder.com/300x300/007aff/fff?text=Photo+1', caption: 'Office Party - Oct 15' },
            { url: 'https://via.placeholder.com/300x300/ff2d55/fff?text=Photo+2', caption: 'Evidence Found' },
            { url: 'https://via.placeholder.com/300x300/ffd60a/000?text=Photo+3', caption: 'Last seen location' }
        ];

        this.emailsInbox = [
            { from: 'boss@company.com', subject: 'Urgent Meeting Required', preview: 'We need to discuss the recent developments...', time: '10:30 AM' },
            { from: 'unknown@email.com', subject: 'You need to see this', preview: 'The truth about what happened that night...', time: 'Yesterday' }
        ];
        this.emailsSent = [
            { from: 'me', subject: 'Re: Meeting', preview: 'I will be there at 3PM...', time: 'Today, 9:15 AM' }
        ];
        this.emailsDrafts = [
            { from: 'me', subject: 'Follow-up', preview: 'Regarding our conversation...', time: 'Today' }
        ];
        this.emails = this.emailsInbox;

        this.notes = [
            { title: 'Things to Remember', content: 'Call lawyer at 3PM. Don\'t forget the meeting with...', time: 'Oct 20' },
            { title: 'Suspicious Activity', content: 'Saw someone lurking near the building around midnight...', time: 'Oct 19' }
        ];
        this.files = [];
        this.calls = [
            { contact: 'Detective Wilson', time: 'Today, 2:35 PM', duration: '3 min', isIncoming: false, answered: true },
            { contact: '0722123456', time: 'Today, 1:20 PM', duration: '0 min', isIncoming: true, answered: false },
            { contact: 'Sarah Mitchell', time: 'Yesterday, 4:15 PM', duration: '12 min', isIncoming: true, answered: true },
            { contact: '0744987654', time: 'Yesterday, 11:30 AM', duration: '0 min', isIncoming: true, answered: false },
        ];
    }

    openApp(appName: string) {
        if (this.loading) { console.log('Device data still loading, please wait...'); return; }
        if (this.isLocked) { return; }  // block while locked

        // Always "re-open" the app even if already active.
        // This makes icon taps deterministic (e.g. tap Messages icon -> conversations list).
        this.currentScreen = appName;

        // Reset selected conversation, email, note when opening any app
        this.selectedConversation = null;
        this.selectedEmail = null;
        this.selectedNote = null;
        this.selectedFile = null;
        this.selectedPhoto = null;
        if (appName !== 'email') this.emailFolder = 'inbox';
    }

    goHome() {
        if (this.isLocked) return;  // block while locked
        this.currentScreen = 'home';
        this.selectedConversation = null;
        this.selectedEmail = null;
        this.selectedNote = null;
        this.selectedFile = null;
        this.selectedPhoto = null;
    }

    selectConversation(conv: Conversation) { this.selectedConversation = conv; }

    // ── Lock screen PIN handling ───────────────────────────────────────────────
    pinPress(digit: string) {
        if (this.pinEntry.length >= 6) return;
        this.pinEntry += digit;
        if (this.pinEntry.length === this.passcode.length) {
            this.unlock(this.pinEntry);
        }
    }

    pinBackspace() {
        this.pinEntry = this.pinEntry.slice(0, -1);
    }

    unlock(pin: string) {
        if (pin === this.passcode) {
            this.isLocked = false;
            this.pinEntry = '';
        } else {
            // Wrong PIN — shake and clear
            this.pinShake = true;
            setTimeout(() => {
                this.pinShake = false;
                this.pinEntry = '';
            }, 600);
        }
    }

    selectEmail(email: Email | null) {
        this.selectedEmail = email;
    }

    emailFolder: 'inbox' | 'sent' | 'drafts' = 'inbox';

    setEmailFolder(folder: 'inbox' | 'sent' | 'drafts') {
        this.emailFolder = folder;
    }

    get emailsForFolder(): Email[] {
        if (this.emailFolder === 'inbox') return this.emailsInbox;
        if (this.emailFolder === 'sent') return this.emailsSent;
        return this.emailsDrafts;
    }

    selectNote(note: Note | null) {
        this.selectedNote = note;
    }

    selectFile(file: FileItem | null) {
        this.selectedFile = file;
    }

    selectPhoto(photo: Photo | null) {
        this.selectedPhoto = photo;
    }

    isPhotoPendingUpload(photo: Photo): boolean {
        return !!photo.isUploadPlaceholder;
    }

    getPhotoDisplayUrl(photo: Photo): string {
        if (photo.url) return photo.url;
        if (photo.isUploadPlaceholder) {
            // No text on placeholder inside device UI; upload is done from device menu.
            return "data:image/svg+xml;utf8," + encodeURIComponent(
                `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'>
                    <rect width='100%' height='100%' fill='#d9d9de'/>
                </svg>`
            );
        }
        return "data:image/svg+xml;utf8," + encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'>
                <rect width='100%' height='100%' fill='#e8e8ea'/>
                <text x='50%' y='45%' text-anchor='middle' fill='#666' font-size='28' font-family='Arial'>Upload required</text>
                <text x='50%' y='52%' text-anchor='middle' fill='#666' font-size='18' font-family='Arial'>${photo.requiredUploadName ?? ''}</text>
            </svg>`
        );
    }

    onPhotoUploadSelected(photo: Photo, event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file || !this.photosAppId) return;

        const expectedName = (photo.requiredUploadName ?? '').toLowerCase();
        if (expectedName && file.name.toLowerCase() !== expectedName) {
            alert(`Numele fișierului trebuie să fie exact: ${photo.requiredUploadName}`);
            input.value = '';
            return;
        }

        const allowed = (photo.requiredTypes ?? 'jpg,jpeg,png').split(',').map(s => s.trim().toLowerCase());
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        if (!allowed.includes(ext)) {
            alert(`Format invalid. Permis: ${allowed.join(', ')}`);
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result ?? '');
            if (!dataUrl) return;
            photo.url = dataUrl;
            photo.isUploadPlaceholder = false;

            this.deviceService.updateDeviceApp(this.gameId, this.deviceId, this.photosAppId!, {
                appData: {
                    photos: this.photos.map(p => ({ url: p.url, caption: p.caption }))
                }
            }).subscribe({
                next: () => input.value = '',
                error: () => alert('Nu am putut salva poza.')
            });
        };
        reader.readAsDataURL(file);
    }

    /** Display helpers: accept both camelCase and PascalCase from API */
    getMsgContent(msg: any): string {
        return (msg?.content ?? msg?.Content ?? '') || '\u00A0';
    }
    getMsgSender(msg: any): string {
        return msg?.sender ?? msg?.Sender ?? '';
    }
    getMsgTimestamp(msg: any): string {
        return msg?.timestamp ?? msg?.Timestamp ?? '';
    }

    // Swipe gesture detection
    onTouchStart(event: TouchEvent) {
        // Check if touch started on an app icon or interactive element
        const target = event.target as HTMLElement;
        if (
            target.closest('.app-icon') ||
            target.closest('.ios-dock') ||
            target.closest('.samsung-app') ||
            target.closest('.samsung-dock') ||
            target.closest('.win11-desktop-icon') ||
            target.closest('.win11-taskbar-icon') ||
            target.closest('.conversation-item') ||
            target.closest('.email-item') ||
            target.closest('.note-item') ||
            target.closest('.file-item')
        ) {
            // Don't track swipe if interacting with lists/icons
            this.touchStartX = 0;
            this.touchStartY = 0;
            return;
        }
        this.touchStartX = event.changedTouches[0].screenX;
        this.touchStartY = event.changedTouches[0].screenY;
        this.touchEndX = this.touchStartX;
        this.touchEndY = this.touchStartY;
        this.touchStartTime = Date.now();
    }

    onTouchMove(event: TouchEvent) {
        if (this.touchStartX === 0) return; // Ignore if not tracking
        this.touchEndX = event.changedTouches[0].screenX;
        this.touchEndY = event.changedTouches[0].screenY;
    }

    onTouchEnd(event?: TouchEvent) {
        if (event) {
            const target = event.target as HTMLElement;
            if (target.closest('.app-icon') || target.closest('.ios-dock') || target.closest('.samsung-app') || target.closest('.samsung-dock')) {
                this.touchStartX = 0;
                this.touchStartY = 0;
                return;
            }
        }
        this.handleSwipe();
    }

    onMouseDown(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (
            target.closest('.app-icon') ||
            target.closest('.ios-dock') ||
            target.closest('.samsung-app') ||
            target.closest('.samsung-dock') ||
            target.closest('.win11-desktop-icon') ||
            target.closest('.win11-taskbar-icon') ||
            target.closest('.conversation-item') ||
            target.closest('.email-item') ||
            target.closest('.note-item') ||
            target.closest('.file-item')
        ) {
            this.touchStartX = 0;
            this.touchStartY = 0;
            return;
        }
        this.touchStartX = event.screenX;
        this.touchStartY = event.screenY;
        this.touchEndX = this.touchStartX;
        this.touchEndY = this.touchStartY;
        this.touchStartTime = Date.now();
    }

    onMouseMove(event: MouseEvent) {
        if (this.touchStartX === 0) return; // Ignore if not tracking
        this.touchEndX = event.screenX;
        this.touchEndY = event.screenY;
    }

    onMouseUp(event?: MouseEvent) {
        if (event) {
            const target = event.target as HTMLElement;
            if (target.closest('.app-icon') || target.closest('.ios-dock') || target.closest('.samsung-app') || target.closest('.samsung-dock')) {
                this.touchStartX = 0;
                this.touchStartY = 0;
                return;
            }
        }
        if (this.touchStartX !== 0) {
            this.handleSwipe();
            this.touchStartX = 0;
            this.touchEndX = 0;
        }
    }

    protected handleSwipe() {
        if (this.touchStartX === 0) return; // No swipe tracking active

        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const deltaTime = Date.now() - this.touchStartTime;

        // Only process swipe if:
        // 1. Horizontal movement is significantly greater than vertical
        // 2. Horizontal movement exceeds threshold
        // 3. Movement happened within time threshold (quick swipe)
        const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 2;
        const exceedsThreshold = Math.abs(deltaX) > this.swipeThreshold;
        const isQuickSwipe = deltaTime < this.swipeTimeThreshold;

        if (isHorizontalSwipe && exceedsThreshold && isQuickSwipe) {
            if (this.currentScreen === 'home') {
                if (deltaX > this.swipeThreshold) {
                    this.prevHomePage();
                } else if (deltaX < -this.swipeThreshold) {
                    this.nextHomePage();
                }
            } else {
                if (deltaX > this.swipeThreshold) {
                    if (this.selectedConversation) {
                        this.selectedConversation = null;
                    } else {
                        this.goHome();
                    }
                }
            }
        }

        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.touchStartTime = 0;
    }

    nextHomePage() {
        if (this.homePageIndex < this.homePageCount - 1) {
            this.homePageIndex++;
        }
    }

    prevHomePage() {
        if (this.homePageIndex > 0) {
            this.homePageIndex--;
        }
    }

    get homePageIndices(): number[] {
        return Array.from({ length: this.homePageCount }, (_, i) => i);
    }

    // ── Phone Call Simulator ──────────────────────────────────────────────────

    /** Returns calls sorted by date + time descending (newest first) */
    get sortedCalls(): CallLog[] {
        return [...this.calls].sort((a, b) => {
            const ts = (c: CallLog) => {
                // Parse "DD.MM.YYYY" date and "HH:MM" time into a timestamp
                const [day, month, year] = (c.date ?? '').split('.').map(Number);
                const [h, m] = (c.time ?? '').split(':').map(Number);
                if (year && month && day) {
                    return new Date(year, month - 1, day, h || 0, m || 0).getTime();
                }
                // Fallback: treat time string as-is for ordering
                return 0;
            };
            return ts(b) - ts(a);
        });
    }

    /** Returns a human-readable date label for grouping (e.g. "21.10.2007") */
    getCallDateLabel(call: CallLog): string {
        return call.date || call.time || '—';
    }

    initiateCall(call: CallLog) {
        if (!call) return;
        this.activeCall = call;
        this.callSeconds = 0;
        this.callDuration = '00:00';

        // Play the pre-recorded audio attached to this call
        if (call.audioUrl) {
            this.audioObj.src = call.audioUrl;
        } else {
            // No audio for this call — just keep the overlay open without sound
            this.audioObj.src = '';
        }
        this.audioObj.load();
        this.audioObj.play().catch(e => console.log('Audio playback prevented by browser policy (needs user interaction).', e));

        this.callTimer = setInterval(() => {
            this.callSeconds++;
            const m = Math.floor(this.callSeconds / 60).toString().padStart(2, '0');
            const s = (this.callSeconds % 60).toString().padStart(2, '0');
            this.callDuration = `${m}:${s}`;
        }, 1000);
    }

    endCall() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
        this.audioObj.pause();
        this.audioObj.currentTime = 0;
        this.activeCall = null;
    }
}
