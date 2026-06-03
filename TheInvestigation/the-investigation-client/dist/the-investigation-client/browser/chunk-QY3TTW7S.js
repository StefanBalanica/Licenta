import {
  ActivatedRoute,
  CommonModule,
  DefaultValueAccessor,
  DeviceService,
  FormsModule,
  HttpClient,
  Location,
  NgControlStatus,
  NgForOf,
  NgIf,
  NgModel,
  __spreadProps,
  __spreadValues,
  environment,
  parseDeviceSlug,
  ɵsetClassDebugInfo,
  ɵɵInheritDefinitionFeature,
  ɵɵNgOnChangesFeature,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵclassMap,
  ɵɵclassProp,
  ɵɵdefineComponent,
  ɵɵdefineDirective,
  ɵɵdefineInjectable,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵelementContainerEnd,
  ɵɵelementContainerStart,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵgetInheritedFactory,
  ɵɵinject,
  ɵɵlistener,
  ɵɵloadQuery,
  ɵɵnamespaceHTML,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵpureFunction0,
  ɵɵqueryRefresh,
  ɵɵreference,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵsanitizeUrl,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtemplateRefExtractor,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty,
  ɵɵviewQuery
} from "./chunk-MEGTMNVR.js";

// src/app/components/devices/base-device.component.ts
var BaseDeviceComponent = class _BaseDeviceComponent {
  route;
  deviceService;
  location;
  routeSubscription;
  isLoadingDevice = false;
  // Prevent multiple simultaneous loads
  gameId = 0;
  deviceId = 0;
  ownerName = "Device";
  currentScreen = "home";
  selectedConversation = null;
  selectedEmail = null;
  selectedNote = null;
  selectedFile = null;
  selectedPhoto = null;
  loading = true;
  deviceType = "iPhone";
  /** Home screen page index (0-based) for swipe left/right between app pages */
  homePageIndex = 0;
  homePageCount = 3;
  // ── Lock screen ───────────────────────────────────────────────────────────
  isLocked = false;
  passcode = "";
  pinEntry = "";
  pinShake = false;
  conversations = [];
  photos = [];
  emails = [];
  emailsInbox = [];
  emailsSent = [];
  emailsDrafts = [];
  notes = [];
  files = [];
  calls = [];
  photosAppId = null;
  // Swipe detection properties
  touchStartX = 0;
  touchStartY = 0;
  touchEndX = 0;
  touchEndY = 0;
  touchStartTime = 0;
  swipeThreshold = 100;
  // Increased threshold to avoid interference with clicks
  swipeTimeThreshold = 300;
  // Max time for a swipe (ms)
  // Audio Calling State
  activeCall = null;
  callDuration = "00:00";
  audioObj = new Audio();
  callTimer;
  callSeconds = 0;
  constructor(route, deviceService, location2) {
    this.route = route;
    this.deviceService = deviceService;
    this.location = location2;
  }
  ngOnInit() {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const gameIdParam = params.get("gameId");
      const deviceSlugParam = params.get("deviceSlug");
      if (gameIdParam && deviceSlugParam) {
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
  loadPublicDeviceBySlug(slug) {
    if (this.isLoadingDevice)
      return;
    this.isLoadingDevice = true;
    this.loading = true;
    this.deviceService.getDeviceByPublicSlug(slug).subscribe({
      next: (device) => {
        this.gameId = device.gameId;
        this.deviceId = device.deviceId;
        this.ownerName = device.ownerName;
        this.deviceType = device.deviceType || "iPhone";
        this.passcode = device.passcode ?? "";
        this.isLocked = !!device.passcode;
        this.pinEntry = "";
        this.conversations = [];
        this.photos = [];
        this.emailsInbox = [];
        this.emailsSent = [];
        this.emailsDrafts = [];
        this.notes = [];
        this.files = [];
        this.calls = [];
        (device.apps ?? []).forEach((app) => {
          const data = app.appData || {};
          if (app.appType === "Messages") {
            const incoming = this.normalizeConversations(data.conversations ?? data.Conversations ?? []);
            this.conversations = [...this.conversations, ...incoming];
          } else if (app.appType === "Photos") {
            const incoming = this.normalizePhotos(data.photos ?? data.Photos ?? []);
            this.photos = [...this.photos, ...incoming];
          } else if (app.appType === "Email") {
            const incomingInbox = this.normalizeEmails(Array.isArray(data.inbox ?? data.Inbox) ? data.inbox ?? data.Inbox : []);
            const incomingSent = this.normalizeEmails(Array.isArray(data.sent ?? data.Sent) ? data.sent ?? data.Sent : []);
            const incomingDrafts = this.normalizeEmails(Array.isArray(data.drafts ?? data.Drafts) ? data.drafts ?? data.Drafts : []);
            this.emailsInbox = [...this.emailsInbox, ...incomingInbox];
            this.emailsSent = [...this.emailsSent, ...incomingSent];
            this.emailsDrafts = [...this.emailsDrafts, ...incomingDrafts];
            this.emails = this.emailsInbox;
          } else if (app.appType === "Notes") {
            const incoming = this.normalizeNotes(data.notes ?? data.Notes ?? []);
            this.notes = [...this.notes, ...incoming];
          } else if (app.appType === "Files") {
            const incoming = this.normalizeFiles(data.items ?? data.Items ?? []);
            this.files = [...this.files, ...incoming];
          } else if (app.appType === "Phone" || app.appType === "Calls") {
            const incoming = this.normalizeCalls(data.calls ?? data.Calls ?? []);
            this.calls = [...this.calls, ...incoming];
          }
        });
        this.loading = false;
        this.isLoadingDevice = false;
      },
      error: (error) => {
        console.error("Error loading public device:", error);
        this.loading = false;
        this.isLoadingDevice = false;
        this.loadDemoData();
      }
    });
  }
  /**
   * Load device data by slug (deviceType-ownerName) or by numeric deviceId (backward compatibility)
   */
  loadDeviceBySlug(slugOrId) {
    if (this.isLoadingDevice) {
      console.log("Device load already in progress, skipping...");
      return;
    }
    this.isLoadingDevice = true;
    this.loading = true;
    const numericId = parseInt(slugOrId, 10);
    if (!isNaN(numericId) && slugOrId === String(numericId)) {
      this.deviceId = numericId;
      this.loadDeviceData();
      return;
    }
    const parsed = parseDeviceSlug(slugOrId);
    if (!parsed) {
      console.error("Invalid device slug:", slugOrId);
      this.loading = false;
      this.isLoadingDevice = false;
      return;
    }
    this.deviceService.getDeviceBySlug(this.gameId, parsed.deviceType, parsed.ownerName).subscribe({
      next: (device) => {
        this.deviceId = device.deviceId;
        this.location.replaceState("/" + slugOrId);
        this.loadDeviceData();
      },
      error: (error) => {
        console.error("Error loading device by slug:", error);
        this.loading = false;
        this.isLoadingDevice = false;
      }
    });
  }
  ngOnDestroy() {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    this.endCall();
  }
  /**
   * Reset all device data to prevent showing stale data from previous device
   */
  resetDeviceData() {
    this.ownerName = "Device";
    this.currentScreen = "home";
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
        this.deviceType = device.deviceType || "iPhone";
        this.passcode = device.passcode ?? "";
        this.isLocked = !!device.passcode;
        this.pinEntry = "";
        this.conversations = [];
        this.photos = [];
        this.emailsInbox = [];
        this.emailsSent = [];
        this.emailsDrafts = [];
        this.notes = [];
        this.files = [];
        this.calls = [];
        device.apps.forEach((app) => {
          const data = app.appData || {};
          if (app.appType === "Messages") {
            const convs = data.conversations ?? data.Conversations ?? [];
            const incoming = this.normalizeConversations(convs);
            this.conversations = [...this.conversations, ...incoming];
          } else if (app.appType === "Photos") {
            this.photosAppId = app.appId ?? this.photosAppId;
            const list = data.photos ?? data.Photos ?? [];
            const incoming = this.normalizePhotos(list);
            this.photos = [...this.photos, ...incoming];
          } else if (app.appType === "Email") {
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
          } else if (app.appType === "Notes") {
            const list = data.notes ?? data.Notes ?? [];
            const incoming = this.normalizeNotes(list);
            this.notes = [...this.notes, ...incoming];
          } else if (app.appType === "Files") {
            const list = data.items ?? data.Items ?? [];
            const incoming = this.normalizeFiles(list);
            this.files = [...this.files, ...incoming];
          } else if (app.appType === "Phone" || app.appType === "Calls") {
            const list = data.calls ?? data.Calls ?? [];
            const incoming = this.normalizeCalls(list);
            this.calls = [...this.calls, ...incoming];
          }
        });
        this.loading = false;
        this.isLoadingDevice = false;
      },
      error: (error) => {
        console.error("Error loading device:", error);
        this.loading = false;
        this.isLoadingDevice = false;
        this.loadDemoData();
      }
    });
  }
  /** Normalize app data from API (accepts PascalCase or camelCase) to camelCase for templates. If messages array is empty but lastMessage exists, use it as single message. */
  normalizeConversations(convs) {
    return (convs || []).map((c) => {
      const contact = c.contact ?? c.Contact ?? "";
      let lastMessage = c.lastMessage ?? c.LastMessage ?? "";
      let time = c.time ?? c.Time ?? "";
      let messages = (c.messages ?? c.Messages ?? []).map((m) => ({
        sender: m.sender ?? m.Sender ?? "",
        content: m.content ?? m.Content ?? "",
        timestamp: m.timestamp ?? m.Timestamp ?? "",
        isOutgoing: m.isOutgoing ?? m.IsOutgoing ?? false
      }));
      if (messages.length > 0 && (!lastMessage || !time)) {
        const last = messages[messages.length - 1];
        if (!lastMessage)
          lastMessage = last.content ?? "";
        if (!time)
          time = last.timestamp ?? "";
      }
      if (messages.length === 0 && lastMessage) {
        messages = [{ sender: contact, content: lastMessage, timestamp: time, isOutgoing: false }];
      }
      if (messages.length === 0) {
        messages = [{ sender: contact, content: "(fara continut)", timestamp: time, isOutgoing: false }];
      }
      return {
        contact,
        avatar: c.avatar ?? c.Avatar ?? "\u{1F464}",
        lastMessage,
        time,
        messages
      };
    });
  }
  normalizePhotos(list) {
    return (list || []).map((p) => {
      const parsed = this.parsePhotoUploadRequirement(p.url ?? p.Url ?? "");
      return __spreadProps(__spreadValues({}, parsed), {
        caption: p.caption ?? p.Caption ?? ""
      });
    });
  }
  parsePhotoUploadRequirement(rawUrl) {
    const value = rawUrl || "";
    if (!value.startsWith("upload-required://")) {
      return { url: value, isUploadPlaceholder: false };
    }
    const withoutScheme = value.substring("upload-required://".length);
    const [requiredUploadName, query] = withoutScheme.split("?");
    const params = new URLSearchParams(query || "");
    return {
      url: "",
      isUploadPlaceholder: true,
      requiredUploadName,
      requiredTypes: params.get("types") || "jpg,jpeg,png",
      requiredSize: params.get("size") || "1080x1920"
    };
  }
  normalizeEmails(list) {
    return (list || []).map((e) => ({
      from: e.from ?? e.From ?? "",
      subject: e.subject ?? e.Subject ?? "",
      preview: e.preview ?? e.Preview ?? "",
      body: e.body ?? e.Body,
      time: e.time ?? e.Time ?? ""
    }));
  }
  normalizeNotes(list) {
    return (list || []).map((n) => ({
      title: n.title ?? n.Title ?? "",
      content: n.content ?? n.Content ?? "",
      time: n.time ?? n.Time ?? ""
    }));
  }
  normalizeFiles(list) {
    return (list || []).map((f) => ({
      name: f.name ?? f.Name ?? "",
      type: f.type ?? f.Type ?? "Document",
      description: f.description ?? f.Description ?? "",
      fileFormat: f.fileFormat ?? f.FileFormat ?? "",
      modifiedAt: f.modifiedAt ?? f.ModifiedAt ?? "",
      size: f.size ?? f.Size ?? "",
      content: f.content ?? f.Content ?? "",
      rows: f.rows ?? f.Rows ?? []
    }));
  }
  normalizeCalls(list) {
    return (list || []).map((c) => {
      const type = c.type ?? c.Type ?? "";
      const isIncoming = (type === "Primit" || c.isIncoming) ?? c.IsIncoming ?? true;
      const answered = type !== "Pierdut" && (c.answered ?? c.Answered ?? type !== "Pierdut");
      const audioUrl = c.audioUrl ?? c.AudioUrl ?? "";
      return {
        contact: c.contact ?? c.Contact ?? c.number ?? c.Number ?? "Unknown",
        time: c.time ?? c.Time ?? "",
        date: c.date ?? c.Date ?? "",
        duration: c.duration ?? c.Duration ?? "0 min",
        type: type || (isIncoming ? "Primit" : "Efectuat"),
        isIncoming,
        answered,
        // Only store audioUrl if it's a real data URL (not placeholder)
        audioUrl: audioUrl && !audioUrl.startsWith("upload-required://") ? audioUrl : "",
        audioFileName: c.audioFileName ?? c.AudioFileName ?? ""
      };
    });
  }
  loadDemoData() {
    this.ownerName = "Evidence";
    this.conversations = [
      {
        contact: "Detective Wilson",
        avatar: "\u{1F575}\uFE0F",
        lastMessage: "I need to speak with you about the incident",
        time: "2:45 PM",
        messages: [
          { sender: "Detective Wilson", content: "Hello, I need to ask you a few questions", timestamp: "2:30 PM", isOutgoing: false },
          { sender: "Me", content: "Of course, what do you need to know?", timestamp: "2:32 PM", isOutgoing: true },
          { sender: "Detective Wilson", content: "Where were you last night between 8 and 10 PM?", timestamp: "2:35 PM", isOutgoing: false },
          { sender: "Me", content: "I was at home watching TV", timestamp: "2:40 PM", isOutgoing: true },
          { sender: "Detective Wilson", content: "I need to speak with you about the incident", timestamp: "2:45 PM", isOutgoing: false }
        ]
      },
      {
        contact: "Sarah Mitchell",
        avatar: "\u{1F469}",
        lastMessage: "Did you hear what happened?",
        time: "1:20 PM",
        messages: [
          { sender: "Sarah Mitchell", content: "OMG did you hear what happened?", timestamp: "1:15 PM", isOutgoing: false },
          { sender: "Me", content: "No, what?", timestamp: "1:18 PM", isOutgoing: true },
          { sender: "Sarah Mitchell", content: "Did you hear what happened?", timestamp: "1:20 PM", isOutgoing: false }
        ]
      }
    ];
    this.photos = [
      { url: "https://via.placeholder.com/300x300/007aff/fff?text=Photo+1", caption: "Office Party - Oct 15" },
      { url: "https://via.placeholder.com/300x300/ff2d55/fff?text=Photo+2", caption: "Evidence Found" },
      { url: "https://via.placeholder.com/300x300/ffd60a/000?text=Photo+3", caption: "Last seen location" }
    ];
    this.emailsInbox = [
      { from: "boss@company.com", subject: "Urgent Meeting Required", preview: "We need to discuss the recent developments...", time: "10:30 AM" },
      { from: "unknown@email.com", subject: "You need to see this", preview: "The truth about what happened that night...", time: "Yesterday" }
    ];
    this.emailsSent = [
      { from: "me", subject: "Re: Meeting", preview: "I will be there at 3PM...", time: "Today, 9:15 AM" }
    ];
    this.emailsDrafts = [
      { from: "me", subject: "Follow-up", preview: "Regarding our conversation...", time: "Today" }
    ];
    this.emails = this.emailsInbox;
    this.notes = [
      { title: "Things to Remember", content: "Call lawyer at 3PM. Don't forget the meeting with...", time: "Oct 20" },
      { title: "Suspicious Activity", content: "Saw someone lurking near the building around midnight...", time: "Oct 19" }
    ];
    this.files = [];
    this.calls = [
      { contact: "Detective Wilson", time: "Today, 2:35 PM", duration: "3 min", isIncoming: false, answered: true },
      { contact: "0722123456", time: "Today, 1:20 PM", duration: "0 min", isIncoming: true, answered: false },
      { contact: "Sarah Mitchell", time: "Yesterday, 4:15 PM", duration: "12 min", isIncoming: true, answered: true },
      { contact: "0744987654", time: "Yesterday, 11:30 AM", duration: "0 min", isIncoming: true, answered: false }
    ];
  }
  openApp(appName) {
    if (this.loading) {
      console.log("Device data still loading, please wait...");
      return;
    }
    if (this.isLocked) {
      return;
    }
    this.currentScreen = appName;
    this.selectedConversation = null;
    this.selectedEmail = null;
    this.selectedNote = null;
    this.selectedFile = null;
    this.selectedPhoto = null;
    if (appName !== "email")
      this.emailFolder = "inbox";
  }
  goHome() {
    if (this.isLocked)
      return;
    this.currentScreen = "home";
    this.selectedConversation = null;
    this.selectedEmail = null;
    this.selectedNote = null;
    this.selectedFile = null;
    this.selectedPhoto = null;
  }
  selectConversation(conv) {
    this.selectedConversation = conv;
  }
  // ── Lock screen PIN handling ───────────────────────────────────────────────
  pinPress(digit) {
    if (this.pinEntry.length >= 6)
      return;
    this.pinEntry += digit;
    if (this.pinEntry.length === this.passcode.length) {
      this.unlock(this.pinEntry);
    }
  }
  pinBackspace() {
    this.pinEntry = this.pinEntry.slice(0, -1);
  }
  unlock(pin) {
    if (pin === this.passcode) {
      this.isLocked = false;
      this.pinEntry = "";
    } else {
      this.pinShake = true;
      setTimeout(() => {
        this.pinShake = false;
        this.pinEntry = "";
      }, 600);
    }
  }
  selectEmail(email) {
    this.selectedEmail = email;
  }
  emailFolder = "inbox";
  setEmailFolder(folder) {
    this.emailFolder = folder;
  }
  get emailsForFolder() {
    if (this.emailFolder === "inbox")
      return this.emailsInbox;
    if (this.emailFolder === "sent")
      return this.emailsSent;
    return this.emailsDrafts;
  }
  selectNote(note) {
    this.selectedNote = note;
  }
  selectFile(file) {
    this.selectedFile = file;
  }
  selectPhoto(photo) {
    this.selectedPhoto = photo;
  }
  isPhotoPendingUpload(photo) {
    return !!photo.isUploadPlaceholder;
  }
  getPhotoDisplayUrl(photo) {
    if (photo.url)
      return photo.url;
    if (photo.isUploadPlaceholder) {
      return "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'>
                    <rect width='100%' height='100%' fill='#d9d9de'/>
                </svg>`);
    }
    return "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'>
                <rect width='100%' height='100%' fill='#e8e8ea'/>
                <text x='50%' y='45%' text-anchor='middle' fill='#666' font-size='28' font-family='Arial'>Upload required</text>
                <text x='50%' y='52%' text-anchor='middle' fill='#666' font-size='18' font-family='Arial'>${photo.requiredUploadName ?? ""}</text>
            </svg>`);
  }
  onPhotoUploadSelected(photo, event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file || !this.photosAppId)
      return;
    const expectedName = (photo.requiredUploadName ?? "").toLowerCase();
    if (expectedName && file.name.toLowerCase() !== expectedName) {
      alert(`Numele fisierului trebuie sa fie exact: ${photo.requiredUploadName}`);
      input.value = "";
      return;
    }
    const allowed = (photo.requiredTypes ?? "jpg,jpeg,png").split(",").map((s) => s.trim().toLowerCase());
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowed.includes(ext)) {
      alert(`Format invalid. Permis: ${allowed.join(", ")}`);
      input.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      if (!dataUrl)
        return;
      photo.url = dataUrl;
      photo.isUploadPlaceholder = false;
      this.deviceService.updateDeviceApp(this.gameId, this.deviceId, this.photosAppId, {
        appData: {
          photos: this.photos.map((p) => ({ url: p.url, caption: p.caption }))
        }
      }).subscribe({
        next: () => input.value = "",
        error: () => alert("Nu am putut salva poza.")
      });
    };
    reader.readAsDataURL(file);
  }
  /** Display helpers: accept both camelCase and PascalCase from API */
  getMsgContent(msg) {
    return (msg?.content ?? msg?.Content ?? "") || "\xA0";
  }
  getMsgSender(msg) {
    return msg?.sender ?? msg?.Sender ?? "";
  }
  getMsgTimestamp(msg) {
    return msg?.timestamp ?? msg?.Timestamp ?? "";
  }
  // Swipe gesture detection
  onTouchStart(event) {
    const target = event.target;
    if (target.closest(".app-icon") || target.closest(".ios-dock") || target.closest(".samsung-app") || target.closest(".samsung-dock") || target.closest(".win11-desktop-icon") || target.closest(".win11-taskbar-icon") || target.closest(".conversation-item") || target.closest(".email-item") || target.closest(".note-item") || target.closest(".file-item")) {
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
  onTouchMove(event) {
    if (this.touchStartX === 0)
      return;
    this.touchEndX = event.changedTouches[0].screenX;
    this.touchEndY = event.changedTouches[0].screenY;
  }
  onTouchEnd(event) {
    if (event) {
      const target = event.target;
      if (target.closest(".app-icon") || target.closest(".ios-dock") || target.closest(".samsung-app") || target.closest(".samsung-dock")) {
        this.touchStartX = 0;
        this.touchStartY = 0;
        return;
      }
    }
    this.handleSwipe();
  }
  onMouseDown(event) {
    const target = event.target;
    if (target.closest(".app-icon") || target.closest(".ios-dock") || target.closest(".samsung-app") || target.closest(".samsung-dock") || target.closest(".win11-desktop-icon") || target.closest(".win11-taskbar-icon") || target.closest(".conversation-item") || target.closest(".email-item") || target.closest(".note-item") || target.closest(".file-item")) {
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
  onMouseMove(event) {
    if (this.touchStartX === 0)
      return;
    this.touchEndX = event.screenX;
    this.touchEndY = event.screenY;
  }
  onMouseUp(event) {
    if (event) {
      const target = event.target;
      if (target.closest(".app-icon") || target.closest(".ios-dock") || target.closest(".samsung-app") || target.closest(".samsung-dock")) {
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
  handleSwipe() {
    if (this.touchStartX === 0)
      return;
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    const deltaTime = Date.now() - this.touchStartTime;
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 2;
    const exceedsThreshold = Math.abs(deltaX) > this.swipeThreshold;
    const isQuickSwipe = deltaTime < this.swipeTimeThreshold;
    if (isHorizontalSwipe && exceedsThreshold && isQuickSwipe) {
      if (this.currentScreen === "home") {
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
  get homePageIndices() {
    return Array.from({ length: this.homePageCount }, (_, i) => i);
  }
  // ── Phone Call Simulator ──────────────────────────────────────────────────
  /** Returns calls sorted by date + time descending (newest first) */
  get sortedCalls() {
    return [...this.calls].sort((a, b) => {
      const ts = (c) => {
        const [day, month, year] = (c.date ?? "").split(".").map(Number);
        const [h, m] = (c.time ?? "").split(":").map(Number);
        if (year && month && day) {
          return new Date(year, month - 1, day, h || 0, m || 0).getTime();
        }
        return 0;
      };
      return ts(b) - ts(a);
    });
  }
  /** Returns a human-readable date label for grouping (e.g. "21.10.2007") */
  getCallDateLabel(call) {
    return call.date || call.time || "\u2014";
  }
  initiateCall(call) {
    if (!call)
      return;
    this.activeCall = call;
    this.callSeconds = 0;
    this.callDuration = "00:00";
    if (call.audioUrl) {
      this.audioObj.src = call.audioUrl;
    } else {
      this.audioObj.src = "";
    }
    this.audioObj.load();
    this.audioObj.play().catch((e) => console.log("Audio playback prevented by browser policy (needs user interaction).", e));
    this.callTimer = setInterval(() => {
      this.callSeconds++;
      const m = Math.floor(this.callSeconds / 60).toString().padStart(2, "0");
      const s = (this.callSeconds % 60).toString().padStart(2, "0");
      this.callDuration = `${m}:${s}`;
    }, 1e3);
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
  static \u0275fac = function BaseDeviceComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _BaseDeviceComponent)(\u0275\u0275directiveInject(ActivatedRoute), \u0275\u0275directiveInject(DeviceService), \u0275\u0275directiveInject(Location));
  };
  static \u0275dir = /* @__PURE__ */ \u0275\u0275defineDirective({ type: _BaseDeviceComponent });
};

// src/app/components/devices/iphone/iphone-device.component.ts
function IPhoneDeviceComponent_div_0_div_3_div_33_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 58);
  }
  if (rf & 2) {
    const i_r3 = ctx.index;
    const ctx_r3 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("lock-dot-filled", i_r3 < ctx_r3.pinEntry.length);
  }
}
function IPhoneDeviceComponent_div_0_div_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 34);
    \u0275\u0275element(1, "div", 6);
    \u0275\u0275elementStart(2, "div", 35)(3, "span");
    \u0275\u0275text(4, "9:41");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 36);
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(6, "svg", 37);
    \u0275\u0275element(7, "rect", 11)(8, "rect", 12)(9, "rect", 13)(10, "rect", 14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "svg", 38);
    \u0275\u0275element(12, "path", 16)(13, "path", 17)(14, "path", 18)(15, "circle", 19);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "svg", 39);
    \u0275\u0275element(17, "rect", 21)(18, "rect", 22)(19, "rect", 23);
    \u0275\u0275elementEnd()()();
    \u0275\u0275namespaceHTML();
    \u0275\u0275elementStart(20, "div", 40)(21, "div", 41);
    \u0275\u0275text(22, "9:41");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "div", 42);
    \u0275\u0275text(24, "Tuesday, 24 February");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(25, "div", 43);
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(26, "svg", 44);
    \u0275\u0275element(27, "rect", 45)(28, "path", 46)(29, "circle", 47);
    \u0275\u0275elementEnd();
    \u0275\u0275namespaceHTML();
    \u0275\u0275elementStart(30, "span");
    \u0275\u0275text(31, "Enter Passcode");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(32, "div", 48);
    \u0275\u0275template(33, IPhoneDeviceComponent_div_0_div_3_div_33_Template, 1, 2, "div", 49);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "div", 50)(35, "button", 51);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_3_Template_button_click_35_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.pinPress("1"));
    });
    \u0275\u0275elementStart(36, "span", 52);
    \u0275\u0275text(37, "1");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(38, "button", 51);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_3_Template_button_click_38_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.pinPress("2"));
    });
    \u0275\u0275elementStart(39, "span", 52);
    \u0275\u0275text(40, "2");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(41, "span", 53);
    \u0275\u0275text(42, "ABC");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(43, "button", 51);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_3_Template_button_click_43_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.pinPress("3"));
    });
    \u0275\u0275elementStart(44, "span", 52);
    \u0275\u0275text(45, "3");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(46, "span", 53);
    \u0275\u0275text(47, "DEF");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(48, "button", 51);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_3_Template_button_click_48_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.pinPress("4"));
    });
    \u0275\u0275elementStart(49, "span", 52);
    \u0275\u0275text(50, "4");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(51, "span", 53);
    \u0275\u0275text(52, "GHI");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(53, "button", 51);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_3_Template_button_click_53_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.pinPress("5"));
    });
    \u0275\u0275elementStart(54, "span", 52);
    \u0275\u0275text(55, "5");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(56, "span", 53);
    \u0275\u0275text(57, "JKL");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(58, "button", 51);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_3_Template_button_click_58_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.pinPress("6"));
    });
    \u0275\u0275elementStart(59, "span", 52);
    \u0275\u0275text(60, "6");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(61, "span", 53);
    \u0275\u0275text(62, "MNO");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(63, "button", 51);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_3_Template_button_click_63_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.pinPress("7"));
    });
    \u0275\u0275elementStart(64, "span", 52);
    \u0275\u0275text(65, "7");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(66, "span", 53);
    \u0275\u0275text(67, "PQRS");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(68, "button", 51);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_3_Template_button_click_68_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.pinPress("8"));
    });
    \u0275\u0275elementStart(69, "span", 52);
    \u0275\u0275text(70, "8");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(71, "span", 53);
    \u0275\u0275text(72, "TUV");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(73, "button", 51);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_3_Template_button_click_73_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.pinPress("9"));
    });
    \u0275\u0275elementStart(74, "span", 52);
    \u0275\u0275text(75, "9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(76, "span", 53);
    \u0275\u0275text(77, "WXYZ");
    \u0275\u0275elementEnd()();
    \u0275\u0275element(78, "button", 54);
    \u0275\u0275elementStart(79, "button", 51);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_3_Template_button_click_79_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.pinPress("0"));
    });
    \u0275\u0275elementStart(80, "span", 52);
    \u0275\u0275text(81, "0");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(82, "button", 51);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_3_Template_button_click_82_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.pinBackspace());
    });
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(83, "svg", 55);
    \u0275\u0275element(84, "path", 56)(85, "line", 57);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(32);
    \u0275\u0275classProp("lock-dots-shake", ctx_r3.pinShake);
    \u0275\u0275advance();
    \u0275\u0275property("ngForOf", ctx_r3.passcode.split(""));
  }
}
function IPhoneDeviceComponent_div_0_div_24_span_175_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "span", 104);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_24_span_175_Template_span_click_0_listener() {
      const i_r7 = \u0275\u0275restoreView(_r6).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r3.homePageIndex = i_r7);
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const i_r7 = ctx.$implicit;
    const ctx_r3 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("active", i_r7 === ctx_r3.homePageIndex);
  }
}
function IPhoneDeviceComponent_div_0_div_24_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 59)(1, "div", 60)(2, "div", 61)(3, "div", 62)(4, "div", 63)(5, "div", 64);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_24_Template_div_click_5_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r3 = \u0275\u0275nextContext(2);
      ctx_r3.openApp("messages");
      return \u0275\u0275resetView($event.stopPropagation());
    })("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_5_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_5_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(6, "div", 65);
    \u0275\u0275text(7, "\u{1F4AC}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "span");
    \u0275\u0275text(9, "Messages");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_10_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_10_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(11, "div", 67);
    \u0275\u0275text(12, "\u{1F4C5}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "span");
    \u0275\u0275text(14, "Calendar");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div", 64);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_24_Template_div_click_15_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r3 = \u0275\u0275nextContext(2);
      ctx_r3.openApp("photos");
      return \u0275\u0275resetView($event.stopPropagation());
    })("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_15_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_15_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(16, "div", 68);
    \u0275\u0275text(17, "\u{1F5BC}\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "span");
    \u0275\u0275text(19, "Photos");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(20, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_20_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_20_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(21, "div", 69);
    \u0275\u0275text(22, "\u{1F4F7}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "span");
    \u0275\u0275text(24, "Camera");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(25, "div", 64);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_24_Template_div_click_25_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r3 = \u0275\u0275nextContext(2);
      ctx_r3.openApp("email");
      return \u0275\u0275resetView($event.stopPropagation());
    })("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_25_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_25_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(26, "div", 70);
    \u0275\u0275text(27, "\u{1F4E7}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "span");
    \u0275\u0275text(29, "Mail");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(30, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_30_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_30_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(31, "div", 71);
    \u0275\u0275text(32, "\u23F0");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "span");
    \u0275\u0275text(34, "Clock");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(35, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_35_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_35_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(36, "div", 72);
    \u0275\u0275text(37, "\u{1F5FA}\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(38, "span");
    \u0275\u0275text(39, "Maps");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(40, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_40_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_40_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(41, "div", 73);
    \u0275\u0275text(42, "\u26C5");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(43, "span");
    \u0275\u0275text(44, "Weather");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(45, "div", 64);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_24_Template_div_click_45_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r3 = \u0275\u0275nextContext(2);
      ctx_r3.openApp("notes");
      return \u0275\u0275resetView($event.stopPropagation());
    })("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_45_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_45_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(46, "div", 74);
    \u0275\u0275text(47, "\u{1F4DD}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(48, "span");
    \u0275\u0275text(49, "Notes");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(50, "div", 64);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_24_Template_div_click_50_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r3 = \u0275\u0275nextContext(2);
      ctx_r3.openApp("files");
      return \u0275\u0275resetView($event.stopPropagation());
    })("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_50_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_50_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(51, "div", 75);
    \u0275\u0275text(52, "\u{1F4C1}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(53, "span");
    \u0275\u0275text(54, "Files");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(55, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_55_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_55_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(56, "div", 76);
    \u0275\u0275text(57, "\u2713");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(58, "span");
    \u0275\u0275text(59, "Reminders");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(60, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_60_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_60_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(61, "div", 77);
    \u0275\u0275text(62, "\u{1F4C8}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(63, "span");
    \u0275\u0275text(64, "Stocks");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(65, "div", 62)(66, "div", 63)(67, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_67_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_67_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(68, "div", 78);
    \u0275\u0275text(69, "\u{1F4B3}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(70, "span");
    \u0275\u0275text(71, "Wallet");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(72, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_72_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_72_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(73, "div", 79);
    \u0275\u0275text(74, "\u2699\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(75, "span");
    \u0275\u0275text(76, "Settings");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(77, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_77_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_77_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(78, "div", 80);
    \u0275\u0275text(79, "\u2764\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(80, "span");
    \u0275\u0275text(81, "Health");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(82, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_82_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_82_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(83, "div", 81);
    \u0275\u0275text(84, "\u{1F399}\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(85, "span");
    \u0275\u0275text(86, "Podcasts");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(87, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_87_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_87_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(88, "div", 82);
    \u0275\u0275text(89, "\u{1F4F2}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(90, "span");
    \u0275\u0275text(91, "App Store");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(92, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_92_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_92_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(93, "div", 83);
    \u0275\u0275text(94, "\u{1F4DA}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(95, "span");
    \u0275\u0275text(96, "Books");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(97, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_97_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_97_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(98, "div", 84);
    \u0275\u0275text(99, "\u{1F4FA}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(100, "span");
    \u0275\u0275text(101, "TV");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(102, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_102_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_102_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(103, "div", 85);
    \u0275\u0275text(104, "\u{1F4F0}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(105, "span");
    \u0275\u0275text(106, "News");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(107, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_107_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_107_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(108, "div", 86);
    \u0275\u0275text(109, "\u{1F3B5}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(110, "span");
    \u0275\u0275text(111, "Music");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(112, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_112_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_112_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(113, "div", 87);
    \u0275\u0275text(114, "\u{1F3AC}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(115, "span");
    \u0275\u0275text(116, "Videos");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(117, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_117_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_117_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(118, "div", 88);
    \u0275\u0275text(119, "\u2601\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(120, "span");
    \u0275\u0275text(121, "iCloud");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(122, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_122_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_122_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(123, "div", 89);
    \u0275\u0275text(124, "\u{1F4CD}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(125, "span");
    \u0275\u0275text(126, "Find My");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(127, "div", 62)(128, "div", 63)(129, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_129_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_129_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(130, "div", 90);
    \u0275\u0275text(131, "\u{1F9ED}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(132, "span");
    \u0275\u0275text(133, "Compass");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(134, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_134_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_134_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(135, "div", 91);
    \u0275\u0275text(136, "\u{1F522}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(137, "span");
    \u0275\u0275text(138, "Calculator");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(139, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_139_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_139_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(140, "div", 92);
    \u0275\u0275text(141, "\u{1F3A4}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(142, "span");
    \u0275\u0275text(143, "Voice Memos");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(144, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_144_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_144_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(145, "div", 93);
    \u0275\u0275text(146, "\u{1F526}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(147, "span");
    \u0275\u0275text(148, "Flashlight");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(149, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_149_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_149_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(150, "div", 94);
    \u0275\u0275text(151, "\u{1F4CF}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(152, "span");
    \u0275\u0275text(153, "Measure");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(154, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_154_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_154_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(155, "div", 95);
    \u0275\u0275text(156, "\u26A1");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(157, "span");
    \u0275\u0275text(158, "Shortcuts");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(159, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_159_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_159_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(160, "div", 96);
    \u0275\u0275text(161, "\u{1F4A1}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(162, "span");
    \u0275\u0275text(163, "Tips");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(164, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_164_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_164_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(165, "div", 97);
    \u0275\u0275text(166, "\u{1F3E0}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(167, "span");
    \u0275\u0275text(168, "Home");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(169, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_169_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_169_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(170, "div", 98);
    \u0275\u0275text(171, "\u231A");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(172, "span");
    \u0275\u0275text(173, "Watch");
    \u0275\u0275elementEnd()()()()()();
    \u0275\u0275elementStart(174, "div", 99);
    \u0275\u0275template(175, IPhoneDeviceComponent_div_0_div_24_span_175_Template, 1, 2, "span", 100);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(176, "div", 101)(177, "div", 64);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_24_Template_div_click_177_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r3 = \u0275\u0275nextContext(2);
      ctx_r3.openApp("phone");
      return \u0275\u0275resetView($event.stopPropagation());
    })("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_177_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_177_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(178, "div", 102);
    \u0275\u0275text(179, "\u{1F4DE}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(180, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_180_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_180_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(181, "div", 103);
    \u0275\u0275text(182, "\u{1F9ED}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(183, "div", 64);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_24_Template_div_click_183_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r3 = \u0275\u0275nextContext(2);
      ctx_r3.openApp("messages");
      return \u0275\u0275resetView($event.stopPropagation());
    })("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_183_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_183_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(184, "div", 65);
    \u0275\u0275text(185, "\u{1F4AC}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(186, "div", 66);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_div_24_Template_div_touchstart_186_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mousedown", function IPhoneDeviceComponent_div_0_div_24_Template_div_mousedown_186_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(187, "div", 86);
    \u0275\u0275text(188, "\u{1F3B5}");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("transform", "translateX(calc(-" + ctx_r3.homePageIndex + " * ((100% - 48px) / " + ctx_r3.homePageCount + " + 24px)))");
    \u0275\u0275advance(173);
    \u0275\u0275property("ngForOf", ctx_r3.homePageIndices);
  }
}
function IPhoneDeviceComponent_div_0_div_25_ng_container_7_div_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 119);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const call_r9 = \u0275\u0275nextContext().$implicit;
    const ctx_r3 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r3.getCallDateLabel(call_r9), " ");
  }
}
function IPhoneDeviceComponent_div_0_div_25_ng_container_7_span_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const call_r9 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("\xA0\xB7\xA0", call_r9.time, "");
  }
}
function IPhoneDeviceComponent_div_0_div_25_ng_container_7_span_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const call_r9 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("\xA0\xB7\xA0", call_r9.duration, "");
  }
}
function IPhoneDeviceComponent_div_0_div_25_ng_container_7_button_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 120);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_25_ng_container_7_button_11_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r10);
      const call_r9 = \u0275\u0275nextContext().$implicit;
      const ctx_r3 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r3.initiateCall(call_r9));
    });
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(1, "svg", 121);
    \u0275\u0275element(2, "path", 122);
    \u0275\u0275elementEnd()();
  }
}
function IPhoneDeviceComponent_div_0_div_25_ng_container_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementContainerStart(0);
    \u0275\u0275template(1, IPhoneDeviceComponent_div_0_div_25_ng_container_7_div_1_Template, 2, 1, "div", 111);
    \u0275\u0275elementStart(2, "div", 112)(3, "div", 113)(4, "div", 114);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 115)(7, "span", 116);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275template(9, IPhoneDeviceComponent_div_0_div_25_ng_container_7_span_9_Template, 2, 1, "span", 117)(10, IPhoneDeviceComponent_div_0_div_25_ng_container_7_span_10_Template, 2, 1, "span", 117);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(11, IPhoneDeviceComponent_div_0_div_25_ng_container_7_button_11_Template, 3, 0, "button", 118);
    \u0275\u0275elementEnd();
    \u0275\u0275elementContainerEnd();
  }
  if (rf & 2) {
    const call_r9 = ctx.$implicit;
    const i_r11 = ctx.index;
    const ctx_r3 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", i_r11 === 0 || ctx_r3.getCallDateLabel(call_r9) !== ctx_r3.getCallDateLabel(ctx_r3.sortedCalls[i_r11 - 1]));
    \u0275\u0275advance();
    \u0275\u0275classProp("call-missed", call_r9.type === "Pierdut");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("missed", call_r9.type === "Pierdut" || call_r9.isIncoming && !call_r9.answered);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", call_r9.contact, " ");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("type-missed", call_r9.type === "Pierdut");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(call_r9.type || (call_r9.isIncoming && !call_r9.answered ? "Pierdut" : call_r9.isIncoming ? "Primit" : "Efectuat"));
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", call_r9.time);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", call_r9.duration && call_r9.duration !== "\u2014" && call_r9.duration !== "0 min");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", call_r9.audioUrl);
  }
}
function IPhoneDeviceComponent_div_0_div_25_div_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 123);
    \u0275\u0275text(1, "Nu exist\u0103 apeluri recente.");
    \u0275\u0275elementEnd();
  }
}
function IPhoneDeviceComponent_div_0_div_25_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 105)(1, "div", 106)(2, "button", 107);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_25_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.goHome());
    });
    \u0275\u0275text(3, "\u2039 Back");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "h2");
    \u0275\u0275text(5, "Recents");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 108);
    \u0275\u0275template(7, IPhoneDeviceComponent_div_0_div_25_ng_container_7_Template, 12, 12, "ng-container", 109)(8, IPhoneDeviceComponent_div_0_div_25_div_8_Template, 2, 0, "div", 110);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(7);
    \u0275\u0275property("ngForOf", ctx_r3.sortedCalls);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r3.calls.length === 0);
  }
}
function IPhoneDeviceComponent_div_0_div_26_div_6_div_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 129);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_26_div_6_div_1_Template_div_click_0_listener() {
      const conv_r14 = \u0275\u0275restoreView(_r13).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r3.selectConversation(conv_r14));
    });
    \u0275\u0275elementStart(1, "div", 130);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 131)(4, "div", 132);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 133);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 8);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const conv_r14 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(conv_r14.avatar);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(conv_r14.contact);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(conv_r14.lastMessage);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(conv_r14.time);
  }
}
function IPhoneDeviceComponent_div_0_div_26_div_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 127);
    \u0275\u0275template(1, IPhoneDeviceComponent_div_0_div_26_div_6_div_1_Template, 10, 4, "div", 128);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275property("ngForOf", ctx_r3.conversations);
  }
}
function IPhoneDeviceComponent_div_0_div_26_div_7_div_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div")(1, "div", 139);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 140);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 141);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const msg_r16 = ctx.$implicit;
    const ctx_r3 = \u0275\u0275nextContext(4);
    \u0275\u0275classMap("message-bubble " + (msg_r16.isOutgoing ? "outgoing" : "incoming"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.getMsgSender(msg_r16));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.getMsgContent(msg_r16));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.getMsgTimestamp(msg_r16));
  }
}
function IPhoneDeviceComponent_div_0_div_26_div_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 134)(1, "div", 135);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_26_div_7_Template_div_click_1_listener() {
      \u0275\u0275restoreView(_r15);
      const ctx_r3 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r3.selectedConversation = null);
    });
    \u0275\u0275elementStart(2, "button", 136);
    \u0275\u0275text(3, "\u2039");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 137);
    \u0275\u0275template(7, IPhoneDeviceComponent_div_0_div_26_div_7_div_7_Template, 7, 5, "div", 138);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r3.selectedConversation.contact);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngForOf", ctx_r3.selectedConversation.messages);
  }
}
function IPhoneDeviceComponent_div_0_div_26_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 124)(1, "div", 106)(2, "button", 107);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_26_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.goHome());
    });
    \u0275\u0275text(3, "\u2039 Back");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "h2");
    \u0275\u0275text(5, "Messages");
    \u0275\u0275elementEnd()();
    \u0275\u0275template(6, IPhoneDeviceComponent_div_0_div_26_div_6_Template, 2, 1, "div", 125)(7, IPhoneDeviceComponent_div_0_div_26_div_7_Template, 8, 2, "div", 126);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(6);
    \u0275\u0275property("ngIf", !ctx_r3.selectedConversation);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r3.selectedConversation);
  }
}
function IPhoneDeviceComponent_div_0_div_27_div_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r18 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 145);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_27_div_7_Template_div_click_0_listener() {
      const photo_r19 = \u0275\u0275restoreView(_r18).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r3.selectPhoto(photo_r19));
    });
    \u0275\u0275element(1, "img", 146);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const photo_r19 = ctx.$implicit;
    const ctx_r3 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275property("src", ctx_r3.getPhotoDisplayUrl(photo_r19), \u0275\u0275sanitizeUrl)("alt", photo_r19.caption);
  }
}
function IPhoneDeviceComponent_div_0_div_27_Template(rf, ctx) {
  if (rf & 1) {
    const _r17 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 142)(1, "div", 106)(2, "button", 107);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_27_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r17);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.goHome());
    });
    \u0275\u0275text(3, "\u2039 Back");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "h2");
    \u0275\u0275text(5, "Photos");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 143);
    \u0275\u0275template(7, IPhoneDeviceComponent_div_0_div_27_div_7_Template, 2, 2, "div", 144);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(7);
    \u0275\u0275property("ngForOf", ctx_r3.photos);
  }
}
function IPhoneDeviceComponent_div_0_div_28_Template(rf, ctx) {
  if (rf & 1) {
    const _r20 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 147)(1, "button", 148);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_28_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.selectPhoto(null));
    });
    \u0275\u0275text(2, "\u2715");
    \u0275\u0275elementEnd();
    \u0275\u0275element(3, "img", 146);
    \u0275\u0275elementStart(4, "div", 149);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275property("src", ctx_r3.getPhotoDisplayUrl(ctx_r3.selectedPhoto), \u0275\u0275sanitizeUrl)("alt", ctx_r3.selectedPhoto.caption);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.selectedPhoto.caption);
  }
}
function IPhoneDeviceComponent_div_0_div_29_div_6_div_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r22 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 157);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_29_div_6_div_1_Template_div_click_0_listener() {
      const email_r23 = \u0275\u0275restoreView(_r22).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r3.selectEmail(email_r23));
    });
    \u0275\u0275elementStart(1, "div", 158)(2, "span", 159);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 160);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 161);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 162);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const email_r23 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(email_r23.from);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(email_r23.time);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(email_r23.subject);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(email_r23.preview);
  }
}
function IPhoneDeviceComponent_div_0_div_29_div_6_div_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 163);
    \u0275\u0275text(1, "Nu exist\u0103 emailuri.");
    \u0275\u0275elementEnd();
  }
}
function IPhoneDeviceComponent_div_0_div_29_div_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 154);
    \u0275\u0275template(1, IPhoneDeviceComponent_div_0_div_29_div_6_div_1_Template, 10, 4, "div", 155)(2, IPhoneDeviceComponent_div_0_div_29_div_6_div_2_Template, 2, 0, "div", 156);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275property("ngForOf", ctx_r3.emailsForFolder);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r3.emailsForFolder.length === 0);
  }
}
function IPhoneDeviceComponent_div_0_div_29_div_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 164)(1, "div", 165);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 166)(4, "span", 167);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 168);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 169);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.selectedEmail.subject);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate2("", ctx_r3.emailFolder === "sent" ? "C\u0103tre" : "De la", ": ", ctx_r3.selectedEmail.from, "");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.selectedEmail.time);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.selectedEmail.body || ctx_r3.selectedEmail.preview);
  }
}
function IPhoneDeviceComponent_div_0_div_29_div_8_Template(rf, ctx) {
  if (rf & 1) {
    const _r24 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 170)(1, "button", 171);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_29_div_8_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r24);
      const ctx_r3 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r3.setEmailFolder("inbox"));
    });
    \u0275\u0275text(2, "Inbox");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 171);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_29_div_8_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r24);
      const ctx_r3 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r3.setEmailFolder("sent"));
    });
    \u0275\u0275text(4, "Trimise");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 171);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_29_div_8_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r24);
      const ctx_r3 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r3.setEmailFolder("drafts"));
    });
    \u0275\u0275text(6, "Ciorne");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275classProp("active", ctx_r3.emailFolder === "inbox");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", ctx_r3.emailFolder === "sent");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", ctx_r3.emailFolder === "drafts");
  }
}
function IPhoneDeviceComponent_div_0_div_29_Template(rf, ctx) {
  if (rf & 1) {
    const _r21 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 150)(1, "div", 106)(2, "button", 107);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_29_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r21);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.selectedEmail ? ctx_r3.selectEmail(null) : ctx_r3.goHome());
    });
    \u0275\u0275text(3, "\u2039 Back");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "h2");
    \u0275\u0275text(5, "Mail");
    \u0275\u0275elementEnd()();
    \u0275\u0275template(6, IPhoneDeviceComponent_div_0_div_29_div_6_Template, 3, 2, "div", 151)(7, IPhoneDeviceComponent_div_0_div_29_div_7_Template, 10, 5, "div", 152)(8, IPhoneDeviceComponent_div_0_div_29_div_8_Template, 7, 6, "div", 153);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(6);
    \u0275\u0275property("ngIf", !ctx_r3.selectedEmail);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r3.selectedEmail);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", !ctx_r3.selectedEmail);
  }
}
function IPhoneDeviceComponent_div_0_div_30_div_6_div_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r26 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 177);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_30_div_6_div_1_Template_div_click_0_listener() {
      const note_r27 = \u0275\u0275restoreView(_r26).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r3.selectNote(note_r27));
    });
    \u0275\u0275elementStart(1, "div", 178);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 179);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 180);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const note_r27 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(note_r27.title);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(note_r27.content);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(note_r27.time);
  }
}
function IPhoneDeviceComponent_div_0_div_30_div_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 175);
    \u0275\u0275template(1, IPhoneDeviceComponent_div_0_div_30_div_6_div_1_Template, 7, 3, "div", 176);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275property("ngForOf", ctx_r3.notes);
  }
}
function IPhoneDeviceComponent_div_0_div_30_div_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 181)(1, "div", 182);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 183);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 184);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.selectedNote.title);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.selectedNote.time);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.selectedNote.content);
  }
}
function IPhoneDeviceComponent_div_0_div_30_Template(rf, ctx) {
  if (rf & 1) {
    const _r25 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 172)(1, "div", 106)(2, "button", 107);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_30_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r25);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.selectedNote ? ctx_r3.selectNote(null) : ctx_r3.goHome());
    });
    \u0275\u0275text(3, "\u2039 Back");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "h2");
    \u0275\u0275text(5, "Notes");
    \u0275\u0275elementEnd()();
    \u0275\u0275template(6, IPhoneDeviceComponent_div_0_div_30_div_6_Template, 2, 1, "div", 173)(7, IPhoneDeviceComponent_div_0_div_30_div_7_Template, 7, 3, "div", 174);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(6);
    \u0275\u0275property("ngIf", !ctx_r3.selectedNote);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r3.selectedNote);
  }
}
function IPhoneDeviceComponent_div_0_div_31_div_6_div_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r29 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 191);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_31_div_6_div_1_Template_div_click_0_listener() {
      const file_r30 = \u0275\u0275restoreView(_r29).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r3.selectFile(file_r30));
    });
    \u0275\u0275elementStart(1, "div", 192);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 193)(4, "div", 194);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 195);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "span", 196);
    \u0275\u0275text(9, "\u203A");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const file_r30 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(file_r30.type === "Encrypted" ? "\u{1F512}" : file_r30.type === "Screenshot" ? "\u{1F5BC}\uFE0F" : file_r30.type === "Folder" ? "\u{1F4C1}" : "\u{1F4C4}");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(file_r30.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(file_r30.type);
  }
}
function IPhoneDeviceComponent_div_0_div_31_div_6_div_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 197);
    \u0275\u0275text(1, "Niciun fi\u0219ier.");
    \u0275\u0275elementEnd();
  }
}
function IPhoneDeviceComponent_div_0_div_31_div_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 188);
    \u0275\u0275template(1, IPhoneDeviceComponent_div_0_div_31_div_6_div_1_Template, 10, 3, "div", 189)(2, IPhoneDeviceComponent_div_0_div_31_div_6_div_2_Template, 2, 0, "div", 190);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275property("ngForOf", ctx_r3.files);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r3.files.length === 0);
  }
}
function IPhoneDeviceComponent_div_0_div_31_div_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 198)(1, "div", 199);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 200);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 201);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 202);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.selectedFile.type === "Encrypted" ? "\u{1F512}" : ctx_r3.selectedFile.type === "Screenshot" ? "\u{1F5BC}\uFE0F" : ctx_r3.selectedFile.type === "Folder" ? "\u{1F4C1}" : "\u{1F4C4}");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.selectedFile.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.selectedFile.type);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.selectedFile.description);
  }
}
function IPhoneDeviceComponent_div_0_div_31_Template(rf, ctx) {
  if (rf & 1) {
    const _r28 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 185)(1, "div", 106)(2, "button", 107);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_31_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r28);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.selectedFile ? ctx_r3.selectFile(null) : ctx_r3.goHome());
    });
    \u0275\u0275text(3, "\u2039 Back");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "h2");
    \u0275\u0275text(5, "Files");
    \u0275\u0275elementEnd()();
    \u0275\u0275template(6, IPhoneDeviceComponent_div_0_div_31_div_6_Template, 3, 2, "div", 186)(7, IPhoneDeviceComponent_div_0_div_31_div_7_Template, 9, 4, "div", 187);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(6);
    \u0275\u0275property("ngIf", !ctx_r3.selectedFile);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r3.selectedFile);
  }
}
function IPhoneDeviceComponent_div_0_div_32_Template(rf, ctx) {
  if (rf & 1) {
    const _r31 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 203);
    \u0275\u0275element(1, "div", 204);
    \u0275\u0275elementStart(2, "div", 205)(3, "div", 206);
    \u0275\u0275text(4, "\u{1F464}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "h2", 207);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 208);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 209)(10, "div", 210)(11, "span", 211);
    \u0275\u0275text(12, "\u{1F507}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "span");
    \u0275\u0275text(14, "mut");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div", 210)(16, "span", 211);
    \u0275\u0275text(17, "\u{1F522}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "span");
    \u0275\u0275text(19, "tastatur\u0103");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(20, "div", 210)(21, "span", 211);
    \u0275\u0275text(22, "\u{1F50A}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "span");
    \u0275\u0275text(24, "difuzor");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(25, "div", 210)(26, "span", 211);
    \u0275\u0275text(27, "\u2795");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "span");
    \u0275\u0275text(29, "adaug\u0103 apel");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(30, "div", 210)(31, "span", 211);
    \u0275\u0275text(32, "\u23FA\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "span");
    \u0275\u0275text(34, "Video FaceTime");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(35, "div", 210)(36, "span", 211);
    \u0275\u0275text(37, "\u{1F464}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(38, "span");
    \u0275\u0275text(39, "contacte");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(40, "button", 212);
    \u0275\u0275listener("click", function IPhoneDeviceComponent_div_0_div_32_Template_button_click_40_listener() {
      \u0275\u0275restoreView(_r31);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.endCall());
    });
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(41, "svg", 213);
    \u0275\u0275element(42, "path", 214)(43, "path", 215)(44, "path", 216);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(ctx_r3.activeCall.contact);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.callDuration);
  }
}
function IPhoneDeviceComponent_div_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 2)(1, "div", 3)(2, "div", 4);
    \u0275\u0275template(3, IPhoneDeviceComponent_div_0_div_3_Template, 86, 3, "div", 5);
    \u0275\u0275element(4, "div", 6);
    \u0275\u0275elementStart(5, "div", 7)(6, "span", 8);
    \u0275\u0275text(7, "9:41");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 9);
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(9, "svg", 10);
    \u0275\u0275element(10, "rect", 11)(11, "rect", 12)(12, "rect", 13)(13, "rect", 14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "svg", 15);
    \u0275\u0275element(15, "path", 16)(16, "path", 17)(17, "path", 18)(18, "circle", 19);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "svg", 20);
    \u0275\u0275element(20, "rect", 21)(21, "rect", 22)(22, "rect", 23);
    \u0275\u0275elementEnd()()();
    \u0275\u0275namespaceHTML();
    \u0275\u0275elementStart(23, "div", 24);
    \u0275\u0275listener("touchstart", function IPhoneDeviceComponent_div_0_Template_div_touchstart_23_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.onTouchStart($event));
    })("touchmove", function IPhoneDeviceComponent_div_0_Template_div_touchmove_23_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.onTouchMove($event));
    })("touchend", function IPhoneDeviceComponent_div_0_Template_div_touchend_23_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.onTouchEnd($event));
    })("mousedown", function IPhoneDeviceComponent_div_0_Template_div_mousedown_23_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.onMouseDown($event));
    })("mousemove", function IPhoneDeviceComponent_div_0_Template_div_mousemove_23_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.onMouseMove($event));
    })("mouseup", function IPhoneDeviceComponent_div_0_Template_div_mouseup_23_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.onMouseUp($event));
    });
    \u0275\u0275template(24, IPhoneDeviceComponent_div_0_div_24_Template, 189, 3, "div", 25)(25, IPhoneDeviceComponent_div_0_div_25_Template, 9, 2, "div", 26)(26, IPhoneDeviceComponent_div_0_div_26_Template, 8, 2, "div", 27)(27, IPhoneDeviceComponent_div_0_div_27_Template, 8, 1, "div", 28)(28, IPhoneDeviceComponent_div_0_div_28_Template, 6, 3, "div", 29)(29, IPhoneDeviceComponent_div_0_div_29_Template, 9, 3, "div", 30)(30, IPhoneDeviceComponent_div_0_div_30_Template, 8, 2, "div", 31)(31, IPhoneDeviceComponent_div_0_div_31_Template, 8, 2, "div", 32)(32, IPhoneDeviceComponent_div_0_div_32_Template, 45, 2, "div", 33);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275property("ngIf", ctx_r3.isLocked);
    \u0275\u0275advance(21);
    \u0275\u0275property("ngIf", ctx_r3.currentScreen === "home");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r3.currentScreen === "phone");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r3.currentScreen === "messages");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r3.currentScreen === "photos");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r3.selectedPhoto);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r3.currentScreen === "email");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r3.currentScreen === "notes");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r3.currentScreen === "files");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r3.activeCall);
  }
}
function IPhoneDeviceComponent_div_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 217);
    \u0275\u0275element(1, "div", 218);
    \u0275\u0275elementStart(2, "p");
    \u0275\u0275text(3, "Loading device...");
    \u0275\u0275elementEnd()();
  }
}
var IPhoneDeviceComponent = class _IPhoneDeviceComponent extends BaseDeviceComponent {
  route;
  deviceService;
  location;
  constructor(route, deviceService, location2) {
    super(route, deviceService, location2);
    this.route = route;
    this.deviceService = deviceService;
    this.location = location2;
  }
  static \u0275fac = function IPhoneDeviceComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _IPhoneDeviceComponent)(\u0275\u0275directiveInject(ActivatedRoute), \u0275\u0275directiveInject(DeviceService), \u0275\u0275directiveInject(Location));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _IPhoneDeviceComponent, selectors: [["app-iphone-device"]], standalone: true, features: [\u0275\u0275InheritDefinitionFeature, \u0275\u0275StandaloneFeature], decls: 2, vars: 2, consts: [["class", "iphone-container", 4, "ngIf"], ["class", "loading-container", 4, "ngIf"], [1, "iphone-container"], [1, "iphone-frame-shell"], [1, "iphone-frame"], ["class", "lock-screen", 4, "ngIf"], [1, "iphone-notch"], [1, "status-bar"], [1, "time"], [1, "status-icons"], ["width", "16", "height", "12", "viewBox", "0 0 16 12", "fill", "white", "opacity", "0.95"], ["x", "0", "y", "8", "width", "3", "height", "4", "rx", "0.5"], ["x", "4", "y", "5", "width", "3", "height", "7", "rx", "0.5"], ["x", "8", "y", "2", "width", "3", "height", "10", "rx", "0.5"], ["x", "12", "y", "0", "width", "3", "height", "12", "rx", "0.5"], ["width", "15", "height", "12", "viewBox", "0 0 15 12", "fill", "none", "stroke", "white", "stroke-width", "1.4", "stroke-linecap", "round", "opacity", "0.95"], ["d", "M1 4.5 C3.5 1.5 11.5 1.5 14 4.5"], ["d", "M3 7 C4.5 5 10.5 5 12 7"], ["d", "M5.5 9.5 C6.2 8.5 8.8 8.5 9.5 9.5"], ["cx", "7.5", "cy", "11.5", "r", "0.8", "fill", "white", "stroke", "none"], ["width", "25", "height", "12", "viewBox", "0 0 25 12", "fill", "none", "opacity", "0.95"], ["x", "0.5", "y", "0.5", "width", "21", "height", "11", "rx", "3", "stroke", "white", "stroke-width", "1"], ["x", "22", "y", "3.5", "width", "2", "height", "5", "rx", "1", "fill", "white", "opacity", "0.4"], ["x", "2", "y", "2", "width", "16", "height", "8", "rx", "1.5", "fill", "white"], [1, "screen-content", 3, "touchstart", "touchmove", "touchend", "mousedown", "mousemove", "mouseup"], ["class", "home-screen", 4, "ngIf"], ["class", "phone-app", 4, "ngIf"], ["class", "messages-app", 4, "ngIf"], ["class", "photos-app", 4, "ngIf"], ["class", "photo-fullscreen", 4, "ngIf"], ["class", "email-app", 4, "ngIf"], ["class", "notes-app", 4, "ngIf"], ["class", "files-app", 4, "ngIf"], ["class", "active-call-overlay", 4, "ngIf"], [1, "lock-screen"], [1, "lock-status-bar"], [1, "lock-status-icons"], ["width", "14", "height", "10", "viewBox", "0 0 16 12", "fill", "white", "opacity", "0.85"], ["width", "14", "height", "10", "viewBox", "0 0 15 12", "fill", "none", "stroke", "white", "stroke-width", "1.4", "stroke-linecap", "round", "opacity", "0.85"], ["width", "22", "height", "11", "viewBox", "0 0 25 12", "fill", "none", "opacity", "0.85"], [1, "lock-clock-area"], [1, "lock-time-big"], [1, "lock-date"], [1, "lock-icon-row"], ["width", "18", "height", "22", "viewBox", "0 0 24 28", "fill", "none"], ["x", "3", "y", "12", "width", "18", "height", "14", "rx", "3", "fill", "rgba(255,255,255,0.85)"], ["d", "M7 12V8a5 5 0 0 1 10 0v4", "stroke", "rgba(255,255,255,0.85)", "stroke-width", "2.5", "stroke-linecap", "round", "fill", "none"], ["cx", "12", "cy", "19", "r", "2", "fill", "rgba(0,0,0,0.4)"], [1, "lock-dots"], ["class", "lock-dot", 3, "lock-dot-filled", 4, "ngFor", "ngForOf"], [1, "lock-keypad"], [1, "lock-key", 3, "click"], [1, "lk-n"], [1, "lk-s"], [1, "lock-key", "lock-key-ghost"], ["width", "20", "height", "14", "viewBox", "0 0 22 16", "fill", "none"], ["d", "M8.5 1.5L1.5 8l7 7", "stroke", "white", "stroke-width", "1.8", "stroke-linecap", "round", "stroke-linejoin", "round"], ["x1", "2", "y1", "8", "x2", "21", "y2", "8", "stroke", "white", "stroke-width", "1.8", "stroke-linecap", "round"], [1, "lock-dot"], [1, "home-screen"], [1, "home-pages-wrapper"], [1, "home-pages"], [1, "home-page"], [1, "app-grid"], [1, "app-icon", 3, "click", "touchstart", "mousedown"], [1, "icon", "messages-ios"], [1, "app-icon", 3, "touchstart", "mousedown"], [1, "icon", "calendar-ios"], [1, "icon", "photos-ios"], [1, "icon", "camera-ios"], [1, "icon", "mail-ios"], [1, "icon", "clock-ios"], [1, "icon", "maps-ios"], [1, "icon", "weather-ios"], [1, "icon", "notes-ios"], [1, "icon", "files-ios"], [1, "icon", "reminders-ios"], [1, "icon", "stocks-ios"], [1, "icon", "wallet-ios"], [1, "icon", "settings-ios"], [1, "icon", "health-ios"], [1, "icon", "podcasts-ios"], [1, "icon", "appstore-ios"], [1, "icon", "books-ios"], [1, "icon", "tv-ios"], [1, "icon", "news-ios"], [1, "icon", "music-ios"], [1, "icon", "videos-ios"], [1, "icon", "icloud-ios"], [1, "icon", "findmy-ios"], [1, "icon", "compass-ios"], [1, "icon", "calculator-ios"], [1, "icon", "voice-ios"], [1, "icon", "flashlight-ios"], [1, "icon", "measure-ios"], [1, "icon", "shortcuts-ios"], [1, "icon", "tips-ios"], [1, "icon", "home-ios"], [1, "icon", "watch-ios"], [1, "home-page-dots"], ["class", "dot", 3, "active", "click", 4, "ngFor", "ngForOf"], [1, "ios-dock"], [1, "icon", "phone-ios"], [1, "icon", "safari-ios"], [1, "dot", 3, "click"], [1, "phone-app"], [1, "app-header"], [1, "back-btn", 3, "click"], [1, "calls-list-scroll"], [4, "ngFor", "ngForOf"], ["class", "calls-empty", 4, "ngIf"], ["class", "call-date-separator", 4, "ngIf"], [1, "call-item"], [1, "call-item-info"], [1, "call-item-contact"], [1, "call-item-meta"], [1, "call-item-type"], [4, "ngIf"], ["class", "call-audio-btn", "title", "Red\u0103 \xEEnregistrarea", 3, "click", 4, "ngIf"], [1, "call-date-separator"], ["title", "Red\u0103 \xEEnregistrarea", 1, "call-audio-btn", 3, "click"], ["viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-width", "2", "stroke-linecap", "round", "stroke-linejoin", "round"], ["d", "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.25h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z"], [1, "calls-empty"], [1, "messages-app"], ["class", "conversations-list", 4, "ngIf"], ["class", "conversation-view", 4, "ngIf"], [1, "conversations-list"], ["class", "conversation-item", 3, "click", 4, "ngFor", "ngForOf"], [1, "conversation-item", 3, "click"], [1, "avatar"], [1, "conversation-info"], [1, "contact-name"], [1, "last-message"], [1, "conversation-view"], [1, "conversation-header", 3, "click"], [1, "back-btn"], [1, "messages-container"], [3, "class", 4, "ngFor", "ngForOf"], [1, "message-sender"], [1, "message-content"], [1, "message-time"], [1, "photos-app"], [1, "photos-grid"], ["class", "photo-item", 3, "click", 4, "ngFor", "ngForOf"], [1, "photo-item", 3, "click"], [3, "src", "alt"], [1, "photo-fullscreen"], [1, "photo-close-btn", 3, "click"], [1, "photo-full-caption"], [1, "email-app"], ["class", "email-list", 4, "ngIf"], ["class", "email-detail-view", 4, "ngIf"], ["class", "email-tab-bar", 4, "ngIf"], [1, "email-list"], ["class", "email-item", 3, "click", 4, "ngFor", "ngForOf"], ["class", "email-empty", 4, "ngIf"], [1, "email-item", 3, "click"], [1, "email-item-row"], [1, "email-item-from"], [1, "email-item-time"], [1, "email-item-subject"], [1, "email-item-preview"], [1, "email-empty"], [1, "email-detail-view"], [1, "email-detail-subject"], [1, "email-detail-meta"], [1, "email-detail-from"], [1, "email-detail-time"], [1, "email-detail-body"], [1, "email-tab-bar"], [1, "email-tab-btn", 3, "click"], [1, "notes-app"], ["class", "notes-list", 4, "ngIf"], ["class", "note-detail-view", 4, "ngIf"], [1, "notes-list"], ["class", "note-item", 3, "click", 4, "ngFor", "ngForOf"], [1, "note-item", 3, "click"], [1, "note-item-title"], [1, "note-item-preview"], [1, "note-item-time"], [1, "note-detail-view"], [1, "note-detail-title"], [1, "note-detail-time"], [1, "note-detail-body"], [1, "files-app"], ["class", "files-list", 4, "ngIf"], ["class", "file-detail-view", 4, "ngIf"], [1, "files-list"], ["class", "file-item", 3, "click", 4, "ngFor", "ngForOf"], ["class", "files-empty", 4, "ngIf"], [1, "file-item", 3, "click"], [1, "file-item-icon"], [1, "file-item-info"], [1, "file-item-name"], [1, "file-item-type"], [1, "file-item-chevron"], [1, "files-empty"], [1, "file-detail-view"], [1, "file-detail-icon"], [1, "file-detail-name"], [1, "file-detail-type"], [1, "file-detail-description"], [1, "active-call-overlay"], [1, "call-backdrop"], [1, "call-content"], [1, "call-avatar"], [1, "call-contact"], [1, "call-status"], [1, "call-controls"], [1, "control-btn"], [1, "icon"], [1, "end-call-btn", 3, "click"], ["width", "24", "height", "24", "viewBox", "0 0 24 24", "fill", "none", "stroke", "white", "stroke-width", "2", "stroke-linecap", "round", "stroke-linejoin", "round"], ["d", "M16.69 11.23A9 9 0 0 0 7.31 11.23"], ["d", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"], ["d", "M9 14h6"], [1, "loading-container"], [1, "loader"]], template: function IPhoneDeviceComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275template(0, IPhoneDeviceComponent_div_0_Template, 33, 10, "div", 0)(1, IPhoneDeviceComponent_div_1_Template, 4, 0, "div", 1);
    }
    if (rf & 2) {
      \u0275\u0275property("ngIf", !ctx.loading);
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", ctx.loading);
    }
  }, dependencies: [CommonModule, NgForOf, NgIf], styles: ['\n\n.loading-container[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  color: white;\n}\n.loader[_ngcontent-%COMP%] {\n  border: 4px solid rgba(255, 255, 255, 0.3);\n  border-top: 4px solid white;\n  border-radius: 50%;\n  width: 40px;\n  height: 40px;\n  animation: _ngcontent-%COMP%_spin 1s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  0% {\n    transform: rotate(0deg);\n  }\n  100% {\n    transform: rotate(360deg);\n  }\n}\n.iphone-container[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100svh;\n  width: 100vw;\n  background:\n    radial-gradient(\n      ellipse at 30% 20%,\n      rgba(50, 50, 70, 0.9) 0%,\n      transparent 60%),\n    radial-gradient(\n      ellipse at 75% 80%,\n      rgba(30, 30, 50, 0.95) 0%,\n      transparent 60%),\n    linear-gradient(\n      160deg,\n      #0d0d14 0%,\n      #16161f 40%,\n      #1b1018 100%);\n  padding: 8px;\n  box-sizing: border-box;\n  overflow: hidden;\n  position: fixed;\n  top: 0;\n  left: 0;\n}\n.iphone-frame-shell[_ngcontent-%COMP%] {\n  position: relative;\n  width: 310px;\n  height: 637px;\n  filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.7)) drop-shadow(0 8px 20px rgba(0, 0, 0, 0.5));\n}\n@media (max-height: 680px) {\n  .iphone-frame-shell[_ngcontent-%COMP%] {\n    transform: scale(0.88);\n    transform-origin: center center;\n    margin-top: -38px;\n    margin-bottom: -38px;\n  }\n}\n@media (max-height: 620px) {\n  .iphone-frame-shell[_ngcontent-%COMP%] {\n    transform: scale(0.78);\n    transform-origin: center center;\n    margin-top: -70px;\n    margin-bottom: -70px;\n  }\n}\n@media (max-height: 560px) {\n  .iphone-frame-shell[_ngcontent-%COMP%] {\n    transform: scale(0.68);\n    transform-origin: center center;\n    margin-top: -102px;\n    margin-bottom: -102px;\n  }\n}\n.iphone-frame-shell[_ngcontent-%COMP%]::before {\n  content: "";\n  position: absolute;\n  left: -3px;\n  top: 120px;\n  width: 3px;\n  background:\n    linear-gradient(\n      180deg,\n      #3a3a3c 0px,\n      #3a3a3c 30px,\n      transparent 30px,\n      transparent 44px,\n      #3a3a3c 44px,\n      #3a3a3c 98px,\n      transparent 98px,\n      transparent 114px,\n      #3a3a3c 114px,\n      #3a3a3c 168px);\n  height: 180px;\n  border-radius: 2px 0 0 2px;\n}\n.iphone-frame-shell[_ngcontent-%COMP%]::after {\n  content: "";\n  position: absolute;\n  right: -3px;\n  top: 168px;\n  width: 3px;\n  height: 74px;\n  background: #3a3a3c;\n  border-radius: 0 2px 2px 0;\n}\n.iphone-frame[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 100%;\n  background: #1c1c1e;\n  border-radius: 47px;\n  overflow: hidden;\n  position: relative;\n  box-sizing: border-box;\n  border: 9px solid #2a2a2c;\n  box-shadow:\n    0 0 0 1px rgba(255, 255, 255, 0.06),\n    inset 0 2px 1px rgba(255, 255, 255, 0.15),\n    inset 0 -2px 1px rgba(0, 0, 0, 0.4);\n}\n.iphone-frame[_ngcontent-%COMP%]::after {\n  content: "";\n  position: absolute;\n  inset: 0;\n  border-radius: 38px;\n  background:\n    linear-gradient(\n      135deg,\n      rgba(255, 255, 255, 0.07) 0%,\n      rgba(255, 255, 255, 0.02) 30%,\n      transparent 60%);\n  pointer-events: none;\n  z-index: 100;\n}\n.iphone-notch[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 11px;\n  left: 50%;\n  transform: translateX(-50%);\n  width: 95px;\n  height: 30px;\n  background: #000;\n  border-radius: 20px;\n  z-index: 20;\n}\n.iphone-notch[_ngcontent-%COMP%]::before {\n  content: "";\n  position: absolute;\n  right: 11px;\n  top: 50%;\n  transform: translateY(-50%);\n  width: 9px;\n  height: 9px;\n  border-radius: 50%;\n  background: #1a1a1e;\n  box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.08);\n}\n.status-bar[_ngcontent-%COMP%] {\n  height: 52px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 0 22px 0 22px;\n  padding-top: 6px;\n  color: #fff;\n  font-size: 13px;\n  font-weight: 600;\n  position: relative;\n  z-index: 10;\n  background: transparent;\n}\n.status-bar[_ngcontent-%COMP%]   .time[_ngcontent-%COMP%] {\n  font-family:\n    -apple-system,\n    "SF Pro Text",\n    sans-serif;\n  font-size: 15px;\n  font-weight: 600;\n  letter-spacing: -0.3px;\n}\n.status-icons[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 5px;\n  font-size: 12px;\n}\n.screen-content[_ngcontent-%COMP%] {\n  background: #f5f5f7;\n  height: calc(100% - 52px);\n  overflow: hidden;\n  box-sizing: border-box;\n  position: relative;\n  -ms-overflow-style: none;\n  scrollbar-width: none;\n}\n.screen-content[_ngcontent-%COMP%]::-webkit-scrollbar {\n  display: none;\n}\n.home-screen[_ngcontent-%COMP%] {\n  padding: 16px 12px 12px;\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n  box-sizing: border-box;\n  background:\n    radial-gradient(\n      ellipse at 20% 15%,\n      rgba(60, 40, 120, 0.95) 0%,\n      transparent 50%),\n    radial-gradient(\n      ellipse at 80% 10%,\n      rgba(30, 80, 160, 0.9) 0%,\n      transparent 45%),\n    radial-gradient(\n      ellipse at 50% 60%,\n      rgba(10, 50, 110, 0.85) 0%,\n      transparent 55%),\n    radial-gradient(\n      ellipse at 75% 85%,\n      rgba(80, 20, 100, 0.8) 0%,\n      transparent 45%),\n    linear-gradient(\n      180deg,\n      #0a0a23 0%,\n      #0d1235 40%,\n      #08091e 100%);\n  background-size: cover;\n  position: relative;\n  overflow: hidden;\n}\n.home-pages-wrapper[_ngcontent-%COMP%] {\n  flex: 1;\n  overflow: clip;\n  position: relative;\n  z-index: 1;\n  min-width: 0;\n  width: 100%;\n}\n.home-pages[_ngcontent-%COMP%] {\n  display: flex;\n  height: 100%;\n  width: calc(300% + 48px);\n  gap: 24px;\n  transition: transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94);\n  will-change: transform;\n}\n.home-page[_ngcontent-%COMP%] {\n  flex: 0 0 calc((100% - 48px) / 3);\n  width: calc((100% - 48px) / 3);\n  height: 100%;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  box-sizing: border-box;\n  min-width: 0;\n}\n.home-page-dots[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n  gap: 5px;\n  padding: 6px 0 4px;\n  flex-shrink: 0;\n  position: relative;\n  z-index: 2;\n}\n.home-page-dots[_ngcontent-%COMP%]   .dot[_ngcontent-%COMP%] {\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  background: rgba(255, 255, 255, 0.35);\n  cursor: pointer;\n  transition: background 0.2s, transform 0.2s;\n}\n.home-page-dots[_ngcontent-%COMP%]   .dot.active[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.92);\n  transform: scale(1.2);\n}\n.app-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(4, 1fr);\n  gap: 12px 8px;\n  padding: 4px 10px;\n  flex: 1;\n  min-height: 0;\n  position: relative;\n  z-index: 1;\n  align-content: start;\n}\n.app-icon[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: flex-start;\n  cursor: pointer;\n  transition: transform 0.15s;\n  min-height: 0;\n  gap: 4px;\n}\n.app-icon[_ngcontent-%COMP%]:active {\n  transform: scale(0.88);\n}\n.app-icon[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  font-size: 9.5px;\n  color: rgba(255, 255, 255, 0.92);\n  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);\n  text-align: center;\n  font-weight: 400;\n  line-height: 1.1;\n  font-family:\n    -apple-system,\n    "SF Pro Text",\n    sans-serif;\n}\n.icon[_ngcontent-%COMP%] {\n  width: 52px;\n  height: 52px;\n  border-radius: 13px;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 26px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35), 0 0 0 0.5px rgba(255, 255, 255, 0.08) inset;\n  position: relative;\n}\n.icon[_ngcontent-%COMP%]::after {\n  content: "";\n  position: absolute;\n  top: 1px;\n  left: 2px;\n  right: 2px;\n  height: 40%;\n  border-radius: 12px 12px 6px 6px;\n  background:\n    linear-gradient(\n      180deg,\n      rgba(255, 255, 255, 0.18) 0%,\n      transparent 100%);\n  pointer-events: none;\n}\n.messages-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #5dde4b 0%,\n      #34c759 100%);\n}\n.calendar-ios[_ngcontent-%COMP%] {\n  background: #fff;\n  color: #e5372b !important;\n}\n.calendar-ios[_ngcontent-%COMP%]::before {\n  content: "";\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  height: 35%;\n  border-radius: 13px 13px 0 0;\n  background: #e5372b;\n}\n.photos-ios[_ngcontent-%COMP%] {\n  background:\n    conic-gradient(\n      #f14336 0deg 60deg,\n      #fb8c00 60deg 120deg,\n      #fdd835 120deg 180deg,\n      #4caf50 180deg 240deg,\n      #2196f3 240deg 300deg,\n      #9c27b0 300deg 360deg);\n}\n.camera-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #555 0%,\n      #1c1c1e 100%);\n}\n.mail-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #1a8fff 0%,\n      #007aff 100%);\n}\n.clock-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #222 0%,\n      #000 100%);\n}\n.maps-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #6bcb6b 0%,\n      #35b94a 100%);\n}\n.weather-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #5bb8fb 0%,\n      #4aa3f0 100%);\n}\n.reminders-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #ff5e57 0%,\n      #ff3b30 100%);\n}\n.notes-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #ffd553 0%,\n      #ffcc00 100%);\n}\n.stocks-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #222 0%,\n      #000 100%);\n}\n.wallet-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #222 0%,\n      #000 100%);\n}\n.settings-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #9b9b9b 0%,\n      #6d6d72 100%);\n}\n.health-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #ff5e7e 0%,\n      #ff2d55 100%);\n}\n.podcasts-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #c576f1 0%,\n      #af52de 100%);\n}\n.appstore-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #2693ff 0%,\n      #007aff 100%);\n}\n.phone-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #54d86a 0%,\n      #34c759 100%);\n}\n.safari-ios[_ngcontent-%COMP%] {\n  background:\n    radial-gradient(\n      circle,\n      #2ec4f8 0%,\n      #0a84ff 60%,\n      #0062cc 100%);\n}\n.music-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #fc3158 0%,\n      #ff375f 100%);\n}\n.files-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #2693ff 0%,\n      #007aff 100%);\n}\n.books-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #ff6b3d 0%,\n      #ff3a1a 100%);\n}\n.tv-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #222 0%,\n      #000 100%);\n}\n.news-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #ff3a3a 0%,\n      #d70015 100%);\n}\n.videos-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #222 0%,\n      #000 100%);\n}\n.watch-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #111 0%,\n      #000 100%);\n}\n.home-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #f97316 0%,\n      #ea580c 100%);\n}\n.compass-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #111 0%,\n      #000 100%);\n}\n.flashlight-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #333 0%,\n      #000 100%);\n}\n.calculator-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #2a2a2a 0%,\n      #1c1c1e 100%);\n}\n.measure-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #3478f6 0%,\n      #0057d8 100%);\n}\n.shortcuts-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #f7453b 0%,\n      #ff2d43 100%);\n}\n.findmy-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #5ce65c 0%,\n      #30d158 100%);\n}\n.tips-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #ffe057 0%,\n      #ffcc00 100%);\n}\n.icloud-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #3e8eff 0%,\n      #007aff 100%);\n}\n.ibooks-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #ff6b3d 0%,\n      #ff3a1a 100%);\n}\n.gamecenter-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #5de85d 0%,\n      #34c759 100%);\n}\n.voice-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #222 0%,\n      #000 100%);\n}\n.voicememos-ios[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      145deg,\n      #222 0%,\n      #000 100%);\n}\n.ios-dock[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-evenly;\n  align-items: center;\n  gap: 4px;\n  padding: 10px 18px 14px;\n  margin: 0 8px 16px;\n  flex-shrink: 0;\n  min-height: 56px;\n  box-sizing: border-box;\n  background: rgba(255, 255, 255, 0.18);\n  backdrop-filter: blur(28px) saturate(180%);\n  -webkit-backdrop-filter: blur(28px) saturate(180%);\n  border-radius: 26px;\n  border: 0.5px solid rgba(255, 255, 255, 0.22);\n  position: relative;\n  z-index: 2;\n}\n.ios-dock[_ngcontent-%COMP%]   .app-icon[_ngcontent-%COMP%] {\n  flex: 1;\n  max-width: 60px;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}\n.ios-dock[_ngcontent-%COMP%]   .icon[_ngcontent-%COMP%] {\n  width: 52px;\n  height: 52px;\n  font-size: 26px;\n  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);\n}\n.app-header[_ngcontent-%COMP%] {\n  background: #f8f8f8;\n  padding: 12px;\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  border-bottom: 1px solid #e0e0e0;\n}\n.app-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 17px;\n  font-weight: 600;\n}\n.back-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: #007aff;\n  font-size: 18px;\n  cursor: pointer;\n  padding: 5px 10px;\n}\n.phone-app[_ngcontent-%COMP%] {\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n.calls-list-scroll[_ngcontent-%COMP%] {\n  flex: 1;\n  min-height: 0;\n  overflow-y: auto;\n  background: #fff;\n}\n.call-date-separator[_ngcontent-%COMP%] {\n  padding: 6px 16px 4px;\n  font-size: 12px;\n  font-weight: 500;\n  color: #8e8e93;\n  background: #f2f2f7;\n  border-bottom: 0.5px solid #d1d1d6;\n  letter-spacing: 0.01em;\n}\n.call-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  padding: 12px 16px;\n  gap: 0;\n  border-bottom: 0.5px solid #e5e5ea;\n  background: #fff;\n  min-height: 56px;\n}\n.call-item[_ngcontent-%COMP%]:active {\n  background: #f2f2f7;\n}\n.call-item.call-missed[_ngcontent-%COMP%]   .call-item-contact[_ngcontent-%COMP%] {\n  color: #ff3b30;\n}\n.call-item-info[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n}\n.call-item-contact[_ngcontent-%COMP%] {\n  font-size: 16px;\n  font-weight: 400;\n  color: #000;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  margin-bottom: 2px;\n  font-family:\n    -apple-system,\n    "SF Pro Text",\n    sans-serif;\n}\n.call-item-contact.missed[_ngcontent-%COMP%] {\n  color: #ff3b30;\n}\n.call-item-meta[_ngcontent-%COMP%] {\n  font-size: 13px;\n  color: #8e8e93;\n  line-height: 1.3;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.call-item-meta[_ngcontent-%COMP%]   .type-missed[_ngcontent-%COMP%] {\n  color: #ff3b30;\n}\n.call-audio-btn[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  width: 36px;\n  height: 36px;\n  border-radius: 50%;\n  background: rgba(255, 59, 48, 0.12);\n  border: none;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  transition: background 0.15s, transform 0.12s;\n  margin-left: 12px;\n}\n.call-audio-btn[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  width: 18px;\n  height: 18px;\n  color: #ff3b30;\n}\n.call-audio-btn[_ngcontent-%COMP%]:active {\n  background: rgba(255, 59, 48, 0.25);\n  transform: scale(0.92);\n}\n.calls-empty[_ngcontent-%COMP%] {\n  padding: 24px;\n  text-align: center;\n  color: #8e8e93;\n  font-size: 15px;\n}\n.messages-app[_ngcontent-%COMP%] {\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n.conversation-view[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  min-height: 0;\n}\n.conversation-header[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  padding: 12px;\n  border-bottom: 1px solid #e0e0e0;\n}\n.conversations-list[_ngcontent-%COMP%], \n.notes-list[_ngcontent-%COMP%], \n.email-list[_ngcontent-%COMP%] {\n  flex: 1;\n  min-height: 0;\n  background: #fff;\n  overflow-y: auto;\n}\n.conversation-item[_ngcontent-%COMP%], \n.note-item[_ngcontent-%COMP%], \n.email-item[_ngcontent-%COMP%] {\n  padding: 12px 16px;\n  border-bottom: 1px solid #e0e0e0;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  cursor: pointer;\n}\n.conversation-item[_ngcontent-%COMP%]:active, \n.note-item[_ngcontent-%COMP%]:active, \n.email-item[_ngcontent-%COMP%]:active {\n  background: #f0f0f0;\n}\n.conversation-item[_ngcontent-%COMP%] {\n  flex-direction: row;\n  gap: 12px;\n}\n.avatar[_ngcontent-%COMP%] {\n  width: 50px;\n  height: 50px;\n  border-radius: 50%;\n  background: #007aff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 24px;\n  flex-shrink: 0;\n}\n.conversation-info[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.contact-name[_ngcontent-%COMP%], \n.note-title[_ngcontent-%COMP%] {\n  font-weight: 600;\n  margin-bottom: 4px;\n}\n.last-message[_ngcontent-%COMP%] {\n  color: #666;\n  font-size: 14px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.email-app[_ngcontent-%COMP%] {\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n.email-list[_ngcontent-%COMP%] {\n  flex: 1;\n  min-height: 0;\n}\n.email-item[_ngcontent-%COMP%] {\n  padding: 12px 16px;\n  border-bottom: 1px solid #e5e5e7;\n  cursor: pointer;\n}\n.email-item[_ngcontent-%COMP%]:active {\n  background: #f2f2f7;\n}\n.email-item-row[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 4px;\n}\n.email-item-from[_ngcontent-%COMP%] {\n  font-size: 15px;\n  font-weight: 600;\n  color: #000;\n}\n.email-item-time[_ngcontent-%COMP%] {\n  font-size: 13px;\n  color: #8e8e93;\n}\n.email-item-subject[_ngcontent-%COMP%] {\n  font-size: 15px;\n  font-weight: 500;\n  color: #000;\n  margin-bottom: 2px;\n}\n.email-item-preview[_ngcontent-%COMP%] {\n  font-size: 14px;\n  color: #8e8e93;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.email-detail-view[_ngcontent-%COMP%] {\n  flex: 1;\n  min-height: 0;\n  overflow-y: auto;\n  background: #fff;\n  padding: 16px;\n}\n.email-detail-subject[_ngcontent-%COMP%] {\n  font-size: 18px;\n  font-weight: 600;\n  color: #000;\n  margin-bottom: 12px;\n  line-height: 1.3;\n}\n.email-detail-meta[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 12px 0;\n  border-bottom: 1px solid #e5e5e7;\n  margin-bottom: 16px;\n}\n.email-detail-from[_ngcontent-%COMP%] {\n  font-size: 14px;\n  color: #007aff;\n}\n.email-detail-time[_ngcontent-%COMP%] {\n  font-size: 13px;\n  color: #8e8e93;\n}\n.email-detail-body[_ngcontent-%COMP%] {\n  font-size: 15px;\n  line-height: 1.6;\n  color: #1c1c1e;\n  white-space: pre-wrap;\n}\n.email-empty[_ngcontent-%COMP%] {\n  padding: 24px;\n  text-align: center;\n  color: #8e8e93;\n  font-size: 15px;\n}\n.email-tab-bar[_ngcontent-%COMP%] {\n  display: flex;\n  flex-shrink: 0;\n  border-top: 1px solid #e5e5e7;\n  background: #f9f9f9;\n  padding: 8px 0;\n}\n.email-tab-btn[_ngcontent-%COMP%] {\n  flex: 1;\n  background: none;\n  border: none;\n  font-size: 14px;\n  font-weight: 500;\n  color: #8e8e93;\n  padding: 10px;\n  cursor: pointer;\n}\n.email-tab-btn.active[_ngcontent-%COMP%] {\n  color: #007aff;\n  font-weight: 600;\n}\n.email-tab-btn[_ngcontent-%COMP%]:active {\n  opacity: 0.7;\n}\n.notes-app[_ngcontent-%COMP%] {\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n.notes-list[_ngcontent-%COMP%] {\n  flex: 1;\n  min-height: 0;\n}\n.note-item[_ngcontent-%COMP%] {\n  padding: 12px 16px;\n  border-bottom: 1px solid #e5e5e7;\n  cursor: pointer;\n}\n.note-item[_ngcontent-%COMP%]:active {\n  background: #f2f2f7;\n}\n.note-item-title[_ngcontent-%COMP%] {\n  font-size: 16px;\n  font-weight: 600;\n  color: #000;\n  margin-bottom: 4px;\n}\n.note-item-preview[_ngcontent-%COMP%] {\n  font-size: 14px;\n  color: #8e8e93;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.note-item-time[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: #8e8e93;\n  margin-top: 4px;\n}\n.note-detail-view[_ngcontent-%COMP%] {\n  flex: 1;\n  min-height: 0;\n  overflow-y: auto;\n  background: #fff9e6;\n  padding: 16px;\n}\n.note-detail-title[_ngcontent-%COMP%] {\n  font-size: 20px;\n  font-weight: 700;\n  color: #1c1c1e;\n  margin-bottom: 8px;\n}\n.note-detail-time[_ngcontent-%COMP%] {\n  font-size: 13px;\n  color: #8e8e93;\n  margin-bottom: 16px;\n}\n.note-detail-body[_ngcontent-%COMP%] {\n  font-size: 16px;\n  line-height: 1.5;\n  color: #1c1c1e;\n  white-space: pre-wrap;\n}\n.files-app[_ngcontent-%COMP%] {\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n.files-list[_ngcontent-%COMP%] {\n  flex: 1;\n  min-height: 0;\n  overflow-y: auto;\n  background: #f2f2f7;\n}\n.file-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  padding: 12px 16px;\n  background: #fff;\n  border-bottom: 1px solid #e5e5e7;\n  cursor: pointer;\n  gap: 12px;\n}\n.file-item[_ngcontent-%COMP%]:active {\n  background: #f2f2f7;\n}\n.file-item-icon[_ngcontent-%COMP%] {\n  width: 44px;\n  height: 44px;\n  border-radius: 10px;\n  background: #e5e5ea;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 24px;\n  flex-shrink: 0;\n}\n.file-item-info[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n}\n.file-item-name[_ngcontent-%COMP%] {\n  font-size: 16px;\n  font-weight: 500;\n  color: #000;\n}\n.file-item-type[_ngcontent-%COMP%] {\n  font-size: 13px;\n  color: #8e8e93;\n}\n.file-item-chevron[_ngcontent-%COMP%] {\n  font-size: 18px;\n  color: #c7c7cc;\n}\n.files-empty[_ngcontent-%COMP%] {\n  padding: 24px;\n  text-align: center;\n  color: #8e8e93;\n  font-size: 15px;\n}\n.file-detail-view[_ngcontent-%COMP%] {\n  flex: 1;\n  min-height: 0;\n  overflow-y: auto;\n  background: #f2f2f7;\n  padding: 24px;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n}\n.file-detail-icon[_ngcontent-%COMP%] {\n  width: 80px;\n  height: 80px;\n  border-radius: 18px;\n  background: #fff;\n  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 40px;\n  margin-bottom: 16px;\n}\n.file-detail-name[_ngcontent-%COMP%] {\n  font-size: 18px;\n  font-weight: 600;\n  color: #000;\n  text-align: center;\n  margin-bottom: 4px;\n}\n.file-detail-type[_ngcontent-%COMP%] {\n  font-size: 14px;\n  color: #8e8e93;\n  margin-bottom: 16px;\n}\n.file-detail-description[_ngcontent-%COMP%] {\n  font-size: 15px;\n  line-height: 1.5;\n  color: #1c1c1e;\n  text-align: center;\n  white-space: pre-wrap;\n  width: 100%;\n  padding: 16px;\n  background: #fff;\n  border-radius: 12px;\n}\n.messages-container[_ngcontent-%COMP%] {\n  flex: 1;\n  min-height: 0;\n  padding: 20px;\n  background: #fff;\n  overflow-y: auto;\n  overflow-x: hidden;\n  display: flex;\n  flex-direction: column;\n}\n.message-bubble[_ngcontent-%COMP%] {\n  margin-bottom: 15px;\n  max-width: 75%;\n  padding: 10px 15px;\n  border-radius: 18px;\n}\n.message-bubble.incoming[_ngcontent-%COMP%] {\n  background: #e5e5ea;\n  color: #000;\n  align-self: flex-start;\n  margin-right: auto;\n}\n.message-bubble.outgoing[_ngcontent-%COMP%] {\n  background: #007aff;\n  color: #fff;\n  align-self: flex-end;\n  margin-left: auto;\n}\n.message-sender[_ngcontent-%COMP%] {\n  font-size: 12px;\n  font-weight: 600;\n  margin-bottom: 2px;\n}\n.message-bubble.outgoing[_ngcontent-%COMP%]   .message-sender[_ngcontent-%COMP%] {\n  text-align: right;\n}\n.message-content[_ngcontent-%COMP%] {\n  margin: 5px 0;\n}\n.message-time[_ngcontent-%COMP%] {\n  font-size: 11px;\n  opacity: 0.85;\n  margin-top: 3px;\n}\n.message-bubble.outgoing[_ngcontent-%COMP%]   .message-time[_ngcontent-%COMP%] {\n  text-align: right;\n}\n.photos-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 2px;\n  padding: 2px;\n}\n.photo-item[_ngcontent-%COMP%] {\n  aspect-ratio: 1;\n  background: #f0f0f0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  overflow: hidden;\n  position: relative;\n}\n.photo-item[_ngcontent-%COMP%]   img[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n.photo-caption[_ngcontent-%COMP%] {\n  position: absolute;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  background: rgba(0, 0, 0, 0.7);\n  color: #fff;\n  padding: 5px;\n  font-size: 11px;\n}\n.photo-upload-hint[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.78);\n  color: #fff;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  align-items: center;\n  justify-content: center;\n  text-align: center;\n  padding: 8px;\n  z-index: 4;\n}\n.photo-upload-title[_ngcontent-%COMP%] {\n  font-size: 11px;\n  font-weight: 700;\n}\n.photo-upload-meta[_ngcontent-%COMP%] {\n  font-size: 10px;\n  opacity: 0.92;\n}\n.photo-upload-btn[_ngcontent-%COMP%] {\n  margin-top: 4px;\n  padding: 4px 8px;\n  background: #007aff;\n  border-radius: 8px;\n  font-size: 10px;\n  cursor: pointer;\n}\n.photo-upload-btn[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  display: none;\n}\n.photo-fullscreen[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  z-index: 90;\n  background: #000;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n}\n.photo-fullscreen[_ngcontent-%COMP%]   img[_ngcontent-%COMP%] {\n  max-width: 100%;\n  max-height: calc(100% - 56px);\n  object-fit: contain;\n}\n.photo-close-btn[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 12px;\n  right: 12px;\n  width: 30px;\n  height: 30px;\n  border: none;\n  border-radius: 50%;\n  background: rgba(255, 255, 255, 0.2);\n  color: #fff;\n  font-size: 16px;\n  cursor: pointer;\n}\n.photo-full-caption[_ngcontent-%COMP%] {\n  color: #fff;\n  font-size: 12px;\n  padding: 8px 12px 12px;\n  text-align: center;\n}\n.lock-screen[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  z-index: 50;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  background:\n    radial-gradient(\n      ellipse at 30% 20%,\n      rgba(20, 80, 120, 0.92) 0%,\n      transparent 55%),\n    radial-gradient(\n      ellipse at 70% 70%,\n      rgba(10, 50, 90, 0.88) 0%,\n      transparent 55%),\n    radial-gradient(\n      ellipse at 50% 50%,\n      rgba(30, 60, 100, 0.8) 0%,\n      transparent 60%),\n    linear-gradient(\n      180deg,\n      #1a3a5c 0%,\n      #0d2540 40%,\n      #162038 100%);\n  font-family:\n    -apple-system,\n    "SF Pro Display",\n    "Helvetica Neue",\n    sans-serif;\n  overflow: hidden;\n  padding-bottom: 12px;\n}\n.lock-status-bar[_ngcontent-%COMP%] {\n  width: 100%;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 14px 22px 6px;\n  color: white;\n  font-size: 13px;\n  font-weight: 600;\n  flex-shrink: 0;\n}\n.lock-status-icons[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 5px;\n}\n.lock-clock-area[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 16px 0 10px;\n}\n.lock-time-big[_ngcontent-%COMP%] {\n  font-size: 42px;\n  font-weight: 200;\n  color: #ffffff;\n  letter-spacing: -1px;\n  line-height: 1;\n  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.4);\n}\n.lock-date[_ngcontent-%COMP%] {\n  font-size: 13px;\n  color: rgba(255, 255, 255, 0.85);\n  margin-top: 4px;\n  font-weight: 400;\n  letter-spacing: 0.1px;\n}\n.lock-icon-row[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 8px;\n  padding: 10px 0 6px;\n  flex-shrink: 0;\n}\n.lock-icon-row[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  font-size: 15px;\n  font-weight: 600;\n  color: #ffffff;\n  letter-spacing: 0.2px;\n  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);\n}\n.lock-dots[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 16px;\n  padding: 12px 0 14px;\n  flex-shrink: 0;\n}\n.lock-dot[_ngcontent-%COMP%] {\n  width: 12px;\n  height: 12px;\n  border-radius: 50%;\n  border: 1.5px solid rgba(255, 255, 255, 0.75);\n  background: transparent;\n  transition: background 0.15s ease, border-color 0.15s ease;\n}\n.lock-dot.lock-dot-filled[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.92);\n  border-color: rgba(255, 255, 255, 0.92);\n}\n@keyframes _ngcontent-%COMP%_shake {\n  0%, 100% {\n    transform: translateX(0);\n  }\n  12% {\n    transform: translateX(-8px);\n  }\n  25% {\n    transform: translateX(8px);\n  }\n  37% {\n    transform: translateX(-6px);\n  }\n  50% {\n    transform: translateX(6px);\n  }\n  62% {\n    transform: translateX(-4px);\n  }\n  75% {\n    transform: translateX(4px);\n  }\n  87% {\n    transform: translateX(-2px);\n  }\n}\n.lock-dots-shake[_ngcontent-%COMP%] {\n  animation: _ngcontent-%COMP%_shake 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;\n}\n.lock-keypad[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 10px 12px;\n  padding: 4px 20px 0;\n  flex: 1;\n  align-content: center;\n  width: 100%;\n  box-sizing: border-box;\n}\n.lock-key[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  width: 64px;\n  height: 64px;\n  border-radius: 50%;\n  justify-self: center;\n  background: rgba(255, 255, 255, 0.08);\n  border: 1.5px solid rgba(100, 200, 230, 0.7);\n  box-shadow:\n    0 0 0 0.5px rgba(255, 255, 255, 0.06),\n    inset 0 1px 0 rgba(255, 255, 255, 0.12),\n    0 2px 12px rgba(0, 0, 0, 0.25);\n  cursor: pointer;\n  transition:\n    background 0.12s ease,\n    box-shadow 0.12s ease,\n    transform 0.08s ease;\n  -webkit-tap-highlight-color: transparent;\n  outline: none;\n  background-image:\n    linear-gradient(\n      180deg,\n      rgba(255, 255, 255, 0.12) 0%,\n      rgba(255, 255, 255, 0.04) 100%);\n  gap: 1px;\n}\n.lock-key[_ngcontent-%COMP%]:active {\n  background: rgba(80, 160, 210, 0.4);\n  box-shadow:\n    0 0 0 0.5px rgba(255, 255, 255, 0.1),\n    inset 0 1px 0 rgba(255, 255, 255, 0.18),\n    0 2px 16px rgba(40, 120, 200, 0.4);\n  transform: scale(0.94);\n}\n.lock-key.lock-key-ghost[_ngcontent-%COMP%] {\n  background: transparent;\n  border: none;\n  box-shadow: none;\n  pointer-events: none;\n}\n.lk-n[_ngcontent-%COMP%] {\n  font-size: 26px;\n  font-weight: 300;\n  color: #ffffff;\n  line-height: 1;\n  letter-spacing: -0.5px;\n  font-family:\n    -apple-system,\n    "SF Pro Display",\n    "Helvetica Neue",\n    sans-serif;\n}\n.lk-s[_ngcontent-%COMP%] {\n  font-size: 8px;\n  font-weight: 500;\n  color: rgba(255, 255, 255, 0.8);\n  letter-spacing: 1.5px;\n  text-transform: uppercase;\n  line-height: 1;\n  font-family:\n    -apple-system,\n    "SF Pro Text",\n    sans-serif;\n}\n.active-call-overlay[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  z-index: 100;\n  display: flex;\n  flex-direction: column;\n  color: white;\n  font-family:\n    -apple-system,\n    "SF Pro Display",\n    sans-serif;\n  overflow: hidden;\n}\n.call-backdrop[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  background:\n    linear-gradient(\n      180deg,\n      #1a1a2e 0%,\n      #16213e 100%);\n  backdrop-filter: blur(20px);\n  z-index: -1;\n}\n.call-content[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 60px 20px 40px;\n}\n.call-avatar[_ngcontent-%COMP%] {\n  width: 80px;\n  height: 80px;\n  border-radius: 50%;\n  background: rgba(255, 255, 255, 0.1);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 40px;\n  margin-bottom: 16px;\n  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);\n}\n.call-contact[_ngcontent-%COMP%] {\n  font-size: 28px;\n  font-weight: 400;\n  margin-bottom: 8px;\n  letter-spacing: 0.5px;\n  text-align: center;\n}\n.call-status[_ngcontent-%COMP%] {\n  font-size: 16px;\n  color: rgba(255, 255, 255, 0.7);\n  margin-bottom: auto;\n}\n.call-controls[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 20px 30px;\n  width: 100%;\n  padding: 0 10px;\n  margin-bottom: 40px;\n}\n.control-btn[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 8px;\n}\n.control-btn[_ngcontent-%COMP%]   .icon[_ngcontent-%COMP%] {\n  width: 60px;\n  height: 60px;\n  border-radius: 50%;\n  background: rgba(255, 255, 255, 0.15);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 24px;\n  transition: background 0.2s;\n}\n.control-btn[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]:last-child {\n  font-size: 12px;\n  color: rgba(255, 255, 255, 0.8);\n}\n.end-call-btn[_ngcontent-%COMP%] {\n  width: 70px;\n  height: 70px;\n  border-radius: 50%;\n  background: #ff3b30;\n  border: none;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  box-shadow: 0 4px 15px rgba(255, 59, 48, 0.4);\n  transition: transform 0.1s, background 0.2s;\n}\n.end-call-btn[_ngcontent-%COMP%]:active {\n  transform: scale(0.95);\n  background: #d63026;\n}\n.call-btn[_ngcontent-%COMP%] {\n  width: 36px;\n  height: 36px;\n  border-radius: 50%;\n  background: #e4f2e8;\n  color: #34c759;\n  border: none;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 16px;\n  cursor: pointer;\n  transition: background 0.2s;\n}\n.call-btn[_ngcontent-%COMP%]:hover {\n  background: #d1ebd8;\n}\n.call-btn[_ngcontent-%COMP%]:active {\n  background: #bce3c6;\n}\n/*# sourceMappingURL=iphone-device.component.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(IPhoneDeviceComponent, { className: "IPhoneDeviceComponent", filePath: "src\\app\\components\\devices\\iphone\\iphone-device.component.ts", lineNumber: 14 });
})();

// src/app/components/devices/android/android-device.component.ts
function AndroidDeviceComponent_div_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 2);
    \u0275\u0275element(1, "div", 3);
    \u0275\u0275elementStart(2, "p");
    \u0275\u0275text(3, "Loading device...");
    \u0275\u0275elementEnd()();
  }
}
function AndroidDeviceComponent_div_1_div_17_span_181_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "span", 48);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_17_span_181_Template_span_click_0_listener() {
      const i_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.homePageIndex = i_r5);
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const i_r5 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("active", i_r5 === ctx_r1.homePageIndex);
  }
}
function AndroidDeviceComponent_div_1_div_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 18)(1, "div", 19)(2, "span", 20);
    \u0275\u0275text(3, "\u{1F50D}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 21);
    \u0275\u0275text(5, "Search");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 22);
    \u0275\u0275text(7, "\u{1F4F7}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "span", 23);
    \u0275\u0275text(9, "\u{1F3A4}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "div", 24)(11, "div", 25)(12, "div", 26)(13, "div", 27)(14, "div", 28);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_17_Template_div_click_14_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openApp("messages"));
    });
    \u0275\u0275elementStart(15, "div", 29)(16, "span");
    \u0275\u0275text(17, "\u{1F4AC}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(18, "span");
    \u0275\u0275text(19, "Messages");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(20, "div", 28);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_17_Template_div_click_20_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openApp("photos"));
    });
    \u0275\u0275elementStart(21, "div", 30)(22, "span");
    \u0275\u0275text(23, "\u{1F5BC}\uFE0F");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(24, "span");
    \u0275\u0275text(25, "Gallery");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(26, "div", 28);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_17_Template_div_click_26_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openApp("email"));
    });
    \u0275\u0275elementStart(27, "div", 31)(28, "span");
    \u0275\u0275text(29, "\u{1F4E7}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(30, "span");
    \u0275\u0275text(31, "Gmail");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(32, "div", 28);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_17_Template_div_click_32_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openApp("notes"));
    });
    \u0275\u0275elementStart(33, "div", 32)(34, "span");
    \u0275\u0275text(35, "\u{1F4DD}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(36, "span");
    \u0275\u0275text(37, "Notes");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(38, "div", 28);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_17_Template_div_click_38_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openApp("files"));
    });
    \u0275\u0275elementStart(39, "div", 32)(40, "span");
    \u0275\u0275text(41, "\u{1F4C1}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(42, "span");
    \u0275\u0275text(43, "Files");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(44, "div", 28);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_17_Template_div_click_44_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openApp("phone"));
    });
    \u0275\u0275elementStart(45, "div", 33)(46, "span");
    \u0275\u0275text(47, "\u{1F4DE}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(48, "span");
    \u0275\u0275text(49, "Phone");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(50, "div", 34)(51, "div", 35)(52, "span");
    \u0275\u0275text(53, "\u{1F464}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(54, "span");
    \u0275\u0275text(55, "Contacts");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(56, "div", 34)(57, "div", 36)(58, "span");
    \u0275\u0275text(59, "\u{1F4F8}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(60, "span");
    \u0275\u0275text(61, "Camera");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(62, "div", 34)(63, "div", 37)(64, "span");
    \u0275\u0275text(65, "\u{1F310}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(66, "span");
    \u0275\u0275text(67, "Chrome");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(68, "div", 26)(69, "div", 27)(70, "div", 34)(71, "div", 38)(72, "span");
    \u0275\u0275text(73, "\u2699\uFE0F");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(74, "span");
    \u0275\u0275text(75, "Settings");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(76, "div", 34)(77, "div", 30)(78, "span");
    \u0275\u0275text(79, "\u{1F4C5}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(80, "span");
    \u0275\u0275text(81, "Calendar");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(82, "div", 34)(83, "div", 31)(84, "span");
    \u0275\u0275text(85, "\u23F0");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(86, "span");
    \u0275\u0275text(87, "Clock");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(88, "div", 34)(89, "div", 32)(90, "span");
    \u0275\u0275text(91, "\u{1F5FA}\uFE0F");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(92, "span");
    \u0275\u0275text(93, "Maps");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(94, "div", 34)(95, "div", 33)(96, "span");
    \u0275\u0275text(97, "\u26C5");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(98, "span");
    \u0275\u0275text(99, "Weather");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(100, "div", 34)(101, "div", 35)(102, "span");
    \u0275\u0275text(103, "\u{1F6D2}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(104, "span");
    \u0275\u0275text(105, "Play Store");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(106, "div", 34)(107, "div", 36)(108, "span");
    \u0275\u0275text(109, "\u{1F3B5}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(110, "span");
    \u0275\u0275text(111, "YouTube Music");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(112, "div", 34)(113, "div", 29)(114, "span");
    \u0275\u0275text(115, "\u{1F4FA}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(116, "span");
    \u0275\u0275text(117, "YouTube");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(118, "div", 34)(119, "div", 38)(120, "span");
    \u0275\u0275text(121, "\u{1F4E7}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(122, "span");
    \u0275\u0275text(123, "Drive");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(124, "div", 26)(125, "div", 27)(126, "div", 34)(127, "div", 30)(128, "span");
    \u0275\u0275text(129, "\u{1F4F7}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(130, "span");
    \u0275\u0275text(131, "Photos");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(132, "div", 34)(133, "div", 31)(134, "span");
    \u0275\u0275text(135, "\u{1F4C1}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(136, "span");
    \u0275\u0275text(137, "Files");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(138, "div", 34)(139, "div", 32)(140, "span");
    \u0275\u0275text(141, "\u{1F3AE}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(142, "span");
    \u0275\u0275text(143, "Play Games");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(144, "div", 34)(145, "div", 33)(146, "span");
    \u0275\u0275text(147, "\u{1F4DE}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(148, "span");
    \u0275\u0275text(149, "Duo");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(150, "div", 34)(151, "div", 35)(152, "span");
    \u0275\u0275text(153, "\u{1F4B3}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(154, "span");
    \u0275\u0275text(155, "Wallet");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(156, "div", 34)(157, "div", 36)(158, "span");
    \u0275\u0275text(159, "\u{1F4F0}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(160, "span");
    \u0275\u0275text(161, "News");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(162, "div", 34)(163, "div", 38)(164, "span");
    \u0275\u0275text(165, "\u{1F526}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(166, "span");
    \u0275\u0275text(167, "Flashlight");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(168, "div", 34)(169, "div", 37)(170, "span");
    \u0275\u0275text(171, "\u{1F9EE}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(172, "span");
    \u0275\u0275text(173, "Calculator");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(174, "div", 34)(175, "div", 30)(176, "span");
    \u0275\u0275text(177, "\u{1F4D6}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(178, "span");
    \u0275\u0275text(179, "Books");
    \u0275\u0275elementEnd()()()()()();
    \u0275\u0275elementStart(180, "div", 39);
    \u0275\u0275template(181, AndroidDeviceComponent_div_1_div_17_span_181_Template, 1, 2, "span", 40);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(182, "div", 41)(183, "div", 42)(184, "div", 43);
    \u0275\u0275text(185, "\u{1F310}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(186, "div", 44);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_17_Template_div_click_186_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openApp("messages"));
    });
    \u0275\u0275elementStart(187, "div", 45);
    \u0275\u0275text(188, "\u{1F4AC}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(189, "div", 44);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_17_Template_div_click_189_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openApp("phone"));
    });
    \u0275\u0275elementStart(190, "div", 46);
    \u0275\u0275text(191, "\u{1F4DE}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(192, "div", 42)(193, "div", 47);
    \u0275\u0275text(194, "\u229E");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(11);
    \u0275\u0275styleProp("transform", "translateX(-" + ctx_r1.homePageIndex * 100 + "%)");
    \u0275\u0275advance(170);
    \u0275\u0275property("ngForOf", ctx_r1.homePageIndices);
  }
}
function AndroidDeviceComponent_div_1_div_18_div_9_div_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 58);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_18_div_9_div_1_Template_div_click_0_listener() {
      const conv_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r1.selectConversation(conv_r8));
    });
    \u0275\u0275elementStart(1, "div", 59);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 60)(4, "div", 61)(5, "strong");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 62);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 63);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const conv_r8 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(conv_r8.avatar);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(conv_r8.contact);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(conv_r8.time);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(conv_r8.lastMessage);
  }
}
function AndroidDeviceComponent_div_1_div_18_div_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 56);
    \u0275\u0275template(1, AndroidDeviceComponent_div_1_div_18_div_9_div_1_Template, 11, 4, "div", 57);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275property("ngForOf", ctx_r1.conversations);
  }
}
function AndroidDeviceComponent_div_1_div_18_div_10_div_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div")(1, "div", 67)(2, "div", 68);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 69);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const msg_r9 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(4);
    \u0275\u0275classMap(msg_r9.isOutgoing ? "samsung-msg-sent" : "samsung-msg-received");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.getMsgContent(msg_r9));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.getMsgTimestamp(msg_r9));
  }
}
function AndroidDeviceComponent_div_1_div_18_div_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 64)(1, "div", 65);
    \u0275\u0275template(2, AndroidDeviceComponent_div_1_div_18_div_10_div_2_Template, 6, 4, "div", 66);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngForOf", ctx_r1.selectedConversation.messages);
  }
}
function AndroidDeviceComponent_div_1_div_18_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 49)(1, "div", 50)(2, "button", 51);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_18_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.goHome());
    });
    \u0275\u0275text(3, "\u2190");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "h2");
    \u0275\u0275text(5, "Messages");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 52);
    \u0275\u0275text(7, "\u22EE");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 53);
    \u0275\u0275template(9, AndroidDeviceComponent_div_1_div_18_div_9_Template, 2, 1, "div", 54)(10, AndroidDeviceComponent_div_1_div_18_div_10_Template, 3, 1, "div", 55);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(9);
    \u0275\u0275property("ngIf", !ctx_r1.selectedConversation);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r1.selectedConversation);
  }
}
function AndroidDeviceComponent_div_1_div_19_div_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 72);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_19_div_9_Template_div_click_0_listener() {
      const photo_r12 = \u0275\u0275restoreView(_r11).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.selectPhoto(photo_r12));
    });
    \u0275\u0275element(1, "img", 73);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const photo_r12 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275property("src", ctx_r1.getPhotoDisplayUrl(photo_r12), \u0275\u0275sanitizeUrl)("alt", photo_r12.caption);
  }
}
function AndroidDeviceComponent_div_1_div_19_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 49)(1, "div", 50)(2, "button", 51);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_19_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.goHome());
    });
    \u0275\u0275text(3, "\u2190");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "h2");
    \u0275\u0275text(5, "Gallery");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 52);
    \u0275\u0275text(7, "\u22EE");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 70);
    \u0275\u0275template(9, AndroidDeviceComponent_div_1_div_19_div_9_Template, 2, 2, "div", 71);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(9);
    \u0275\u0275property("ngForOf", ctx_r1.photos);
  }
}
function AndroidDeviceComponent_div_1_div_20_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 74)(1, "button", 75);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_20_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectPhoto(null));
    });
    \u0275\u0275text(2, "\u2715");
    \u0275\u0275elementEnd();
    \u0275\u0275element(3, "img", 76);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275property("src", ctx_r1.getPhotoDisplayUrl(ctx_r1.selectedPhoto), \u0275\u0275sanitizeUrl)("alt", ctx_r1.selectedPhoto.caption);
  }
}
function AndroidDeviceComponent_div_1_div_21_div_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 79)(1, "div", 80);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 81);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 82);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 83);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const email_r15 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(email_r15.from);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(email_r15.subject);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(email_r15.preview);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(email_r15.time);
  }
}
function AndroidDeviceComponent_div_1_div_21_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 49)(1, "div", 50)(2, "button", 51);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_21_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.goHome());
    });
    \u0275\u0275text(3, "\u2190");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "h2");
    \u0275\u0275text(5, "Email");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 52);
    \u0275\u0275text(7, "\u22EE");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 77);
    \u0275\u0275template(9, AndroidDeviceComponent_div_1_div_21_div_9_Template, 9, 4, "div", 78);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(9);
    \u0275\u0275property("ngForOf", ctx_r1.emails);
  }
}
function AndroidDeviceComponent_div_1_div_22_div_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 86)(1, "div", 87);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 88);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 89);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const note_r17 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(note_r17.title);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(note_r17.content);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(note_r17.time);
  }
}
function AndroidDeviceComponent_div_1_div_22_Template(rf, ctx) {
  if (rf & 1) {
    const _r16 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 49)(1, "div", 50)(2, "button", 51);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_22_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r16);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.goHome());
    });
    \u0275\u0275text(3, "\u2190");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "h2");
    \u0275\u0275text(5, "Samsung Notes");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 52);
    \u0275\u0275text(7, "\u22EE");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 84);
    \u0275\u0275template(9, AndroidDeviceComponent_div_1_div_22_div_9_Template, 7, 3, "div", 85);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(9);
    \u0275\u0275property("ngForOf", ctx_r1.notes);
  }
}
function AndroidDeviceComponent_div_1_div_23_div_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 86)(1, "span");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 87);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 88);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "small");
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const file_r19 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(file_r19.type === "Encrypted" ? "\u{1F512}" : file_r19.type === "Screenshot" ? "\u{1F5BC}" : file_r19.type === "Folder" ? "\u{1F4C1}" : "\u{1F4C4}");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(file_r19.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(file_r19.description);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(file_r19.type);
  }
}
function AndroidDeviceComponent_div_1_div_23_div_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 86);
    \u0275\u0275text(1, "Niciun fi\u0219ier.");
    \u0275\u0275elementEnd();
  }
}
function AndroidDeviceComponent_div_1_div_23_Template(rf, ctx) {
  if (rf & 1) {
    const _r18 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 49)(1, "div", 50)(2, "button", 51);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_23_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.goHome());
    });
    \u0275\u0275text(3, "\u2190");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "h2");
    \u0275\u0275text(5, "Files");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 52);
    \u0275\u0275text(7, "\u22EE");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 84);
    \u0275\u0275template(9, AndroidDeviceComponent_div_1_div_23_div_9_Template, 9, 4, "div", 85)(10, AndroidDeviceComponent_div_1_div_23_div_10_Template, 2, 0, "div", 90);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(9);
    \u0275\u0275property("ngForOf", ctx_r1.files);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r1.files.length === 0);
  }
}
function AndroidDeviceComponent_div_1_div_24_ng_container_10_div_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 97);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const call_r21 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.getCallDateLabel(call_r21), " ");
  }
}
function AndroidDeviceComponent_div_1_div_24_ng_container_10_span_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const call_r21 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \xB7 ", call_r21.duration, "");
  }
}
function AndroidDeviceComponent_div_1_div_24_ng_container_10_button_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r22 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 98);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_24_ng_container_10_button_14_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r22);
      const call_r21 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.initiateCall(call_r21));
    });
    \u0275\u0275text(1, "\u25B6");
    \u0275\u0275elementEnd();
  }
}
function AndroidDeviceComponent_div_1_div_24_ng_container_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementContainerStart(0);
    \u0275\u0275template(1, AndroidDeviceComponent_div_1_div_24_ng_container_10_div_1_Template, 2, 1, "div", 93);
    \u0275\u0275elementStart(2, "div", 94)(3, "div", 59);
    \u0275\u0275text(4, "\u{1F4DE}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 60)(6, "div", 61)(7, "strong");
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "span", 62);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "div", 63);
    \u0275\u0275text(12);
    \u0275\u0275template(13, AndroidDeviceComponent_div_1_div_24_ng_container_10_span_13_Template, 2, 1, "span", 95);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(14, AndroidDeviceComponent_div_1_div_24_ng_container_10_button_14_Template, 2, 0, "button", 96);
    \u0275\u0275elementEnd();
    \u0275\u0275elementContainerEnd();
  }
  if (rf & 2) {
    const call_r21 = ctx.$implicit;
    const i_r23 = ctx.index;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", i_r23 === 0 || ctx_r1.getCallDateLabel(call_r21) !== ctx_r1.getCallDateLabel(ctx_r1.sortedCalls[i_r23 - 1]));
    \u0275\u0275advance();
    \u0275\u0275classProp("call-missed", call_r21.type === "Pierdut");
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(call_r21.contact);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(call_r21.time);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", call_r21.type, "");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", call_r21.duration && call_r21.duration !== "\u2014");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", call_r21.audioUrl);
  }
}
function AndroidDeviceComponent_div_1_div_24_div_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 94);
    \u0275\u0275text(1, "Nu exist\u0103 apeluri.");
    \u0275\u0275elementEnd();
  }
}
function AndroidDeviceComponent_div_1_div_24_Template(rf, ctx) {
  if (rf & 1) {
    const _r20 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 49)(1, "div", 50)(2, "button", 51);
    \u0275\u0275listener("click", function AndroidDeviceComponent_div_1_div_24_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.goHome());
    });
    \u0275\u0275text(3, "\u2190");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "h2");
    \u0275\u0275text(5, "Phone");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 52);
    \u0275\u0275text(7, "\u22EE");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 53)(9, "div", 56);
    \u0275\u0275template(10, AndroidDeviceComponent_div_1_div_24_ng_container_10_Template, 15, 8, "ng-container", 91)(11, AndroidDeviceComponent_div_1_div_24_div_11_Template, 2, 0, "div", 92);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(10);
    \u0275\u0275property("ngForOf", ctx_r1.sortedCalls);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r1.calls.length === 0);
  }
}
function AndroidDeviceComponent_div_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 4)(1, "div", 5);
    \u0275\u0275element(2, "div", 6);
    \u0275\u0275elementStart(3, "div", 7)(4, "div", 8)(5, "span", 9);
    \u0275\u0275text(6, "9:41");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 10)(8, "span", 11);
    \u0275\u0275text(9, "5G");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "span", 11);
    \u0275\u0275text(11, "\u{1F4F6}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "span", 11);
    \u0275\u0275text(13, "\u{1F4E1}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "span", 11);
    \u0275\u0275text(15, "\u{1F50B} 85%");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(16, "div", 12);
    \u0275\u0275listener("touchstart", function AndroidDeviceComponent_div_1_Template_div_touchstart_16_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onTouchStart($event));
    })("touchmove", function AndroidDeviceComponent_div_1_Template_div_touchmove_16_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onTouchMove($event));
    })("touchend", function AndroidDeviceComponent_div_1_Template_div_touchend_16_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onTouchEnd($event));
    })("mousedown", function AndroidDeviceComponent_div_1_Template_div_mousedown_16_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onMouseDown($event));
    })("mousemove", function AndroidDeviceComponent_div_1_Template_div_mousemove_16_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onMouseMove($event));
    })("mouseup", function AndroidDeviceComponent_div_1_Template_div_mouseup_16_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onMouseUp($event));
    });
    \u0275\u0275template(17, AndroidDeviceComponent_div_1_div_17_Template, 195, 3, "div", 13)(18, AndroidDeviceComponent_div_1_div_18_Template, 11, 2, "div", 14)(19, AndroidDeviceComponent_div_1_div_19_Template, 10, 1, "div", 14)(20, AndroidDeviceComponent_div_1_div_20_Template, 4, 2, "div", 15)(21, AndroidDeviceComponent_div_1_div_21_Template, 10, 1, "div", 14)(22, AndroidDeviceComponent_div_1_div_22_Template, 10, 1, "div", 14)(23, AndroidDeviceComponent_div_1_div_23_Template, 11, 2, "div", 14)(24, AndroidDeviceComponent_div_1_div_24_Template, 12, 2, "div", 14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "div", 16);
    \u0275\u0275element(26, "div", 17);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(17);
    \u0275\u0275property("ngIf", ctx_r1.currentScreen === "home");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r1.currentScreen === "messages");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r1.currentScreen === "photos");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r1.selectedPhoto);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r1.currentScreen === "email");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r1.currentScreen === "notes");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r1.currentScreen === "files");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r1.currentScreen === "phone");
  }
}
var AndroidDeviceComponent = class _AndroidDeviceComponent extends BaseDeviceComponent {
  static \u0275fac = /* @__PURE__ */ (() => {
    let \u0275AndroidDeviceComponent_BaseFactory;
    return function AndroidDeviceComponent_Factory(__ngFactoryType__) {
      return (\u0275AndroidDeviceComponent_BaseFactory || (\u0275AndroidDeviceComponent_BaseFactory = \u0275\u0275getInheritedFactory(_AndroidDeviceComponent)))(__ngFactoryType__ || _AndroidDeviceComponent);
    };
  })();
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AndroidDeviceComponent, selectors: [["app-android-device"]], standalone: true, features: [\u0275\u0275InheritDefinitionFeature, \u0275\u0275StandaloneFeature], decls: 2, vars: 2, consts: [["class", "loading-container", 4, "ngIf"], ["class", "samsung-container", 4, "ngIf"], [1, "loading-container"], [1, "loader"], [1, "samsung-container"], [1, "samsung-frame"], [1, "camera-punch"], [1, "samsung-status-bar"], [1, "status-left"], [1, "time"], [1, "status-right"], [1, "status-icon"], [1, "samsung-screen", 3, "touchstart", "touchmove", "touchend", "mousedown", "mousemove", "mouseup"], ["class", "samsung-home", 4, "ngIf"], ["class", "samsung-app-view", 4, "ngIf"], ["class", "samsung-photo-full", 4, "ngIf"], [1, "samsung-nav-bar"], [1, "gesture-bar"], [1, "samsung-home"], [1, "google-search-bar"], [1, "search-icon"], [1, "search-text"], [1, "google-lens"], [1, "google-voice"], [1, "samsung-home-pages-wrapper"], [1, "samsung-home-pages"], [1, "samsung-home-page"], [1, "samsung-app-grid"], [1, "samsung-app", 3, "click"], [1, "samsung-icon", "messages-samsung"], [1, "samsung-icon", "gallery-samsung"], [1, "samsung-icon", "email-samsung"], [1, "samsung-icon", "notes-samsung"], [1, "samsung-icon", "phone-samsung"], [1, "samsung-app"], [1, "samsung-icon", "contacts-samsung"], [1, "samsung-icon", "camera-samsung"], [1, "samsung-icon", "chrome-icon"], [1, "samsung-icon", "settings-samsung"], [1, "samsung-page-dots"], ["class", "samsung-dot", 3, "active", "click", 4, "ngFor", "ngForOf"], [1, "samsung-dock"], [1, "dock-app"], [1, "dock-icon", "chrome-icon"], [1, "dock-app", 3, "click"], [1, "dock-icon", "messages-icon"], [1, "dock-icon", "phone-icon"], [1, "dock-icon", "apps-icon"], [1, "samsung-dot", 3, "click"], [1, "samsung-app-view"], [1, "samsung-header"], [1, "samsung-back", 3, "click"], [1, "samsung-menu"], [1, "samsung-content"], ["class", "samsung-conversations", 4, "ngIf"], ["class", "samsung-chat-view", 4, "ngIf"], [1, "samsung-conversations"], ["class", "samsung-conv-item", 3, "click", 4, "ngFor", "ngForOf"], [1, "samsung-conv-item", 3, "click"], [1, "samsung-contact-avatar"], [1, "samsung-conv-info"], [1, "conv-top"], [1, "conv-time"], [1, "conv-preview"], [1, "samsung-chat-view"], [1, "samsung-chat-messages"], [3, "class", 4, "ngFor", "ngForOf"], [1, "samsung-bubble"], [1, "bubble-content"], [1, "bubble-time"], [1, "samsung-gallery"], ["class", "gallery-photo-wrap", 3, "click", 4, "ngFor", "ngForOf"], [1, "gallery-photo-wrap", 3, "click"], [1, "gallery-photo", 3, "src", "alt"], [1, "samsung-photo-full"], [1, "samsung-photo-close", 3, "click"], [3, "src", "alt"], [1, "samsung-email-list"], ["class", "samsung-email-item", 4, "ngFor", "ngForOf"], [1, "samsung-email-item"], [1, "email-sender"], [1, "email-subject"], [1, "email-preview"], [1, "email-time"], [1, "samsung-notes-grid"], ["class", "samsung-note-card", 4, "ngFor", "ngForOf"], [1, "samsung-note-card"], [1, "note-title"], [1, "note-text"], [1, "note-date"], ["class", "samsung-note-card", 4, "ngIf"], [4, "ngFor", "ngForOf"], ["class", "samsung-conv-item", 4, "ngIf"], ["class", "call-date-separator", 4, "ngIf"], [1, "samsung-conv-item"], [4, "ngIf"], ["class", "call-audio-btn", "title", "Red\u0103 \xEEnregistrarea", 3, "click", 4, "ngIf"], [1, "call-date-separator"], ["title", "Red\u0103 \xEEnregistrarea", 1, "call-audio-btn", 3, "click"]], template: function AndroidDeviceComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275template(0, AndroidDeviceComponent_div_0_Template, 4, 0, "div", 0)(1, AndroidDeviceComponent_div_1_Template, 27, 8, "div", 1);
    }
    if (rf & 2) {
      \u0275\u0275property("ngIf", ctx.loading);
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", !ctx.loading);
    }
  }, dependencies: [CommonModule, NgForOf, NgIf], styles: ['\n\n.loading-container[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #1B4F72 0%,\n      #2E86C1 50%,\n      #5DADE2 100%);\n  color: white;\n}\n.loader[_ngcontent-%COMP%] {\n  border: 4px solid rgba(255, 255, 255, 0.3);\n  border-top: 4px solid white;\n  border-radius: 50%;\n  width: 40px;\n  height: 40px;\n  animation: _ngcontent-%COMP%_spin 1s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  0% {\n    transform: rotate(0deg);\n  }\n  100% {\n    transform: rotate(360deg);\n  }\n}\n.samsung-container[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  width: 100vw;\n  background:\n    linear-gradient(\n      135deg,\n      #1B4F72 0%,\n      #2E86C1 50%,\n      #5DADE2 100%);\n  padding: 0;\n  overflow: hidden;\n  position: fixed;\n  top: 0;\n  left: 0;\n}\n.samsung-frame[_ngcontent-%COMP%] {\n  width: 280px;\n  height: 560px;\n  background:\n    linear-gradient(\n      135deg,\n      #0a0a0a 0%,\n      #1a1a1a 100%);\n  border-radius: 36px;\n  overflow: hidden;\n  box-shadow: 0 0 40px rgba(0, 0, 0, 0.8);\n  position: relative;\n  border: none;\n}\n.camera-punch[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 12px;\n  left: 50%;\n  transform: translateX(-50%);\n  width: 12px;\n  height: 12px;\n  background: #0a0a0a;\n  border-radius: 50%;\n  z-index: 100;\n  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);\n}\n.samsung-status-bar[_ngcontent-%COMP%] {\n  background: transparent;\n  color: white;\n  padding: 28px 20px 8px;\n  display: flex;\n  justify-content: space-between;\n  font-size: 13px;\n  z-index: 50;\n}\n.status-left[_ngcontent-%COMP%], \n.status-right[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 8px;\n  align-items: center;\n}\n.status-icon[_ngcontent-%COMP%] {\n  font-size: 11px;\n  opacity: 0.9;\n}\n.samsung-screen[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #1E3A5F 0%,\n      #1B1464 100%);\n  height: calc(100% - 50px - 30px);\n  overflow: hidden;\n  -ms-overflow-style: none;\n  scrollbar-width: none;\n}\n.samsung-screen[_ngcontent-%COMP%]::-webkit-scrollbar {\n  display: none;\n}\n.samsung-nav-bar[_ngcontent-%COMP%] {\n  background: #000;\n  height: 30px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n.gesture-bar[_ngcontent-%COMP%] {\n  width: 140px;\n  height: 4px;\n  background: rgba(255, 255, 255, 0.3);\n  border-radius: 2px;\n}\n.samsung-home[_ngcontent-%COMP%] {\n  padding: 16px 16px 16px 16px;\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n  box-sizing: border-box;\n  background-image: url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop);\n  background-size: cover;\n  background-position: center;\n  position: relative;\n  overflow: hidden;\n}\n.samsung-home[_ngcontent-%COMP%]::before {\n  content: "";\n  position: absolute;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.3);\n  z-index: 0;\n}\n.samsung-home-pages-wrapper[_ngcontent-%COMP%] {\n  flex: 1;\n  overflow: hidden;\n  position: relative;\n  z-index: 1;\n}\n.samsung-home-pages[_ngcontent-%COMP%] {\n  display: flex;\n  height: 100%;\n  transition: transform 0.25s ease-out;\n}\n.samsung-home-page[_ngcontent-%COMP%] {\n  flex: 0 0 100%;\n  width: 100%;\n  height: 100%;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  min-height: 0;\n}\n.samsung-page-dots[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n  gap: 6px;\n  padding: 6px 0;\n  flex-shrink: 0;\n  position: relative;\n  z-index: 2;\n}\n.samsung-page-dots[_ngcontent-%COMP%]   .samsung-dot[_ngcontent-%COMP%] {\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n  background: rgba(255, 255, 255, 0.5);\n  cursor: pointer;\n  transition: background 0.2s;\n}\n.samsung-page-dots[_ngcontent-%COMP%]   .samsung-dot.active[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.95);\n}\n.google-search-bar[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.95);\n  border-radius: 24px;\n  padding: 8px 16px;\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  margin-bottom: 12px;\n  flex-shrink: 0;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);\n  position: relative;\n  z-index: 1;\n}\n.search-icon[_ngcontent-%COMP%] {\n  font-size: 18px;\n  opacity: 0.6;\n}\n.search-text[_ngcontent-%COMP%] {\n  flex: 1;\n  color: #666;\n  font-size: 15px;\n}\n.google-lens[_ngcontent-%COMP%], \n.google-voice[_ngcontent-%COMP%] {\n  font-size: 18px;\n  opacity: 0.6;\n}\n.samsung-app-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(4, 1fr);\n  grid-template-rows: repeat(3, minmax(0, 1fr));\n  gap: 10px 12px;\n  padding: 0;\n  flex: 1;\n  min-height: 0;\n  position: relative;\n  z-index: 1;\n  align-content: center;\n}\n.samsung-app[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  color: white;\n  min-height: 0;\n}\n.samsung-app[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  font-size: 9px;\n  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);\n  line-height: 1.1;\n  margin-top: 2px;\n}\n.samsung-icon[_ngcontent-%COMP%] {\n  width: 100%;\n  max-width: 48px;\n  height: auto;\n  aspect-ratio: 1;\n  max-height: min(48px, 15vw);\n  border-radius: 16px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 22px;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);\n}\n.messages-samsung[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n}\n.gallery-samsung[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #f093fb 0%,\n      #f5576c 100%);\n}\n.email-samsung[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #4facfe 0%,\n      #00f2fe 100%);\n}\n.notes-samsung[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #43e97b 0%,\n      #38f9d7 100%);\n}\n.phone-samsung[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #00c6ff 0%,\n      #0072ff 100%);\n}\n.contacts-samsung[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #f857a6 0%,\n      #ff5858 100%);\n}\n.camera-samsung[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #a8edea 0%,\n      #fed6e3 100%);\n}\n.settings-samsung[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n}\n.samsung-dock[_ngcontent-%COMP%] {\n  background: rgba(0, 0, 0, 0.5);\n  backdrop-filter: blur(20px);\n  border-radius: 24px;\n  padding: 10px 16px 12px;\n  margin: 0 16px 24px 16px;\n  flex-shrink: 0;\n  min-height: 56px;\n  box-sizing: border-box;\n  display: flex;\n  justify-content: space-evenly;\n  align-items: center;\n  gap: 8px;\n  position: relative;\n  z-index: 2;\n}\n.dock-app[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  flex: 1;\n  max-width: 56px;\n}\n.dock-icon[_ngcontent-%COMP%] {\n  width: 44px;\n  height: 44px;\n  border-radius: 14px;\n  background: rgba(255, 255, 255, 0.1);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 20px;\n}\n.samsung-app-view[_ngcontent-%COMP%] {\n  background: white;\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n}\n.samsung-header[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  color: white;\n  padding: 15px 20px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\n}\n.samsung-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 20px;\n  font-weight: 500;\n  flex: 1;\n  text-align: center;\n}\n.samsung-back[_ngcontent-%COMP%], \n.samsung-menu[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: white;\n  font-size: 24px;\n  cursor: pointer;\n  width: 40px;\n  height: 40px;\n}\n.samsung-content[_ngcontent-%COMP%] {\n  flex: 1;\n  overflow: hidden;\n  max-height: 100%;\n  -ms-overflow-style: none;\n  scrollbar-width: none;\n}\n.samsung-content[_ngcontent-%COMP%]::-webkit-scrollbar {\n  display: none;\n}\n.samsung-conversations[_ngcontent-%COMP%] {\n  padding: 8px 0;\n  max-height: calc(100vh - 200px);\n  overflow: hidden;\n}\n.samsung-conversations[_ngcontent-%COMP%]::-webkit-scrollbar {\n  display: none;\n}\n.samsung-conv-item[_ngcontent-%COMP%] {\n  display: flex;\n  padding: 16px 20px;\n  border-bottom: 1px solid #f0f0f0;\n  cursor: pointer;\n  align-items: center;\n}\n.samsung-conv-item[_ngcontent-%COMP%]:active {\n  background: #f5f5f5;\n}\n.samsung-contact-avatar[_ngcontent-%COMP%] {\n  width: 56px;\n  height: 56px;\n  border-radius: 28px;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 28px;\n  margin-right: 16px;\n}\n.samsung-conv-info[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n}\n.conv-top[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 4px;\n}\n.conv-top[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] {\n  font-size: 16px;\n}\n.conv-time[_ngcontent-%COMP%] {\n  font-size: 13px;\n  color: #999;\n}\n.conv-preview[_ngcontent-%COMP%] {\n  font-size: 14px;\n  color: #666;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.samsung-chat-messages[_ngcontent-%COMP%] {\n  padding: 20px;\n  overflow: hidden;\n  max-height: 100%;\n}\n.samsung-chat-messages[_ngcontent-%COMP%]::-webkit-scrollbar {\n  display: none;\n}\n.samsung-msg-received[_ngcontent-%COMP%], \n.samsung-msg-sent[_ngcontent-%COMP%] {\n  display: flex;\n  margin-bottom: 12px;\n}\n.samsung-msg-sent[_ngcontent-%COMP%] {\n  justify-content: flex-end;\n}\n.samsung-bubble[_ngcontent-%COMP%] {\n  max-width: 75%;\n  padding: 12px 16px;\n  border-radius: 18px;\n  background: #e5e5ea;\n}\n.samsung-msg-sent[_ngcontent-%COMP%]   .samsung-bubble[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  color: white;\n}\n.bubble-content[_ngcontent-%COMP%] {\n  margin-bottom: 4px;\n}\n.bubble-time[_ngcontent-%COMP%] {\n  font-size: 11px;\n  opacity: 0.7;\n}\n.samsung-gallery[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 2px;\n  padding: 2px;\n}\n.gallery-photo-wrap[_ngcontent-%COMP%] {\n  position: relative;\n  aspect-ratio: 1;\n  overflow: hidden;\n}\n.gallery-photo[_ngcontent-%COMP%] {\n  width: 100%;\n  aspect-ratio: 1;\n  object-fit: cover;\n}\n.gallery-upload-hint[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.75);\n  color: #fff;\n  font-size: 10px;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  align-items: center;\n  text-align: center;\n  gap: 4px;\n  padding: 6px;\n}\n.gallery-upload-btn[_ngcontent-%COMP%] {\n  padding: 4px 8px;\n  background: #2f7cf6;\n  border-radius: 8px;\n  font-size: 10px;\n  cursor: pointer;\n}\n.gallery-upload-btn[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  display: none;\n}\n.samsung-photo-full[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  z-index: 80;\n  background: #000;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n.samsung-photo-full[_ngcontent-%COMP%]   img[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 100%;\n  object-fit: contain;\n}\n.samsung-photo-close[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 12px;\n  right: 12px;\n  width: 32px;\n  height: 32px;\n  border: none;\n  border-radius: 50%;\n  background: rgba(255, 255, 255, 0.25);\n  color: #fff;\n  font-size: 16px;\n  cursor: pointer;\n  z-index: 2;\n}\n.samsung-email-list[_ngcontent-%COMP%] {\n  padding: 8px 0;\n}\n.samsung-email-item[_ngcontent-%COMP%] {\n  padding: 16px 20px;\n  border-bottom: 1px solid #f0f0f0;\n  cursor: pointer;\n}\n.samsung-email-item[_ngcontent-%COMP%]:active {\n  background: #f5f5f5;\n}\n.email-sender[_ngcontent-%COMP%] {\n  font-weight: 600;\n  margin-bottom: 4px;\n}\n.email-subject[_ngcontent-%COMP%] {\n  font-weight: 600;\n  margin-bottom: 4px;\n}\n.email-preview[_ngcontent-%COMP%] {\n  color: #666;\n  font-size: 14px;\n}\n.samsung-notes-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr;\n  gap: 12px;\n  padding: 16px;\n}\n.samsung-note-card[_ngcontent-%COMP%] {\n  background: #fff9c4;\n  padding: 16px;\n  border-radius: 12px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\n}\n.note-title[_ngcontent-%COMP%] {\n  font-weight: 600;\n  margin-bottom: 8px;\n}\n.note-text[_ngcontent-%COMP%] {\n  font-size: 14px;\n  color: #666;\n  margin-bottom: 8px;\n}\n.note-date[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: #999;\n}\n/*# sourceMappingURL=android-device.component.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AndroidDeviceComponent, { className: "AndroidDeviceComponent", filePath: "src\\app\\components\\devices\\android\\android-device.component.ts", lineNumber: 12 });
})();

// src/app/components/devices/laptop/laptop-device.component.ts
var _c0 = () => ["doc", "docx", "txt"];
var _c1 = () => ["pdf"];
var _c2 = () => ["xls", "xlsx", "csv"];
function LaptopDeviceComponent_div_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 5);
    \u0275\u0275element(1, "div", 6);
    \u0275\u0275elementStart(2, "p");
    \u0275\u0275text(3, "Loading device...");
    \u0275\u0275elementEnd()();
  }
}
function LaptopDeviceComponent_div_1_div_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 50)(1, "div", 51);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_6_Template_div_click_1_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.openApp("messages"));
    });
    \u0275\u0275element(2, "div", 52);
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4, "Messages");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "div", 51);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_6_Template_div_click_5_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.openApp("email"));
    });
    \u0275\u0275element(6, "div", 53);
    \u0275\u0275elementStart(7, "span");
    \u0275\u0275text(8, "Mail");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 51);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_6_Template_div_click_9_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.openApp("photos"));
    });
    \u0275\u0275element(10, "div", 54);
    \u0275\u0275elementStart(11, "span");
    \u0275\u0275text(12, "Photos");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "div", 51);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_6_Template_div_click_13_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.openApp("files"));
    });
    \u0275\u0275element(14, "div", 55);
    \u0275\u0275elementStart(15, "span");
    \u0275\u0275text(16, "Files");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "div", 51);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_6_Template_div_click_17_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.openApp("notes"));
    });
    \u0275\u0275element(18, "div", 56);
    \u0275\u0275elementStart(19, "span");
    \u0275\u0275text(20, "Notepad");
    \u0275\u0275elementEnd()()();
  }
}
function LaptopDeviceComponent_div_1_div_7_div_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 71);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_7_div_15_Template_div_click_0_listener() {
      const conv_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.selectConversation(conv_r6));
    });
    \u0275\u0275elementStart(1, "div", 72);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 73)(4, "strong");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "p");
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const conv_r6 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(conv_r6.avatar);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(conv_r6.contact);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(conv_r6.lastMessage);
  }
}
function LaptopDeviceComponent_div_1_div_7_div_17_div_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div")(1, "div", 76)(2, "div", 77);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 78);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const msg_r7 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(4);
    \u0275\u0275classMap(msg_r7.isOutgoing ? "win-msg-out" : "win-msg-in");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.getMsgSender(msg_r7));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.getMsgContent(msg_r7));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.getMsgTimestamp(msg_r7));
  }
}
function LaptopDeviceComponent_div_1_div_7_div_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 74);
    \u0275\u0275template(1, LaptopDeviceComponent_div_1_div_7_div_17_div_1_Template, 8, 5, "div", 75);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275property("ngForOf", ctx_r2.selectedConversation.messages);
  }
}
function LaptopDeviceComponent_div_1_div_7_div_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 79);
    \u0275\u0275text(1, " Select a conversation to view messages ");
    \u0275\u0275elementEnd();
  }
}
function LaptopDeviceComponent_div_1_div_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 57)(1, "div", 58)(2, "div", 59);
    \u0275\u0275element(3, "div", 60);
    \u0275\u0275elementStart(4, "span");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 61)(7, "button", 62);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_7_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.goHome());
    });
    \u0275\u0275text(8, "\u2014");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 63);
    \u0275\u0275text(10, "\u2B1C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 64);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_7_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.goHome());
    });
    \u0275\u0275text(12, "\u2715");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(13, "div", 65)(14, "div", 66);
    \u0275\u0275template(15, LaptopDeviceComponent_div_1_div_7_div_15_Template, 8, 3, "div", 67);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "div", 68);
    \u0275\u0275template(17, LaptopDeviceComponent_div_1_div_7_div_17_Template, 2, 1, "div", 69)(18, LaptopDeviceComponent_div_1_div_7_div_18_Template, 2, 0, "div", 70);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1("Messages \u2014 ", ctx_r2.ownerName, "");
    \u0275\u0275advance(10);
    \u0275\u0275property("ngForOf", ctx_r2.conversations);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngIf", ctx_r2.selectedConversation);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", !ctx_r2.selectedConversation);
  }
}
function LaptopDeviceComponent_div_1_div_8_img_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 86);
  }
  if (rf & 2) {
    const photo_r9 = ctx.$implicit;
    \u0275\u0275property("src", photo_r9.url, \u0275\u0275sanitizeUrl)("alt", photo_r9.caption);
  }
}
function LaptopDeviceComponent_div_1_div_8_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 57)(1, "div", 58)(2, "div", 59);
    \u0275\u0275element(3, "div", 80);
    \u0275\u0275elementStart(4, "span");
    \u0275\u0275text(5, "Photos");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 61)(7, "button", 81);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_8_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.goHome());
    });
    \u0275\u0275text(8, "\u2014");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 82);
    \u0275\u0275text(10, "\u2B1C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 83);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_8_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.goHome());
    });
    \u0275\u0275text(12, "\u2715");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(13, "div", 84);
    \u0275\u0275template(14, LaptopDeviceComponent_div_1_div_8_img_14_Template, 1, 2, "img", 85);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(14);
    \u0275\u0275property("ngForOf", ctx_r2.photos);
  }
}
function LaptopDeviceComponent_div_1_div_9_div_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 91);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_9_div_15_Template_div_click_0_listener() {
      const email_r12 = \u0275\u0275restoreView(_r11).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.selectEmail(email_r12));
    });
    \u0275\u0275elementStart(1, "div", 92)(2, "strong");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 93);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "p", 94);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const email_r12 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("active", ctx_r2.selectedEmail === email_r12);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(email_r12.from);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(email_r12.time);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(email_r12.subject);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(email_r12.preview);
  }
}
function LaptopDeviceComponent_div_1_div_9_div_16_span_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span")(1, "strong");
    \u0275\u0275text(2, "Time:");
    \u0275\u0275elementEnd();
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(4);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", ctx_r2.selectedEmail.time, "");
  }
}
function LaptopDeviceComponent_div_1_div_9_div_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 95)(1, "h3");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 96)(4, "span")(5, "strong");
    \u0275\u0275text(6, "From:");
    \u0275\u0275elementEnd();
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275template(8, LaptopDeviceComponent_div_1_div_9_div_16_span_8_Template, 4, 1, "span", 97);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "pre");
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.selectedEmail.subject);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1(" ", ctx_r2.selectedEmail.from, "");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.selectedEmail.time);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.selectedEmail.body || ctx_r2.selectedEmail.preview || "No content available.");
  }
}
function LaptopDeviceComponent_div_1_div_9_ng_template_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 98);
    \u0275\u0275text(1, " Select an email to read it. ");
    \u0275\u0275elementEnd();
  }
}
function LaptopDeviceComponent_div_1_div_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 57)(1, "div", 58)(2, "div", 59);
    \u0275\u0275element(3, "div", 87);
    \u0275\u0275elementStart(4, "span");
    \u0275\u0275text(5, "Mail");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 61)(7, "button", 81);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_9_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.goHome());
    });
    \u0275\u0275text(8, "\u2014");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 82);
    \u0275\u0275text(10, "\u2B1C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 83);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_9_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.goHome());
    });
    \u0275\u0275text(12, "\u2715");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(13, "div", 65)(14, "div", 88);
    \u0275\u0275template(15, LaptopDeviceComponent_div_1_div_9_div_15_Template, 10, 6, "div", 89);
    \u0275\u0275elementEnd();
    \u0275\u0275template(16, LaptopDeviceComponent_div_1_div_9_div_16_Template, 11, 4, "div", 90)(17, LaptopDeviceComponent_div_1_div_9_ng_template_17_Template, 2, 0, "ng-template", null, 0, \u0275\u0275templateRefExtractor);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const emailPlaceholder_r13 = \u0275\u0275reference(18);
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(15);
    \u0275\u0275property("ngForOf", ctx_r2.emails);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.selectedEmail)("ngIfElse", emailPlaceholder_r13);
  }
}
function LaptopDeviceComponent_div_1_div_10_div_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 102)(1, "h4");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "small");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const note_r15 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(note_r15.title);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(note_r15.content);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(note_r15.time);
  }
}
function LaptopDeviceComponent_div_1_div_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 57)(1, "div", 58)(2, "div", 59);
    \u0275\u0275element(3, "div", 99);
    \u0275\u0275elementStart(4, "span");
    \u0275\u0275text(5, "Notepad");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 61)(7, "button", 81);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_10_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.goHome());
    });
    \u0275\u0275text(8, "\u2014");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 82);
    \u0275\u0275text(10, "\u2B1C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 83);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_10_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.goHome());
    });
    \u0275\u0275text(12, "\u2715");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(13, "div", 100);
    \u0275\u0275template(14, LaptopDeviceComponent_div_1_div_10_div_14_Template, 7, 3, "div", 101);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(14);
    \u0275\u0275property("ngForOf", ctx_r2.notes);
  }
}
function LaptopDeviceComponent_div_1_div_11_div_15_p_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 113);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const file_r18 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(file_r18.description);
  }
}
function LaptopDeviceComponent_div_1_div_11_div_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r17 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 108);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_11_div_15_Template_div_click_0_listener() {
      const file_r18 = \u0275\u0275restoreView(_r17).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.selectFile(file_r18));
    });
    \u0275\u0275elementStart(1, "span", 109);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 110)(4, "strong");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 111);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275template(8, LaptopDeviceComponent_div_1_div_11_div_15_p_8_Template, 2, 1, "p", 112);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const file_r18 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("active", (ctx_r2.selectedFile == null ? null : ctx_r2.selectedFile.name) === file_r18.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.getFileIcon(file_r18));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(file_r18.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(file_r18.type);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", file_r18.description);
  }
}
function LaptopDeviceComponent_div_1_div_11_div_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 114);
    \u0275\u0275text(1, "No files found.");
    \u0275\u0275elementEnd();
  }
}
function LaptopDeviceComponent_div_1_div_11_div_17_div_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 120)(1, "div", 121);
    \u0275\u0275text(2, "Word");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "h3");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "pre");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(4);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r2.selectedFile.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.selectedFile.content || ctx_r2.selectedFile.description || "No content available.");
  }
}
function LaptopDeviceComponent_div_1_div_11_div_17_div_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 122)(1, "div", 123)(2, "span");
    \u0275\u0275text(3, "PDF Viewer");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(4, "div", 124)(5, "h4");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "p");
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(4);
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(ctx_r2.selectedFile.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.selectedFile.content || ctx_r2.selectedFile.description || "Preview not available.");
  }
}
function LaptopDeviceComponent_div_1_div_11_div_17_div_8_table_3_th_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "th");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const col_r19 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(col_r19);
  }
}
function LaptopDeviceComponent_div_1_div_11_div_17_div_8_table_3_tr_5_td_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "td");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const col_r20 = ctx.$implicit;
    const row_r21 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(row_r21[col_r20]);
  }
}
function LaptopDeviceComponent_div_1_div_11_div_17_div_8_table_3_tr_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr");
    \u0275\u0275template(1, LaptopDeviceComponent_div_1_div_11_div_17_div_8_table_3_tr_5_td_1_Template, 2, 1, "td", 128);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(6);
    \u0275\u0275advance();
    \u0275\u0275property("ngForOf", ctx_r2.selectedSpreadsheetColumns);
  }
}
function LaptopDeviceComponent_div_1_div_11_div_17_div_8_table_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "table")(1, "thead")(2, "tr");
    \u0275\u0275template(3, LaptopDeviceComponent_div_1_div_11_div_17_div_8_table_3_th_3_Template, 2, 1, "th", 128);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(4, "tbody");
    \u0275\u0275template(5, LaptopDeviceComponent_div_1_div_11_div_17_div_8_table_3_tr_5_Template, 2, 1, "tr", 128);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(5);
    \u0275\u0275advance(3);
    \u0275\u0275property("ngForOf", ctx_r2.selectedSpreadsheetColumns);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngForOf", ctx_r2.selectedFile.rows);
  }
}
function LaptopDeviceComponent_div_1_div_11_div_17_div_8_ng_template_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 129);
    \u0275\u0275text(1, "No spreadsheet rows configured.");
    \u0275\u0275elementEnd();
  }
}
function LaptopDeviceComponent_div_1_div_11_div_17_div_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 125)(1, "div", 126);
    \u0275\u0275text(2, "Excel");
    \u0275\u0275elementEnd();
    \u0275\u0275template(3, LaptopDeviceComponent_div_1_div_11_div_17_div_8_table_3_Template, 6, 2, "table", 127)(4, LaptopDeviceComponent_div_1_div_11_div_17_div_8_ng_template_4_Template, 2, 0, "ng-template", null, 2, \u0275\u0275templateRefExtractor);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const noSheetData_r22 = \u0275\u0275reference(5);
    const ctx_r2 = \u0275\u0275nextContext(4);
    \u0275\u0275advance(3);
    \u0275\u0275property("ngIf", ctx_r2.selectedFile.rows == null ? null : ctx_r2.selectedFile.rows.length)("ngIfElse", noSheetData_r22);
  }
}
function LaptopDeviceComponent_div_1_div_11_div_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 115)(1, "div", 116)(2, "strong");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(6, LaptopDeviceComponent_div_1_div_11_div_17_div_6_Template, 7, 2, "div", 117)(7, LaptopDeviceComponent_div_1_div_11_div_17_div_7_Template, 9, 2, "div", 118)(8, LaptopDeviceComponent_div_1_div_11_div_17_div_8_Template, 6, 2, "div", 119);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.filePreviewTitle);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", ctx_r2.selectedFile.modifiedAt || "Unknown date", " \xB7 ", ctx_r2.selectedFile.size || "\u2014", "");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.isFileType(ctx_r2.selectedFile, \u0275\u0275pureFunction0(6, _c0)));
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.isFileType(ctx_r2.selectedFile, \u0275\u0275pureFunction0(7, _c1)));
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.isFileType(ctx_r2.selectedFile, \u0275\u0275pureFunction0(8, _c2)));
  }
}
function LaptopDeviceComponent_div_1_div_11_ng_template_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 130);
    \u0275\u0275text(1, " Select a file to preview it. ");
    \u0275\u0275elementEnd();
  }
}
function LaptopDeviceComponent_div_1_div_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r16 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 57)(1, "div", 58)(2, "div", 59);
    \u0275\u0275element(3, "div", 103);
    \u0275\u0275elementStart(4, "span");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 61)(7, "button", 81);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_11_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r16);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.goHome());
    });
    \u0275\u0275text(8, "\u2014");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 82);
    \u0275\u0275text(10, "\u2B1C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 83);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_div_11_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r16);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.goHome());
    });
    \u0275\u0275text(12, "\u2715");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(13, "div", 65)(14, "div", 104);
    \u0275\u0275template(15, LaptopDeviceComponent_div_1_div_11_div_15_Template, 9, 6, "div", 105)(16, LaptopDeviceComponent_div_1_div_11_div_16_Template, 2, 0, "div", 106);
    \u0275\u0275elementEnd();
    \u0275\u0275template(17, LaptopDeviceComponent_div_1_div_11_div_17_Template, 9, 9, "div", 107)(18, LaptopDeviceComponent_div_1_div_11_ng_template_18_Template, 2, 0, "ng-template", null, 1, \u0275\u0275templateRefExtractor);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const filePreviewPlaceholder_r23 = \u0275\u0275reference(19);
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1("File Explorer \u2014 ", ctx_r2.ownerName, "");
    \u0275\u0275advance(10);
    \u0275\u0275property("ngForOf", ctx_r2.files);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.files.length === 0);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.selectedFile)("ngIfElse", filePreviewPlaceholder_r23);
  }
}
function LaptopDeviceComponent_div_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 7)(1, "div", 8)(2, "div", 9)(3, "div", 10);
    \u0275\u0275element(4, "div", 11);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 12);
    \u0275\u0275template(6, LaptopDeviceComponent_div_1_div_6_Template, 21, 0, "div", 13)(7, LaptopDeviceComponent_div_1_div_7_Template, 19, 4, "div", 14)(8, LaptopDeviceComponent_div_1_div_8_Template, 15, 1, "div", 14)(9, LaptopDeviceComponent_div_1_div_9_Template, 19, 3, "div", 14)(10, LaptopDeviceComponent_div_1_div_10_Template, 15, 1, "div", 14)(11, LaptopDeviceComponent_div_1_div_11_Template, 20, 5, "div", 14);
    \u0275\u0275elementStart(12, "div", 15);
    \u0275\u0275element(13, "div", 16);
    \u0275\u0275elementStart(14, "div", 17)(15, "div", 18);
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(16, "svg", 19);
    \u0275\u0275element(17, "rect", 20)(18, "rect", 21)(19, "rect", 22)(20, "rect", 23);
    \u0275\u0275elementEnd()();
    \u0275\u0275namespaceHTML();
    \u0275\u0275elementStart(21, "div", 24);
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(22, "svg", 25);
    \u0275\u0275element(23, "circle", 26)(24, "line", 27);
    \u0275\u0275elementEnd();
    \u0275\u0275namespaceHTML();
    \u0275\u0275elementStart(25, "span");
    \u0275\u0275text(26, "Search");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(27, "div", 28);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_Template_div_click_27_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.openApp("messages"));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "div", 29);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_Template_div_click_28_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.openApp("email"));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "div", 30);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_Template_div_click_29_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.openApp("photos"));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(30, "div", 31);
    \u0275\u0275listener("click", function LaptopDeviceComponent_div_1_Template_div_click_30_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.openApp("files"));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275element(31, "div", 32)(32, "div", 33);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "div", 34);
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(34, "svg", 35);
    \u0275\u0275element(35, "path", 36)(36, "path", 37)(37, "path", 38)(38, "circle", 39);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(39, "svg", 40);
    \u0275\u0275element(40, "path", 41)(41, "path", 42);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(42, "svg", 43);
    \u0275\u0275element(43, "rect", 44)(44, "rect", 45)(45, "rect", 46);
    \u0275\u0275elementEnd();
    \u0275\u0275namespaceHTML();
    \u0275\u0275elementStart(46, "div", 47)(47, "span", 48);
    \u0275\u0275text(48);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(49, "span", 49);
    \u0275\u0275text(50);
    \u0275\u0275elementEnd()()()()()()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(6);
    \u0275\u0275property("ngIf", ctx_r2.currentScreen === "home");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.currentScreen === "messages");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.currentScreen === "photos");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.currentScreen === "email");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.currentScreen === "notes");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.currentScreen === "files");
    \u0275\u0275advance(37);
    \u0275\u0275textInterpolate(ctx_r2.currentTime);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.currentDate);
  }
}
var LaptopDeviceComponent = class _LaptopDeviceComponent extends BaseDeviceComponent {
  route;
  deviceService;
  location;
  constructor(route, deviceService, location2) {
    super(route, deviceService, location2);
    this.route = route;
    this.deviceService = deviceService;
    this.location = location2;
  }
  // ── Live clock ──────────────────────────────────────────────────────────
  currentTime = "";
  currentDate = "";
  _clockInterval;
  ngOnInit() {
    super.ngOnInit();
    this._updateClock();
    this._clockInterval = setInterval(() => this._updateClock(), 1e4);
  }
  ngOnDestroy() {
    clearInterval(this._clockInterval);
    super.ngOnDestroy();
  }
  _updateClock() {
    const now = /* @__PURE__ */ new Date();
    this.currentTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
    this.currentDate = now.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric"
    });
  }
  // ── Keyboard layout ─────────────────────────────────────────────────────
  fnKeys = ["Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Del"];
  numRow = ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="];
  qwertyRow = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"];
  asdfRow = ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'"];
  zxcvRow = ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"];
  get selectedFileExtension() {
    const explicit = (this.selectedFile?.fileFormat ?? "").trim().toLowerCase();
    if (explicit)
      return explicit;
    const fileName = this.selectedFile?.name ?? "";
    const dotIndex = fileName.lastIndexOf(".");
    return dotIndex > -1 ? fileName.substring(dotIndex + 1).toLowerCase() : "";
  }
  get selectedSpreadsheetColumns() {
    const firstRow = this.selectedFile?.rows?.[0];
    return firstRow ? Object.keys(firstRow) : [];
  }
  get filePreviewTitle() {
    const fileName = this.selectedFile?.name ?? "Preview";
    const ext = this.selectedFileExtension;
    if (!ext)
      return fileName;
    return `${fileName} (${ext.toUpperCase()})`;
  }
  isFileType(file, extensions) {
    const ext = (file.fileFormat ?? "").trim().toLowerCase() || this.extractExtension(file.name);
    return extensions.includes(ext);
  }
  getFileIcon(file) {
    if (this.isFileType(file, ["doc", "docx", "txt"]))
      return "\u{1F4D8}";
    if (this.isFileType(file, ["pdf"]))
      return "\u{1F4D5}";
    if (this.isFileType(file, ["xls", "xlsx", "csv"]))
      return "\u{1F4D7}";
    if (file.type === "Folder")
      return "\u{1F4C1}";
    if (file.type === "Image" || file.type === "Screenshot")
      return "\u{1F5BC}";
    if (file.type === "Encrypted")
      return "\u{1F512}";
    return "\u{1F4C4}";
  }
  extractExtension(fileName) {
    const dotIndex = fileName.lastIndexOf(".");
    return dotIndex > -1 ? fileName.substring(dotIndex + 1).toLowerCase() : "";
  }
  static \u0275fac = function LaptopDeviceComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _LaptopDeviceComponent)(\u0275\u0275directiveInject(ActivatedRoute), \u0275\u0275directiveInject(DeviceService), \u0275\u0275directiveInject(Location));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _LaptopDeviceComponent, selectors: [["app-laptop-device"]], standalone: true, features: [\u0275\u0275InheritDefinitionFeature, \u0275\u0275StandaloneFeature], decls: 2, vars: 2, consts: [["emailPlaceholder", ""], ["filePreviewPlaceholder", ""], ["noSheetData", ""], ["class", "loading-container", 4, "ngIf"], ["class", "laptop-scene", 4, "ngIf"], [1, "loading-container"], [1, "loader"], [1, "laptop-scene"], [1, "laptop-lid"], [1, "laptop-bezel"], [1, "laptop-webcam"], [1, "laptop-webcam-dot"], [1, "win11-desktop"], ["class", "win11-desktop-icons", 4, "ngIf"], ["class", "windows-window", 4, "ngIf"], [1, "win11-taskbar"], [1, "win11-taskbar-left"], [1, "win11-taskbar-center"], ["title", "Start", 1, "win11-start-btn"], ["width", "18", "height", "18", "viewBox", "0 0 88 88", "xmlns", "http://www.w3.org/2000/svg"], ["x", "0", "y", "0", "width", "40", "height", "40", "fill", "#F25022"], ["x", "48", "y", "0", "width", "40", "height", "40", "fill", "#7FBA00"], ["x", "0", "y", "48", "width", "40", "height", "40", "fill", "#00A4EF"], ["x", "48", "y", "48", "width", "40", "height", "40", "fill", "#FFB900"], [1, "win11-search"], ["width", "14", "height", "14", "viewBox", "0 0 24 24", "fill", "none", "stroke", "rgba(255,255,255,0.7)", "stroke-width", "2.5", "stroke-linecap", "round"], ["cx", "11", "cy", "11", "r", "7"], ["x1", "16.5", "y1", "16.5", "x2", "22", "y2", "22"], ["title", "Messages", 1, "win11-taskbar-icon", "messages-win", 3, "click"], ["title", "Mail", 1, "win11-taskbar-icon", "mail-win", 3, "click"], ["title", "Photos", 1, "win11-taskbar-icon", "photos-win", 3, "click"], ["title", "File Explorer", 1, "win11-taskbar-icon", "files-win", 3, "click"], ["title", "Edge", 1, "win11-taskbar-icon", "edge-win"], ["title", "Microsoft Store", 1, "win11-taskbar-icon", "store-win"], [1, "win11-system-tray"], ["width", "16", "height", "16", "viewBox", "0 0 24 24", "fill", "none", "stroke", "rgba(255,255,255,0.85)", "stroke-width", "2", "stroke-linecap", "round"], ["d", "M5 12.55a11 11 0 0 1 14.08 0"], ["d", "M1.42 9a16 16 0 0 1 21.16 0"], ["d", "M8.53 16.11a6 6 0 0 1 6.95 0"], ["cx", "12", "cy", "20", "r", "1", "fill", "rgba(255,255,255,0.85)", "stroke", "none"], ["width", "16", "height", "16", "viewBox", "0 0 24 24", "fill", "rgba(255,255,255,0.85)"], ["d", "M11 5L6 9H2v6h4l5 4V5z"], ["d", "M15.54 8.46a5 5 0 0 1 0 7.07", "fill", "none", "stroke", "rgba(255,255,255,0.85)", "stroke-width", "2", "stroke-linecap", "round"], ["width", "22", "height", "14", "viewBox", "0 0 22 14", "fill", "none"], ["x", "0.5", "y", "1", "width", "19", "height", "12", "rx", "2", "stroke", "rgba(255,255,255,0.85)", "stroke-width", "1.2"], ["x", "20", "y", "4.5", "width", "1.5", "height", "5", "rx", "0.75", "fill", "rgba(255,255,255,0.6)"], ["x", "2", "y", "3", "width", "13", "height", "8", "rx", "1", "fill", "rgba(255,255,255,0.85)"], [1, "win11-time-block"], [1, "win11-time"], [1, "win11-date"], [1, "win11-desktop-icons"], [1, "win11-desktop-icon", 3, "click"], [1, "win11-icon-img", "messages-win"], [1, "win11-icon-img", "mail-win"], [1, "win11-icon-img", "photos-win"], [1, "win11-icon-img", "files-win"], [1, "win11-icon-img", "notes-win"], [1, "windows-window"], [1, "window-title-bar"], [1, "window-title-left"], [1, "win-app-icon", "messages-win", "small"], [1, "window-controls"], ["title", "Minimize", 1, "wc-min", 3, "click"], ["title", "Maximize", 1, "wc-max"], ["title", "Close", 1, "wc-close", 3, "click"], [1, "window-content"], [1, "windows-sidebar"], ["class", "windows-conv", 3, "click", 4, "ngFor", "ngForOf"], [1, "windows-chat-area"], ["class", "windows-messages", 4, "ngIf"], ["class", "chat-placeholder", 4, "ngIf"], [1, "windows-conv", 3, "click"], [1, "win-avatar"], [1, "win-conv-info"], [1, "windows-messages"], [3, "class", 4, "ngFor", "ngForOf"], [1, "win-bubble"], [1, "win-sender"], [1, "win-time"], [1, "chat-placeholder"], [1, "win-app-icon", "photos-win", "small"], [1, "wc-min", 3, "click"], [1, "wc-max"], [1, "wc-close", 3, "click"], [1, "window-photo-grid"], ["class", "win-photo", 3, "src", "alt", 4, "ngFor", "ngForOf"], [1, "win-photo", 3, "src", "alt"], [1, "win-app-icon", "mail-win", "small"], [1, "windows-email-list"], ["class", "windows-email", 3, "active", "click", 4, "ngFor", "ngForOf"], ["class", "windows-email-reader", 4, "ngIf", "ngIfElse"], [1, "windows-email", 3, "click"], [1, "email-header"], [1, "email-subject"], [1, "email-preview"], [1, "windows-email-reader"], [1, "reader-meta"], [4, "ngIf"], [1, "windows-email-reader", "windows-email-reader-placeholder"], [1, "win-app-icon", "notes-win", "small"], [1, "windows-notes"], ["class", "windows-note", 4, "ngFor", "ngForOf"], [1, "windows-note"], [1, "win-app-icon", "files-win", "small"], [1, "windows-files-list"], ["class", "win-file-item", 3, "active", "click", 4, "ngFor", "ngForOf"], ["class", "win-files-empty", 4, "ngIf"], ["class", "windows-file-preview", 4, "ngIf", "ngIfElse"], [1, "win-file-item", 3, "click"], [1, "win-file-icon"], [1, "win-file-info"], [1, "win-file-type"], ["class", "win-file-desc", 4, "ngIf"], [1, "win-file-desc"], [1, "win-files-empty"], [1, "windows-file-preview"], [1, "win-preview-header"], ["class", "win-preview-doc", 4, "ngIf"], ["class", "win-preview-pdf", 4, "ngIf"], ["class", "win-preview-sheet", 4, "ngIf"], [1, "win-preview-doc"], [1, "docx-ribbon"], [1, "win-preview-pdf"], [1, "pdf-toolbar"], [1, "pdf-page"], [1, "win-preview-sheet"], [1, "sheet-ribbon"], [4, "ngIf", "ngIfElse"], [4, "ngFor", "ngForOf"], [1, "win-preview-empty"], [1, "windows-file-preview", "windows-file-preview-placeholder"]], template: function LaptopDeviceComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275template(0, LaptopDeviceComponent_div_0_Template, 4, 0, "div", 3)(1, LaptopDeviceComponent_div_1_Template, 51, 8, "div", 4);
    }
    if (rf & 2) {
      \u0275\u0275property("ngIf", ctx.loading);
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", !ctx.loading);
    }
  }, dependencies: [CommonModule, NgForOf, NgIf], styles: ['@charset "UTF-8";\n\n\n\n.loading-container[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  background: #0a1628;\n  color: white;\n}\n.loader[_ngcontent-%COMP%] {\n  border: 4px solid rgba(255, 255, 255, 0.3);\n  border-top: 4px solid #0078d4;\n  border-radius: 50%;\n  width: 40px;\n  height: 40px;\n  animation: _ngcontent-%COMP%_spin 1s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  0% {\n    transform: rotate(0deg);\n  }\n  100% {\n    transform: rotate(360deg);\n  }\n}\n.laptop-scene[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  width: 100vw;\n  background:\n    radial-gradient(\n      ellipse at 40% 30%,\n      rgba(0, 80, 160, 0.45) 0%,\n      transparent 60%),\n    radial-gradient(\n      ellipse at 70% 80%,\n      rgba(0, 40, 100, 0.3) 0%,\n      transparent 50%),\n    linear-gradient(\n      180deg,\n      #06090f 0%,\n      #0c1120 100%);\n  position: fixed;\n  inset: 0;\n  overflow: hidden;\n  gap: 0;\n}\n.laptop-lid[_ngcontent-%COMP%] {\n  position: relative;\n  width: min(84vw, 960px);\n  aspect-ratio: 16/10;\n  background:\n    linear-gradient(\n      170deg,\n      #3a3a3a 0%,\n      #282828 60%,\n      #1e1e1e 100%);\n  border-radius: 10px 10px 0 0;\n  box-shadow:\n    0 -2px 0 0 rgba(255, 255, 255, 0.06),\n    0 0 40px 8px rgba(0, 0, 0, 0.85),\n    0 2px 0 0 #0a0a0a;\n}\n.laptop-lid[_ngcontent-%COMP%]::after {\n  content: "LENOVO";\n  position: absolute;\n  bottom: 10px;\n  left: 50%;\n  transform: translateX(-50%);\n  font-size: 9px;\n  font-weight: 700;\n  letter-spacing: 3px;\n  color: rgba(255, 255, 255, 0.25);\n  font-family: "Roboto", sans-serif;\n}\n.laptop-bezel[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 8px;\n  background: #0a0a0a;\n  border-radius: 5px;\n  overflow: hidden;\n  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.9);\n  display: flex;\n  flex-direction: column;\n}\n.laptop-webcam[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 2px;\n  left: 50%;\n  transform: translateX(-50%);\n  width: 20px;\n  height: 6px;\n  background: #111;\n  border-radius: 0 0 4px 4px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 200;\n}\n.laptop-webcam-dot[_ngcontent-%COMP%] {\n  width: 5px;\n  height: 5px;\n  border-radius: 50%;\n  background: #1a1a1a;\n  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);\n}\n.laptop-hinge[_ngcontent-%COMP%] {\n  width: min(84vw, 960px);\n  height: 6px;\n  background:\n    linear-gradient(\n      180deg,\n      #1c1c1c 0%,\n      #303030 40%,\n      #1a1a1a 100%);\n  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.08), 0 3px 6px rgba(0, 0, 0, 0.8);\n  position: relative;\n  z-index: 10;\n}\n.laptop-base[_ngcontent-%COMP%] {\n  width: min(84vw, 960px);\n  height: 52px;\n  background:\n    linear-gradient(\n      180deg,\n      #2e2e2e 0%,\n      #252525 50%,\n      #1e1e1e 100%);\n  border-radius: 0 0 12px 12px;\n  box-shadow: 0 4px 0 0 #111, 0 8px 20px rgba(0, 0, 0, 0.9);\n  position: relative;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 5px 0 0;\n  gap: 2px;\n}\n.laptop-keyboard[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  width: 92%;\n}\n.kb-row[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 2px;\n  justify-content: center;\n}\n.kb-key[_ngcontent-%COMP%] {\n  height: 7px;\n  min-width: 10px;\n  padding: 0 3px;\n  background:\n    linear-gradient(\n      180deg,\n      #3a3a3a 0%,\n      #2c2c2c 100%);\n  border-radius: 1.5px;\n  box-shadow: 0 1px 0 #111;\n  font-size: 4px;\n  color: rgba(255, 255, 255, 0.4);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  flex: 1;\n}\n.kb-fn-row[_ngcontent-%COMP%]   .kb-key[_ngcontent-%COMP%] {\n  height: 5px;\n  opacity: 0.6;\n}\n.kb-fn[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.kb-wide[_ngcontent-%COMP%] {\n  flex: 1.8;\n}\n.kb-tab[_ngcontent-%COMP%] {\n  flex: 1.4;\n}\n.kb-caps[_ngcontent-%COMP%] {\n  flex: 1.6;\n}\n.kb-enter[_ngcontent-%COMP%] {\n  flex: 1.6;\n}\n.kb-shift-l[_ngcontent-%COMP%] {\n  flex: 2.1;\n}\n.kb-shift-r[_ngcontent-%COMP%] {\n  flex: 2.8;\n}\n.kb-ctrl[_ngcontent-%COMP%] {\n  flex: 1.3;\n}\n.kb-fn2[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.kb-win-key[_ngcontent-%COMP%] {\n  flex: 1.1;\n  padding: 0;\n}\n.kb-alt[_ngcontent-%COMP%] {\n  flex: 1.2;\n}\n.kb-space[_ngcontent-%COMP%] {\n  flex: 5;\n}\n.kb-arrow[_ngcontent-%COMP%] {\n  flex: 0.9;\n  font-size: 3px;\n}\n.kb-arrow-v[_ngcontent-%COMP%] {\n  flex: 0.9;\n  font-size: 3px;\n}\n.laptop-touchpad[_ngcontent-%COMP%] {\n  width: 28%;\n  height: 8px;\n  background:\n    linear-gradient(\n      180deg,\n      #313131 0%,\n      #252525 100%);\n  border-radius: 2px;\n  border: 0.5px solid #1a1a1a;\n  position: relative;\n  display: flex;\n  align-items: flex-end;\n  justify-content: center;\n  padding-bottom: 1px;\n}\n.touchpad-btn-line[_ngcontent-%COMP%] {\n  width: 50%;\n  height: 0.5px;\n  background: rgba(255, 255, 255, 0.1);\n}\n.lenovo-base-logo[_ngcontent-%COMP%] {\n  position: absolute;\n  right: 18px;\n  bottom: 3px;\n  font-size: 5px;\n  font-weight: 700;\n  letter-spacing: 1.5px;\n  color: rgba(255, 255, 255, 0.18);\n  font-family: "Roboto", sans-serif;\n}\n.win11-desktop[_ngcontent-%COMP%] {\n  flex: 1;\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n  background:\n    radial-gradient(\n      ellipse at 65% 45%,\n      rgba(0, 80, 210, 0.75) 0%,\n      transparent 45%),\n    radial-gradient(\n      ellipse at 35% 55%,\n      rgba(0, 55, 160, 0.65) 0%,\n      transparent 40%),\n    radial-gradient(\n      ellipse at 80% 20%,\n      rgba(0, 100, 220, 0.5) 0%,\n      transparent 35%),\n    radial-gradient(\n      ellipse at 20% 80%,\n      rgba(0, 40, 120, 0.7) 0%,\n      transparent 40%),\n    radial-gradient(\n      ellipse at 50% 85%,\n      rgba(0, 60, 180, 0.55) 0%,\n      transparent 45%),\n    linear-gradient(\n      170deg,\n      #020b1a 0%,\n      #041230 35%,\n      #050f28 65%,\n      #03091c 100%);\n}\n.win11-desktop-icons[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 16px;\n  left: 16px;\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n  z-index: 5;\n}\n.win11-desktop-icon[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 4px;\n  cursor: pointer;\n  padding: 6px;\n  border-radius: 6px;\n  width: 64px;\n  transition: background 0.15s;\n}\n.win11-desktop-icon[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.12);\n}\n.win11-desktop-icon[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  color: rgba(255, 255, 255, 0.92);\n  font-size: 10px;\n  font-family: "Segoe UI", sans-serif;\n  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);\n  text-align: center;\n  line-height: 1.2;\n}\n.win11-icon-img[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border-radius: 8px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 22px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);\n  background-size: contain;\n}\n.win-app-icon[_ngcontent-%COMP%] {\n  width: 18px;\n  height: 18px;\n  border-radius: 4px;\n  flex-shrink: 0;\n}\n.win-app-icon.small[_ngcontent-%COMP%] {\n  width: 16px;\n  height: 16px;\n}\n.win11-taskbar-icon[_ngcontent-%COMP%] {\n  width: 32px;\n  height: 32px;\n  border-radius: 6px;\n  cursor: pointer;\n  transition: background 0.15s, transform 0.1s;\n  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);\n  background-size: contain;\n  position: relative;\n}\n.win11-taskbar-icon[_ngcontent-%COMP%]:hover {\n  transform: translateY(-2px);\n  background-color: rgba(255, 255, 255, 0.12) !important;\n}\n.win11-taskbar-icon.active[_ngcontent-%COMP%]::after {\n  content: "";\n  position: absolute;\n  bottom: -4px;\n  left: 50%;\n  transform: translateX(-50%);\n  width: 3px;\n  height: 3px;\n  border-radius: 50%;\n  background: rgba(255, 255, 255, 0.8);\n}\n.messages-win[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #6264a7 0%,\n      #464775 100%);\n}\n.messages-win[_ngcontent-%COMP%]::after {\n  content: "\\1f4ac";\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: inherit;\n  width: 100%;\n  height: 100%;\n}\n.mail-win[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #0072c6 0%,\n      #004f8b 100%);\n}\n.mail-win[_ngcontent-%COMP%]::after {\n  content: "\\2709\\fe0f";\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: inherit;\n  width: 100%;\n  height: 100%;\n}\n.photos-win[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #f7a01a 0%,\n      #f9563a 40%,\n      #c4195d 70%,\n      #7d27ad 100%);\n}\n.photos-win[_ngcontent-%COMP%]::after {\n  content: "\\1f5bc\\fe0f";\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: inherit;\n  width: 100%;\n  height: 100%;\n}\n.files-win[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #ffce47 0%,\n      #f0a500 100%);\n}\n.files-win[_ngcontent-%COMP%]::after {\n  content: "\\1f4c1";\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: inherit;\n  width: 100%;\n  height: 100%;\n}\n.notes-win[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #29abd4 0%,\n      #1472b7 100%);\n}\n.notes-win[_ngcontent-%COMP%]::after {\n  content: "\\1f4dd";\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: inherit;\n  width: 100%;\n  height: 100%;\n}\n.edge-win[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #3277bc 0%,\n      #138d8e 60%,\n      #71d273 100%);\n}\n.edge-win[_ngcontent-%COMP%]::after {\n  content: "\\1f310";\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: inherit;\n  width: 100%;\n  height: 100%;\n}\n.store-win[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #0078d4 0%,\n      #00bcf2 100%);\n}\n.store-win[_ngcontent-%COMP%]::after {\n  content: "\\1f6cd\\fe0f";\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: inherit;\n  width: 100%;\n  height: 100%;\n}\n.win11-icon-img[_ngcontent-%COMP%] {\n  font-size: 22px;\n}\n.win11-taskbar-icon[_ngcontent-%COMP%] {\n  font-size: 16px;\n}\n.win-app-icon[_ngcontent-%COMP%] {\n  font-size: 10px;\n}\n.windows-window[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n  width: 86%;\n  height: 72%;\n  background: #202020;\n  border-radius: 10px;\n  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08), 0 16px 48px rgba(0, 0, 0, 0.7);\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  z-index: 50;\n  border: 1px solid rgba(255, 255, 255, 0.06);\n}\n.window-title-bar[_ngcontent-%COMP%] {\n  background: #2d2d2d;\n  color: rgba(255, 255, 255, 0.9);\n  padding: 0 0 0 12px;\n  height: 34px;\n  min-height: 34px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.06);\n  -webkit-user-select: none;\n  user-select: none;\n}\n.window-title-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n.window-title-left[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  font-size: 12px;\n  font-weight: 400;\n  font-family: "Segoe UI", sans-serif;\n  color: rgba(255, 255, 255, 0.85);\n}\n.window-controls[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: stretch;\n  height: 100%;\n}\n.window-controls[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n  background: transparent;\n  border: none;\n  width: 46px;\n  height: 100%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  font-size: 11px;\n  color: rgba(255, 255, 255, 0.75);\n  transition: background 0.12s;\n  font-family: "Segoe UI", sans-serif;\n}\n.window-controls[_ngcontent-%COMP%]   .wc-min[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.08);\n}\n.window-controls[_ngcontent-%COMP%]   .wc-max[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.08);\n}\n.window-controls[_ngcontent-%COMP%]   .wc-close[_ngcontent-%COMP%]:hover {\n  background: #c42b1c;\n  color: #fff;\n}\n.window-content[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  overflow: hidden;\n  background: #1c1c1c;\n}\n.chat-placeholder[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 100%;\n  color: rgba(255, 255, 255, 0.3);\n  font-size: 13px;\n  font-family: "Segoe UI", sans-serif;\n}\n.windows-sidebar[_ngcontent-%COMP%] {\n  width: 240px;\n  background: #252525;\n  border-right: 1px solid rgba(255, 255, 255, 0.05);\n  overflow-y: auto;\n}\n.windows-sidebar[_ngcontent-%COMP%]::-webkit-scrollbar {\n  width: 6px;\n}\n.windows-sidebar[_ngcontent-%COMP%]::-webkit-scrollbar-thumb {\n  background: #444;\n  border-radius: 3px;\n}\n.windows-conv[_ngcontent-%COMP%] {\n  padding: 10px 14px;\n  display: flex;\n  gap: 10px;\n  cursor: pointer;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.04);\n  transition: background 0.12s;\n}\n.windows-conv[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.06);\n}\n.win-avatar[_ngcontent-%COMP%] {\n  width: 36px;\n  height: 36px;\n  border-radius: 50%;\n  background:\n    linear-gradient(\n      135deg,\n      #0078d4,\n      #005a9e);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 18px;\n  flex-shrink: 0;\n}\n.win-conv-info[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n}\n.win-conv-info[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] {\n  font-size: 13px;\n  display: block;\n  margin-bottom: 2px;\n  color: rgba(255, 255, 255, 0.9);\n  font-family: "Segoe UI", sans-serif;\n}\n.win-conv-info[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 11px;\n  color: rgba(255, 255, 255, 0.45);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-family: "Segoe UI", sans-serif;\n}\n.windows-chat-area[_ngcontent-%COMP%] {\n  flex: 1;\n  background: #1a1a1a;\n  padding: 16px;\n  overflow-y: auto;\n}\n.windows-chat-area[_ngcontent-%COMP%]::-webkit-scrollbar {\n  width: 6px;\n}\n.windows-chat-area[_ngcontent-%COMP%]::-webkit-scrollbar-thumb {\n  background: #444;\n  border-radius: 3px;\n}\n.windows-messages[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n}\n.win-msg-in[_ngcontent-%COMP%], \n.win-msg-out[_ngcontent-%COMP%] {\n  display: flex;\n  max-width: 70%;\n}\n.win-msg-out[_ngcontent-%COMP%] {\n  margin-left: auto;\n}\n.win-bubble[_ngcontent-%COMP%] {\n  padding: 10px 14px;\n  border-radius: 8px;\n  background: #2d2d2d;\n  font-family: "Segoe UI", sans-serif;\n  font-size: 12px;\n  color: rgba(255, 255, 255, 0.85);\n}\n.win-msg-out[_ngcontent-%COMP%]   .win-bubble[_ngcontent-%COMP%] {\n  background: #0078d4;\n  color: white;\n}\n.win-sender[_ngcontent-%COMP%] {\n  font-weight: 600;\n  font-size: 11px;\n  margin-bottom: 3px;\n  opacity: 0.7;\n}\n.win-time[_ngcontent-%COMP%] {\n  font-size: 10px;\n  margin-top: 4px;\n  opacity: 0.5;\n}\n.window-photo-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));\n  gap: 6px;\n  padding: 12px;\n  overflow-y: auto;\n  background: #1c1c1c;\n}\n.window-photo-grid[_ngcontent-%COMP%]::-webkit-scrollbar {\n  width: 6px;\n}\n.window-photo-grid[_ngcontent-%COMP%]::-webkit-scrollbar-thumb {\n  background: #444;\n  border-radius: 3px;\n}\n.win-photo[_ngcontent-%COMP%] {\n  width: 100%;\n  aspect-ratio: 1;\n  object-fit: cover;\n  border-radius: 4px;\n  cursor: pointer;\n  transition: transform 0.15s, box-shadow 0.15s;\n}\n.win-photo[_ngcontent-%COMP%]:hover {\n  transform: scale(1.04);\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);\n}\n.windows-email-list[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 12px;\n  overflow-y: auto;\n  background: #1c1c1c;\n}\n.windows-email-list[_ngcontent-%COMP%]::-webkit-scrollbar {\n  width: 6px;\n}\n.windows-email-list[_ngcontent-%COMP%]::-webkit-scrollbar-thumb {\n  background: #444;\n  border-radius: 3px;\n}\n.windows-email[_ngcontent-%COMP%] {\n  padding: 12px 14px;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.05);\n  cursor: pointer;\n  transition: background 0.12s;\n  border-radius: 6px;\n  margin-bottom: 2px;\n}\n.windows-email[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.05);\n}\n.windows-email.active[_ngcontent-%COMP%] {\n  background: rgba(0, 120, 212, 0.24);\n}\n.email-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 4px;\n  font-family: "Segoe UI", sans-serif;\n}\n.email-header[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] {\n  font-size: 13px;\n  color: rgba(255, 255, 255, 0.9);\n}\n.email-header[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  font-size: 11px;\n  color: rgba(255, 255, 255, 0.4);\n}\n.email-subject[_ngcontent-%COMP%] {\n  font-weight: 600;\n  margin-bottom: 3px;\n  font-size: 12px;\n  font-family: "Segoe UI", sans-serif;\n  color: rgba(255, 255, 255, 0.8);\n}\n.email-preview[_ngcontent-%COMP%] {\n  color: rgba(255, 255, 255, 0.4);\n  font-size: 11px;\n  margin: 0;\n  font-family: "Segoe UI", sans-serif;\n}\n.windows-email-reader[_ngcontent-%COMP%] {\n  flex: 1;\n  border-left: 1px solid rgba(255, 255, 255, 0.08);\n  background: #181818;\n  padding: 14px;\n  overflow: auto;\n  color: rgba(255, 255, 255, 0.85);\n  font-family: "Segoe UI", sans-serif;\n}\n.windows-email-reader[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0 0 10px;\n  font-size: 15px;\n  color: #fff;\n}\n.windows-email-reader[_ngcontent-%COMP%]   pre[_ngcontent-%COMP%] {\n  margin: 10px 0 0;\n  white-space: pre-wrap;\n  font-family: "Segoe UI", sans-serif;\n  font-size: 12px;\n  line-height: 1.5;\n  color: rgba(255, 255, 255, 0.82);\n}\n.reader-meta[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  font-size: 11px;\n  color: rgba(255, 255, 255, 0.6);\n}\n.windows-email-reader-placeholder[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: rgba(255, 255, 255, 0.35);\n}\n.windows-notes[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));\n  gap: 12px;\n  padding: 14px;\n  overflow-y: auto;\n  background: #1c1c1c;\n}\n.windows-notes[_ngcontent-%COMP%]::-webkit-scrollbar {\n  width: 6px;\n}\n.windows-notes[_ngcontent-%COMP%]::-webkit-scrollbar-thumb {\n  background: #444;\n  border-radius: 3px;\n}\n.windows-note[_ngcontent-%COMP%] {\n  background: #2a2a18;\n  border: 1px solid rgba(255, 220, 60, 0.12);\n  padding: 14px;\n  border-radius: 6px;\n  font-family:\n    "Segoe UI",\n    Consolas,\n    sans-serif;\n}\n.windows-note[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%] {\n  margin: 0 0 6px;\n  font-size: 13px;\n  color: rgba(255, 235, 100, 0.9);\n}\n.windows-note[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0 0 6px;\n  font-size: 12px;\n  color: rgba(255, 255, 255, 0.7);\n  line-height: 1.5;\n}\n.windows-note[_ngcontent-%COMP%]   small[_ngcontent-%COMP%] {\n  color: rgba(255, 255, 255, 0.3);\n  font-size: 10px;\n}\n.windows-files-list[_ngcontent-%COMP%] {\n  padding: 12px;\n  overflow-y: auto;\n  max-height: 100%;\n  background: #1c1c1c;\n  flex: 0 0 42%;\n  border-right: 1px solid rgba(255, 255, 255, 0.07);\n}\n.windows-files-list[_ngcontent-%COMP%]::-webkit-scrollbar {\n  width: 6px;\n}\n.windows-files-list[_ngcontent-%COMP%]::-webkit-scrollbar-thumb {\n  background: #444;\n  border-radius: 3px;\n}\n.win-file-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: flex-start;\n  gap: 12px;\n  padding: 10px 12px;\n  border-radius: 6px;\n  transition: background 0.12s;\n  cursor: pointer;\n}\n.win-file-item[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.05);\n}\n.win-file-item.active[_ngcontent-%COMP%] {\n  background: rgba(0, 120, 212, 0.28);\n}\n.win-file-icon[_ngcontent-%COMP%] {\n  font-size: 22px;\n  flex-shrink: 0;\n  line-height: 1;\n}\n.win-file-info[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n}\n.win-file-info[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] {\n  display: block;\n  margin-bottom: 3px;\n  font-size: 13px;\n  color: rgba(255, 255, 255, 0.88);\n  font-family: "Segoe UI", sans-serif;\n}\n.win-file-type[_ngcontent-%COMP%] {\n  display: inline-block;\n  font-size: 10px;\n  color: rgba(255, 255, 255, 0.4);\n  background: rgba(255, 255, 255, 0.07);\n  padding: 1px 7px;\n  border-radius: 3px;\n  margin-bottom: 3px;\n  font-family: "Segoe UI", sans-serif;\n}\n.win-file-desc[_ngcontent-%COMP%] {\n  margin: 3px 0 0;\n  font-size: 11px;\n  color: rgba(255, 255, 255, 0.45);\n  font-family: "Segoe UI", sans-serif;\n  line-height: 1.4;\n}\n.win-files-empty[_ngcontent-%COMP%] {\n  color: rgba(255, 255, 255, 0.3);\n  padding: 24px;\n  text-align: center;\n  font-family: "Segoe UI", sans-serif;\n}\n.windows-file-preview[_ngcontent-%COMP%] {\n  flex: 1;\n  background: #171717;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n.windows-file-preview-placeholder[_ngcontent-%COMP%] {\n  align-items: center;\n  justify-content: center;\n  color: rgba(255, 255, 255, 0.4);\n  font-family: "Segoe UI", sans-serif;\n  font-size: 13px;\n}\n.win-preview-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 10px 14px;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.08);\n  background: #202020;\n  font-family: "Segoe UI", sans-serif;\n}\n.win-preview-header[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] {\n  color: rgba(255, 255, 255, 0.9);\n  font-size: 12px;\n}\n.win-preview-header[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  color: rgba(255, 255, 255, 0.45);\n  font-size: 11px;\n}\n.win-preview-doc[_ngcontent-%COMP%], \n.win-preview-pdf[_ngcontent-%COMP%], \n.win-preview-sheet[_ngcontent-%COMP%] {\n  flex: 1;\n  overflow: auto;\n}\n.docx-ribbon[_ngcontent-%COMP%], \n.sheet-ribbon[_ngcontent-%COMP%], \n.pdf-toolbar[_ngcontent-%COMP%] {\n  height: 34px;\n  display: flex;\n  align-items: center;\n  padding: 0 12px;\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.3px;\n  font-family: "Segoe UI", sans-serif;\n}\n.docx-ribbon[_ngcontent-%COMP%] {\n  background: #0f3f73;\n  color: #fff;\n}\n.sheet-ribbon[_ngcontent-%COMP%] {\n  background: #1d6f42;\n  color: #fff;\n}\n.pdf-toolbar[_ngcontent-%COMP%] {\n  background: #4d4d4d;\n  color: #fff;\n}\n.win-preview-doc[_ngcontent-%COMP%] {\n  background: #f6f6f6;\n  color: #202020;\n}\n.win-preview-doc[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 16px 24px 8px;\n  font-size: 18px;\n  font-family: "Segoe UI", sans-serif;\n}\n.win-preview-doc[_ngcontent-%COMP%]   pre[_ngcontent-%COMP%] {\n  margin: 0 24px 24px;\n  white-space: pre-wrap;\n  font-family:\n    "Calibri",\n    "Segoe UI",\n    sans-serif;\n  font-size: 14px;\n  line-height: 1.5;\n}\n.win-preview-pdf[_ngcontent-%COMP%] {\n  background: #2a2a2a;\n  padding: 18px;\n}\n.pdf-page[_ngcontent-%COMP%] {\n  width: min(92%, 520px);\n  margin: 0 auto;\n  background: #fff;\n  color: #222;\n  min-height: 260px;\n  border-radius: 4px;\n  padding: 18px;\n  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);\n}\n.pdf-page[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%] {\n  margin: 0 0 10px;\n  font-size: 16px;\n  font-family: "Segoe UI", sans-serif;\n}\n.pdf-page[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 13px;\n  line-height: 1.45;\n  white-space: pre-wrap;\n}\n.win-preview-sheet[_ngcontent-%COMP%] {\n  background: #f3f8f4;\n  padding: 12px;\n}\n.win-preview-sheet[_ngcontent-%COMP%]   table[_ngcontent-%COMP%] {\n  width: 100%;\n  border-collapse: collapse;\n  font-size: 12px;\n  background: #fff;\n}\n.win-preview-sheet[_ngcontent-%COMP%]   th[_ngcontent-%COMP%], \n.win-preview-sheet[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n  border: 1px solid #d4ded6;\n  padding: 6px 8px;\n  text-align: left;\n  font-family: "Segoe UI", sans-serif;\n}\n.win-preview-sheet[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] {\n  background: #e6f1e8;\n  font-weight: 600;\n}\n.win-preview-empty[_ngcontent-%COMP%] {\n  padding: 20px;\n  color: #385c41;\n  font-family: "Segoe UI", sans-serif;\n}\n.win11-taskbar[_ngcontent-%COMP%] {\n  position: absolute;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  height: 44px;\n  background: rgba(20, 20, 20, 0.82);\n  backdrop-filter: blur(24px) saturate(160%);\n  -webkit-backdrop-filter: blur(24px) saturate(160%);\n  border-top: 1px solid rgba(255, 255, 255, 0.06);\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0 12px;\n  z-index: 200;\n}\n.win11-taskbar-left[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.win11-taskbar-center[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 4px;\n  align-items: center;\n}\n.win11-start-btn[_ngcontent-%COMP%] {\n  width: 36px;\n  height: 36px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  border-radius: 6px;\n  cursor: pointer;\n  transition: background 0.15s;\n  margin-right: 4px;\n}\n.win11-start-btn[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.1);\n}\n.win11-search[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  height: 30px;\n  padding: 0 14px;\n  background: rgba(255, 255, 255, 0.06);\n  border: 1px solid rgba(255, 255, 255, 0.08);\n  border-radius: 20px;\n  cursor: pointer;\n  transition: background 0.15s;\n  margin-right: 8px;\n}\n.win11-search[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.1);\n}\n.win11-search[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: rgba(255, 255, 255, 0.55);\n  font-family: "Segoe UI", sans-serif;\n}\n.win11-system-tray[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  flex: 1;\n  justify-content: flex-end;\n}\n.win11-system-tray[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  opacity: 0.8;\n}\n.win11-time-block[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: flex-end;\n  gap: 0;\n  cursor: pointer;\n}\n.win11-time[_ngcontent-%COMP%] {\n  font-size: 12px;\n  font-weight: 400;\n  color: rgba(255, 255, 255, 0.88);\n  font-family: "Segoe UI", sans-serif;\n  line-height: 1.2;\n}\n.win11-date[_ngcontent-%COMP%] {\n  font-size: 10px;\n  color: rgba(255, 255, 255, 0.55);\n  font-family: "Segoe UI", sans-serif;\n  line-height: 1.2;\n}\n/*# sourceMappingURL=laptop-device.component.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(LaptopDeviceComponent, { className: "LaptopDeviceComponent", filePath: "src\\app\\components\\devices\\laptop\\laptop-device.component.ts", lineNumber: 15 });
})();

// src/app/services/chatbot.service.ts
var ChatbotService = class _ChatbotService {
  http;
  apiBase = `${environment.apiUrl}/api/chatbot`;
  constructor(http) {
    this.http = http;
  }
  sendMessage(gameId, request) {
    return this.http.post(`${this.apiBase}/${gameId}/message`, request);
  }
  static \u0275fac = function ChatbotService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ChatbotService)(\u0275\u0275inject(HttpClient));
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ChatbotService, factory: _ChatbotService.\u0275fac, providedIn: "root" });
};

// src/app/components/chatbot/chatbot.component.ts
var _c02 = ["messagesContainer"];
function ChatbotComponent_span_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 19);
    \u0275\u0275text(1, "\u{1F575}\uFE0F");
    \u0275\u0275elementEnd();
  }
}
function ChatbotComponent_span_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 20);
    \u0275\u0275text(1, "\u2715");
    \u0275\u0275elementEnd();
  }
}
function ChatbotComponent_div_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 21)(1, "div", 22);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 23);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const bubble_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("chatbot-bubble--user", bubble_r2.role === "user")("chatbot-bubble--assistant", bubble_r2.role === "assistant");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(bubble_r2.content);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.formatTime(bubble_r2.timestamp));
  }
}
function ChatbotComponent_div_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 24)(1, "div", 25);
    \u0275\u0275element(2, "span")(3, "span")(4, "span");
    \u0275\u0275elementEnd()();
  }
}
function ChatbotComponent_span_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1, "\u27A4");
    \u0275\u0275elementEnd();
  }
}
function ChatbotComponent_span_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 26);
  }
}
var ChatbotComponent = class _ChatbotComponent {
  chatbotService;
  gameId = 0;
  messagesContainer;
  isOpen = false;
  inputMessage = "";
  isLoading = false;
  bubbles = [];
  shouldScrollToBottom = false;
  constructor(chatbotService) {
    this.chatbotService = chatbotService;
  }
  ngOnChanges(changes) {
    if (changes["gameId"]) {
      this.bubbles = [];
    }
  }
  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }
  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.bubbles.length === 0) {
      this.addWelcomeBubble();
    }
    if (this.isOpen) {
      this.shouldScrollToBottom = true;
    }
  }
  addWelcomeBubble() {
    this.bubbles.push({
      role: "assistant",
      content: "\u{1F575}\uFE0F Salut, investigator! Sunt asistentul tau misterios. Pune-mi orice intrebare despre joc si iti voi oferi indicii\u2026 fara spoilere.",
      timestamp: /* @__PURE__ */ new Date()
    });
  }
  sendMessage() {
    const text = this.inputMessage.trim();
    if (!text || this.isLoading || !this.gameId)
      return;
    this.bubbles.push({ role: "user", content: text, timestamp: /* @__PURE__ */ new Date() });
    this.inputMessage = "";
    this.isLoading = true;
    this.shouldScrollToBottom = true;
    const history2 = this.bubbles.slice(0, -1).map((b) => ({ role: b.role, content: b.content }));
    this.chatbotService.sendMessage(this.gameId, {
      message: text,
      conversationHistory: history2
    }).subscribe({
      next: (res) => {
        this.bubbles.push({ role: "assistant", content: res.reply, timestamp: /* @__PURE__ */ new Date() });
        this.isLoading = false;
        this.shouldScrollToBottom = true;
      },
      error: () => {
        this.bubbles.push({
          role: "assistant",
          content: "\u26A0\uFE0F Umbrele sunt prea dense acum\u2026 incearca din nou.",
          timestamp: /* @__PURE__ */ new Date()
        });
        this.isLoading = false;
        this.shouldScrollToBottom = true;
      }
    });
  }
  onKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
  scrollToBottom() {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el)
        el.scrollTop = el.scrollHeight;
    } catch {
    }
  }
  formatTime(date) {
    return date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  }
  static \u0275fac = function ChatbotComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ChatbotComponent)(\u0275\u0275directiveInject(ChatbotService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ChatbotComponent, selectors: [["app-chatbot"]], viewQuery: function ChatbotComponent_Query(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275viewQuery(_c02, 5);
    }
    if (rf & 2) {
      let _t;
      \u0275\u0275queryRefresh(_t = \u0275\u0275loadQuery()) && (ctx.messagesContainer = _t.first);
    }
  }, inputs: { gameId: "gameId" }, standalone: true, features: [\u0275\u0275NgOnChangesFeature, \u0275\u0275StandaloneFeature], decls: 22, vars: 13, consts: [["messagesContainer", ""], [1, "chatbot-wrapper"], ["title", "Asistent misterios", "id", "chatbot-fab-btn", "aria-label", "Deschide asistentul chatbot", 1, "chatbot-fab", 3, "click"], ["class", "chatbot-fab__icon", 4, "ngIf"], ["class", "chatbot-fab__icon chatbot-fab__icon--close", 4, "ngIf"], ["role", "dialog", "aria-label", "Chat asistent misterios", 1, "chatbot-panel"], [1, "chatbot-panel__header"], [1, "chatbot-panel__header-icon"], [1, "chatbot-panel__header-text"], [1, "chatbot-panel__title"], [1, "chatbot-panel__subtitle"], [1, "chatbot-panel__messages"], ["class", "chatbot-bubble", 3, "chatbot-bubble--user", "chatbot-bubble--assistant", 4, "ngFor", "ngForOf"], ["class", "chatbot-bubble chatbot-bubble--assistant chatbot-bubble--typing", 4, "ngIf"], [1, "chatbot-panel__input-area"], ["placeholder", "Pune o \xEEntrebare despre joc\u2026", "rows", "2", "id", "chatbot-input", "aria-label", "Mesaj pentru asistent", 1, "chatbot-panel__input", 3, "ngModelChange", "keydown", "ngModel", "disabled"], ["id", "chatbot-send-btn", "aria-label", "Trimite mesaj", 1, "chatbot-panel__send-btn", 3, "click", "disabled"], [4, "ngIf"], ["class", "spinner", 4, "ngIf"], [1, "chatbot-fab__icon"], [1, "chatbot-fab__icon", "chatbot-fab__icon--close"], [1, "chatbot-bubble"], [1, "chatbot-bubble__content"], [1, "chatbot-bubble__time"], [1, "chatbot-bubble", "chatbot-bubble--assistant", "chatbot-bubble--typing"], [1, "chatbot-bubble__content", "typing-dots"], [1, "spinner"]], template: function ChatbotComponent_Template(rf, ctx) {
    if (rf & 1) {
      const _r1 = \u0275\u0275getCurrentView();
      \u0275\u0275elementStart(0, "div", 1)(1, "button", 2);
      \u0275\u0275listener("click", function ChatbotComponent_Template_button_click_1_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.toggleChat());
      });
      \u0275\u0275template(2, ChatbotComponent_span_2_Template, 2, 0, "span", 3)(3, ChatbotComponent_span_3_Template, 2, 0, "span", 4);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "div", 5)(5, "div", 6)(6, "div", 7);
      \u0275\u0275text(7, "\u{1F50D}");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(8, "div", 8)(9, "span", 9);
      \u0275\u0275text(10, "Asistent Misterios");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(11, "span", 10);
      \u0275\u0275text(12, "Indicii f\u0103r\u0103 spoilere");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(13, "div", 11, 0);
      \u0275\u0275template(15, ChatbotComponent_div_15_Template, 5, 6, "div", 12)(16, ChatbotComponent_div_16_Template, 5, 0, "div", 13);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(17, "div", 14)(18, "textarea", 15);
      \u0275\u0275twoWayListener("ngModelChange", function ChatbotComponent_Template_textarea_ngModelChange_18_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.inputMessage, $event) || (ctx.inputMessage = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275listener("keydown", function ChatbotComponent_Template_textarea_keydown_18_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onKeyDown($event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(19, "button", 16);
      \u0275\u0275listener("click", function ChatbotComponent_Template_button_click_19_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.sendMessage());
      });
      \u0275\u0275template(20, ChatbotComponent_span_20_Template, 2, 0, "span", 17)(21, ChatbotComponent_span_21_Template, 1, 0, "span", 18);
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      \u0275\u0275advance();
      \u0275\u0275classProp("chatbot-fab--open", ctx.isOpen);
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", !ctx.isOpen);
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", ctx.isOpen);
      \u0275\u0275advance();
      \u0275\u0275classProp("chatbot-panel--visible", ctx.isOpen);
      \u0275\u0275advance(11);
      \u0275\u0275property("ngForOf", ctx.bubbles);
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", ctx.isLoading);
      \u0275\u0275advance(2);
      \u0275\u0275twoWayProperty("ngModel", ctx.inputMessage);
      \u0275\u0275property("disabled", ctx.isLoading);
      \u0275\u0275advance();
      \u0275\u0275property("disabled", ctx.isLoading || !ctx.inputMessage.trim());
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", !ctx.isLoading);
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", ctx.isLoading);
    }
  }, dependencies: [CommonModule, NgForOf, NgIf, FormsModule, DefaultValueAccessor, NgControlStatus, NgModel], styles: ['@charset "UTF-8";\n\n\n\n[_nghost-%COMP%] {\n  --chat-bg: #0d0d1a;\n  --chat-panel-bg: #12121f;\n  --chat-border: rgba(138, 90, 255, 0.25);\n  --chat-accent: #8a5aff;\n  --chat-accent-glow: rgba(138, 90, 255, 0.35);\n  --chat-user-bg: #8a5aff;\n  --chat-assistant-bg: #1e1e30;\n  --chat-text: #e8e8f0;\n  --chat-muted: #7a7a9a;\n  --chat-input-bg: #1a1a2e;\n  --chat-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);\n}\n.chatbot-wrapper[_ngcontent-%COMP%] {\n  position: fixed;\n  bottom: 28px;\n  right: 28px;\n  z-index: 9999;\n  font-family:\n    "Inter",\n    "Segoe UI",\n    sans-serif;\n}\n.chatbot-fab[_ngcontent-%COMP%] {\n  width: 58px;\n  height: 58px;\n  border-radius: 50%;\n  background:\n    linear-gradient(\n      135deg,\n      #8a5aff,\n      #5e3bda);\n  border: none;\n  cursor: pointer;\n  box-shadow: 0 4px 20px var(--chat-accent-glow), 0 0 0 0 var(--chat-accent-glow);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  transition: transform 0.2s ease, box-shadow 0.2s ease;\n  animation: _ngcontent-%COMP%_fab-pulse 3s infinite;\n}\n.chatbot-fab[_ngcontent-%COMP%]:hover {\n  transform: scale(1.08);\n  box-shadow: 0 6px 28px var(--chat-accent-glow);\n}\n.chatbot-fab--open[_ngcontent-%COMP%] {\n  animation: none;\n  background:\n    linear-gradient(\n      135deg,\n      #5e3bda,\n      #3b1fa8);\n}\n.chatbot-fab__icon[_ngcontent-%COMP%] {\n  font-size: 26px;\n  line-height: 1;\n  transition: transform 0.2s ease;\n}\n.chatbot-fab__icon--close[_ngcontent-%COMP%] {\n  font-size: 18px;\n  color: #fff;\n  font-weight: 700;\n}\n@keyframes _ngcontent-%COMP%_fab-pulse {\n  0%, 100% {\n    box-shadow: 0 4px 20px var(--chat-accent-glow), 0 0 0 0 var(--chat-accent-glow);\n  }\n  50% {\n    box-shadow: 0 4px 20px var(--chat-accent-glow), 0 0 0 10px rgba(138, 90, 255, 0);\n  }\n}\n.chatbot-panel[_ngcontent-%COMP%] {\n  position: absolute;\n  bottom: 72px;\n  right: 0;\n  width: 340px;\n  height: 480px;\n  background: var(--chat-panel-bg);\n  border: 1px solid var(--chat-border);\n  border-radius: 20px;\n  box-shadow: var(--chat-shadow);\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n  opacity: 0;\n  transform: translateY(16px) scale(0.96);\n  pointer-events: none;\n  transition: opacity 0.25s ease, transform 0.25s ease;\n}\n.chatbot-panel--visible[_ngcontent-%COMP%] {\n  opacity: 1;\n  transform: translateY(0) scale(1);\n  pointer-events: all;\n}\n.chatbot-panel__header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 14px 18px;\n  background:\n    linear-gradient(\n      135deg,\n      rgba(138, 90, 255, 0.18),\n      transparent);\n  border-bottom: 1px solid var(--chat-border);\n  flex-shrink: 0;\n}\n.chatbot-panel__header-icon[_ngcontent-%COMP%] {\n  font-size: 26px;\n  filter: drop-shadow(0 0 6px var(--chat-accent));\n}\n.chatbot-panel__title[_ngcontent-%COMP%] {\n  display: block;\n  font-size: 15px;\n  font-weight: 700;\n  color: var(--chat-text);\n  letter-spacing: 0.02em;\n}\n.chatbot-panel__subtitle[_ngcontent-%COMP%] {\n  display: block;\n  font-size: 11px;\n  color: var(--chat-muted);\n  letter-spacing: 0.04em;\n}\n.chatbot-panel__messages[_ngcontent-%COMP%] {\n  flex: 1;\n  overflow-y: auto;\n  padding: 14px 14px 8px;\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  scroll-behavior: smooth;\n}\n.chatbot-panel__messages[_ngcontent-%COMP%]::-webkit-scrollbar {\n  width: 4px;\n}\n.chatbot-panel__messages[_ngcontent-%COMP%]::-webkit-scrollbar-track {\n  background: transparent;\n}\n.chatbot-panel__messages[_ngcontent-%COMP%]::-webkit-scrollbar-thumb {\n  background: var(--chat-border);\n  border-radius: 4px;\n}\n.chatbot-bubble[_ngcontent-%COMP%] {\n  max-width: 88%;\n  display: flex;\n  flex-direction: column;\n  gap: 3px;\n  animation: _ngcontent-%COMP%_bubble-in 0.2s ease;\n}\n.chatbot-bubble--user[_ngcontent-%COMP%] {\n  align-self: flex-end;\n}\n.chatbot-bubble--user[_ngcontent-%COMP%]   .chatbot-bubble__content[_ngcontent-%COMP%] {\n  background: var(--chat-user-bg);\n  color: #fff;\n  border-radius: 16px 16px 4px 16px;\n}\n.chatbot-bubble--user[_ngcontent-%COMP%]   .chatbot-bubble__time[_ngcontent-%COMP%] {\n  text-align: right;\n}\n.chatbot-bubble--assistant[_ngcontent-%COMP%] {\n  align-self: flex-start;\n}\n.chatbot-bubble--assistant[_ngcontent-%COMP%]   .chatbot-bubble__content[_ngcontent-%COMP%] {\n  background: var(--chat-assistant-bg);\n  color: var(--chat-text);\n  border: 1px solid var(--chat-border);\n  border-radius: 16px 16px 16px 4px;\n}\n.chatbot-bubble__content[_ngcontent-%COMP%] {\n  padding: 10px 14px;\n  font-size: 13.5px;\n  line-height: 1.5;\n  word-break: break-word;\n}\n.chatbot-bubble__time[_ngcontent-%COMP%] {\n  font-size: 10px;\n  color: var(--chat-muted);\n  padding: 0 4px;\n}\n@keyframes _ngcontent-%COMP%_bubble-in {\n  from {\n    opacity: 0;\n    transform: translateY(6px);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n.typing-dots[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 5px;\n  padding: 12px 16px !important;\n}\n.typing-dots[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  width: 7px;\n  height: 7px;\n  background: var(--chat-accent);\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_dot-bounce 1.2s infinite ease-in-out;\n}\n.typing-dots[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]:nth-child(1) {\n  animation-delay: 0s;\n}\n.typing-dots[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]:nth-child(2) {\n  animation-delay: 0.2s;\n}\n.typing-dots[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]:nth-child(3) {\n  animation-delay: 0.4s;\n}\n@keyframes _ngcontent-%COMP%_dot-bounce {\n  0%, 80%, 100% {\n    transform: scale(0.9);\n    opacity: 0.5;\n  }\n  40% {\n    transform: scale(1.3);\n    opacity: 1;\n  }\n}\n.chatbot-panel__input-area[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: flex-end;\n  gap: 8px;\n  padding: 10px 12px 14px;\n  border-top: 1px solid var(--chat-border);\n  background: var(--chat-input-bg);\n  flex-shrink: 0;\n}\n.chatbot-panel__input[_ngcontent-%COMP%] {\n  flex: 1;\n  background: rgba(255, 255, 255, 0.05);\n  border: 1px solid var(--chat-border);\n  border-radius: 12px;\n  color: var(--chat-text);\n  font-size: 13px;\n  padding: 10px 12px;\n  resize: none;\n  outline: none;\n  font-family: inherit;\n  line-height: 1.4;\n  transition: border-color 0.2s;\n}\n.chatbot-panel__input[_ngcontent-%COMP%]::placeholder {\n  color: var(--chat-muted);\n}\n.chatbot-panel__input[_ngcontent-%COMP%]:focus {\n  border-color: var(--chat-accent);\n}\n.chatbot-panel__input[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.chatbot-panel__send-btn[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background:\n    linear-gradient(\n      135deg,\n      #8a5aff,\n      #5e3bda);\n  border: none;\n  color: #fff;\n  font-size: 16px;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  flex-shrink: 0;\n  transition: transform 0.15s ease, opacity 0.15s;\n}\n.chatbot-panel__send-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  transform: scale(1.08);\n}\n.chatbot-panel__send-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.4;\n  cursor: not-allowed;\n}\n.spinner[_ngcontent-%COMP%] {\n  width: 16px;\n  height: 16px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: #fff;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 0.7s linear infinite;\n  display: inline-block;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n/*# sourceMappingURL=chatbot.component.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ChatbotComponent, { className: "ChatbotComponent", filePath: "src\\app\\components\\chatbot\\chatbot.component.ts", lineNumber: 27 });
})();

// src/app/components/devices/device-router.component.ts
function DeviceRouterComponent_div_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 4);
    \u0275\u0275element(1, "div", 5);
    \u0275\u0275elementStart(2, "p");
    \u0275\u0275text(3, "Loading device...");
    \u0275\u0275elementEnd()();
  }
}
function DeviceRouterComponent_app_iphone_device_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-iphone-device");
  }
}
function DeviceRouterComponent_app_android_device_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-android-device");
  }
}
function DeviceRouterComponent_app_laptop_device_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-laptop-device");
  }
}
function DeviceRouterComponent_div_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 6)(1, "h2");
    \u0275\u0275text(2, "Unknown device type");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p");
    \u0275\u0275text(4, "Could not determine device type");
    \u0275\u0275elementEnd()();
  }
}
function DeviceRouterComponent_app_chatbot_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-chatbot", 7);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275property("gameId", ctx_r0.gameId);
  }
}
var DeviceRouterComponent = class _DeviceRouterComponent {
  route;
  deviceService;
  deviceType = null;
  loading = true;
  gameId = 0;
  deviceId = 0;
  /** True when accessed via public QR route (no gameId in URL) */
  isPublicMode = false;
  popstateListener;
  constructor(route, deviceService) {
    this.route = route;
    this.deviceService = deviceService;
  }
  ngOnInit() {
    const gameIdParam = this.route.snapshot.paramMap.get("gameId");
    const deviceSlugParam = this.route.snapshot.paramMap.get("deviceSlug");
    const uniqueUrlParam = this.route.snapshot.paramMap.get("uniqueUrl");
    if (gameIdParam && deviceSlugParam) {
      this.gameId = parseInt(gameIdParam);
      this.loadDeviceBySlug(deviceSlugParam);
    } else if (uniqueUrlParam) {
      this.isPublicMode = true;
      this.lockBackButton();
      this.loadPublicDeviceByUniqueUrl(uniqueUrlParam);
    } else if (deviceSlugParam) {
      this.isPublicMode = true;
      this.lockBackButton();
      this.loadPublicDevice(deviceSlugParam);
    } else {
      this.loading = false;
    }
  }
  ngOnDestroy() {
    if (this.popstateListener) {
      window.removeEventListener("popstate", this.popstateListener);
    }
  }
  // ── Public route loader ────────────────────────────────────────────────
  loadPublicDevice(slug) {
    sessionStorage.setItem("device_only_slug", slug);
    this.deviceService.getDeviceByPublicSlug(slug).subscribe({
      next: (device) => {
        this.gameId = device.gameId;
        this.deviceId = device.deviceId;
        this.deviceType = device.deviceType || "iPhone";
        this.loading = false;
      },
      error: (error) => {
        console.error("Error loading public device:", error);
        this.loading = false;
      }
    });
  }
  loadPublicDeviceByUniqueUrl(uniqueUrl) {
    sessionStorage.setItem("device_only_slug", `d/${uniqueUrl}`);
    this.deviceService.getDeviceByUniqueUrl(uniqueUrl).subscribe({
      next: (device) => {
        this.gameId = device.gameId;
        this.deviceId = device.deviceId;
        this.deviceType = device.deviceType || "iPhone";
        this.loading = false;
      },
      error: (error) => {
        console.error("Error loading public device by uniqueUrl:", error);
        this.loading = false;
      }
    });
  }
  // ── Internal route loader ──────────────────────────────────────────────
  loadDeviceBySlug(slugOrId) {
    const numericId = parseInt(slugOrId, 10);
    if (!isNaN(numericId) && slugOrId === String(numericId)) {
      this.deviceId = numericId;
      this.deviceService.getDeviceWithApps(this.gameId, numericId).subscribe({
        next: (device) => {
          this.deviceType = device.deviceType || "iPhone";
          this.loading = false;
        },
        error: (error) => {
          console.error("Error loading device by ID:", error);
          this.loading = false;
        }
      });
      return;
    }
    const parsed = parseDeviceSlug(slugOrId);
    if (!parsed) {
      console.error("Invalid device slug:", slugOrId);
      this.loading = false;
      return;
    }
    this.deviceService.getDeviceBySlug(this.gameId, parsed.deviceType, parsed.ownerName).subscribe({
      next: (device) => {
        this.deviceId = device.deviceId;
        this.deviceService.getDeviceWithApps(this.gameId, device.deviceId).subscribe({
          next: (deviceWithApps) => {
            this.deviceType = deviceWithApps.deviceType || "iPhone";
            this.loading = false;
          },
          error: (error) => {
            console.error("Error loading device type:", error);
            this.deviceType = "iPhone";
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error("Error loading device by slug:", error);
        this.loading = false;
      }
    });
  }
  // ── Back-button blocker (kiosk mode) ──────────────────────────────────
  lockBackButton() {
    history.pushState(null, "", location.href);
    this.popstateListener = () => {
      history.pushState(null, "", location.href);
    };
    window.addEventListener("popstate", this.popstateListener);
  }
  static \u0275fac = function DeviceRouterComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _DeviceRouterComponent)(\u0275\u0275directiveInject(ActivatedRoute), \u0275\u0275directiveInject(DeviceService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _DeviceRouterComponent, selectors: [["app-device-router"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 6, vars: 6, consts: [["class", "loading", 4, "ngIf"], [4, "ngIf"], ["class", "error", 4, "ngIf"], [3, "gameId", 4, "ngIf"], [1, "loading"], [1, "loader"], [1, "error"], [3, "gameId"]], template: function DeviceRouterComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275template(0, DeviceRouterComponent_div_0_Template, 4, 0, "div", 0)(1, DeviceRouterComponent_app_iphone_device_1_Template, 1, 0, "app-iphone-device", 1)(2, DeviceRouterComponent_app_android_device_2_Template, 1, 0, "app-android-device", 1)(3, DeviceRouterComponent_app_laptop_device_3_Template, 1, 0, "app-laptop-device", 1)(4, DeviceRouterComponent_div_4_Template, 5, 0, "div", 2)(5, DeviceRouterComponent_app_chatbot_5_Template, 1, 1, "app-chatbot", 3);
    }
    if (rf & 2) {
      \u0275\u0275property("ngIf", ctx.loading);
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", !ctx.loading && ctx.deviceType === "iPhone");
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", !ctx.loading && ctx.deviceType === "Android");
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", !ctx.loading && ctx.deviceType === "Laptop");
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", !ctx.loading && !ctx.deviceType);
      \u0275\u0275advance();
      \u0275\u0275property("ngIf", !ctx.loading && ctx.gameId);
    }
  }, dependencies: [
    CommonModule,
    NgIf,
    IPhoneDeviceComponent,
    AndroidDeviceComponent,
    LaptopDeviceComponent,
    ChatbotComponent
  ], styles: ["\n\n.loading[_ngcontent-%COMP%], \n.error[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  color: white;\n}\n.loader[_ngcontent-%COMP%] {\n  border: 4px solid rgba(255, 255, 255, 0.3);\n  border-top: 4px solid white;\n  border-radius: 50%;\n  width: 40px;\n  height: 40px;\n  animation: _ngcontent-%COMP%_spin 1s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  0% {\n    transform: rotate(0deg);\n  }\n  100% {\n    transform: rotate(360deg);\n  }\n}\n.error[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 8px 0;\n}\n.error[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0;\n  opacity: 0.8;\n}\n/*# sourceMappingURL=device-router.component.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(DeviceRouterComponent, { className: "DeviceRouterComponent", filePath: "src\\app\\components\\devices\\device-router.component.ts", lineNumber: 75 });
})();
export {
  DeviceRouterComponent
};
//# sourceMappingURL=chunk-QY3TTW7S.js.map
