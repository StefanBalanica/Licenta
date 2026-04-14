import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Injectable({
    providedIn: 'root'
})
export class IosIconService {
    constructor(private sanitizer: DomSanitizer) { }

    /**
     * Returns SVG icon for iOS app based on app name/type
     * These are simplified iOS-style icons that mimic SF Symbols design
     */
    getIconSvg(appName: string): SafeHtml {
        const iconMap: { [key: string]: string } = {
            'messages': this.getMessagesIcon(),
            'calendar': this.getCalendarIcon(),
            'photos': this.getPhotosIcon(),
            'camera': this.getCameraIcon(),
            'mail': this.getMailIcon(),
            'email': this.getMailIcon(),
            'clock': this.getClockIcon(),
            'maps': this.getMapsIcon(),
            'weather': this.getWeatherIcon(),
            'notes': this.getNotesIcon(),
            'reminders': this.getRemindersIcon(),
            'stocks': this.getStocksIcon(),
            'wallet': this.getWalletIcon(),
            'settings': this.getSettingsIcon(),
            'health': this.getHealthIcon(),
            'podcasts': this.getPodcastsIcon(),
            'appstore': this.getAppStoreIcon(),
            'phone': this.getPhoneIcon(),
            'safari': this.getSafariIcon(),
            'music': this.getMusicIcon(),
            'files': this.getFilesIcon(),
            'books': this.getBooksIcon(),
            'tv': this.getTVIcon(),
            'news': this.getNewsIcon(),
            'videos': this.getVideosIcon(),
            'ibooks': this.getBooksIcon(),
            'gamecenter': this.getGameCenterIcon(),
            'watch': this.getWatchIcon(),
            'home': this.getHomeIcon(),
            'voicememos': this.getVoiceMemosIcon(),
            'compass': this.getCompassIcon(),
            'flashlight': this.getFlashlightIcon(),
            'calculator': this.getCalculatorIcon(),
            'measure': this.getMeasureIcon(),
            'shortcuts': this.getShortcutsIcon(),
            'findmy': this.getFindMyIcon(),
            'tips': this.getTipsIcon(),
            'icloud': this.getICloudIcon()
        };

        const normalizedName = appName.toLowerCase().replace(/\s+/g, '');
        const svg = iconMap[normalizedName] || this.getDefaultIcon();
        return this.sanitizer.sanitize(1, svg) as SafeHtml;
    }

    /**
     * Returns raw SVG string (for use with innerHTML)
     */
    getIconSvgString(appName: string): string {
        const iconMap: { [key: string]: string } = {
            'messages': this.getMessagesIcon(),
            'calendar': this.getCalendarIcon(),
            'photos': this.getPhotosIcon(),
            'camera': this.getCameraIcon(),
            'mail': this.getMailIcon(),
            'email': this.getMailIcon(),
            'clock': this.getClockIcon(),
            'maps': this.getMapsIcon(),
            'weather': this.getWeatherIcon(),
            'notes': this.getNotesIcon(),
            'reminders': this.getRemindersIcon(),
            'stocks': this.getStocksIcon(),
            'wallet': this.getWalletIcon(),
            'settings': this.getSettingsIcon(),
            'health': this.getHealthIcon(),
            'podcasts': this.getPodcastsIcon(),
            'appstore': this.getAppStoreIcon(),
            'phone': this.getPhoneIcon(),
            'safari': this.getSafariIcon(),
            'music': this.getMusicIcon(),
            'files': this.getFilesIcon(),
            'books': this.getBooksIcon(),
            'tv': this.getTVIcon(),
            'news': this.getNewsIcon(),
            'videos': this.getVideosIcon(),
            'ibooks': this.getBooksIcon(),
            'gamecenter': this.getGameCenterIcon(),
            'watch': this.getWatchIcon(),
            'home': this.getHomeIcon(),
            'voicememos': this.getVoiceMemosIcon(),
            'compass': this.getCompassIcon(),
            'flashlight': this.getFlashlightIcon(),
            'calculator': this.getCalculatorIcon(),
            'measure': this.getMeasureIcon(),
            'shortcuts': this.getShortcutsIcon(),
            'findmy': this.getFindMyIcon(),
            'tips': this.getTipsIcon(),
            'icloud': this.getICloudIcon()
        };

        const normalizedName = appName.toLowerCase().replace(/\s+/g, '');
        return iconMap[normalizedName] || this.getDefaultIcon();
    }

    // iOS App Icons (SF Symbols style)
    private getMessagesIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 20V4C3 2.9 3.9 2 5 2H19C20.1 2 21 2.9 21 4V20L18 17H5C3.9 17 3 16.1 3 15V20Z" fill="white" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M7 9H17M7 13H13" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
    }

    private getCalendarIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="18" height="18" rx="2" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M3 10H21" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>
            <circle cx="8" cy="6" r="1" fill="rgba(0,0,0,0.3)"/>
            <circle cx="16" cy="6" r="1" fill="rgba(0,0,0,0.3)"/>
            <circle cx="8" cy="15" r="1.5" fill="rgba(0,0,0,0.3)"/>
            <circle cx="12" cy="15" r="1.5" fill="rgba(0,0,0,0.3)"/>
            <circle cx="16" cy="15" r="1.5" fill="rgba(0,0,0,0.3)"/>
        </svg>`;
    }

    private getPhotosIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" fill="white" stroke="white" stroke-width="1.5"/>
            <circle cx="8.5" cy="8.5" r="2" fill="rgba(0,0,0,0.3)"/>
            <path d="M21 15L16 10L11 15L7 11L3 15V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V15Z" fill="rgba(0,0,0,0.3)"/>
        </svg>`;
    }

    private getCameraIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="7" width="20" height="14" rx="2" fill="white" stroke="white" stroke-width="1.5"/>
            <circle cx="12" cy="14" r="3" fill="rgba(0,0,0,0.3)" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>
            <circle cx="12" cy="14" r="1.5" fill="white"/>
            <path d="M7 7V5C7 4.4 7.4 4 8 4H16C16.6 4 17 4.4 17 5V7" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="17" cy="9" r="1" fill="white"/>
        </svg>`;
    }

    private getMailIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="18" height="16" rx="2" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M3 7L12 13L21 7" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    }

    private getClockIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M12 6V12L16 14" stroke="rgba(0,0,0,0.3)" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
    }

    private getMapsIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 7V21L9 18L15 21L21 18V4L15 7L9 4L3 7Z" fill="white" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="3" fill="rgba(0,0,0,0.3)"/>
        </svg>`;
    }

    private getWeatherIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M12 4V8M12 16V20M4 12H8M16 12H20M6.34 6.34L9.17 9.17M14.83 14.83L17.66 17.66M6.34 17.66L9.17 14.83M14.83 9.17L17.66 6.34" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="12" cy="12" r="2" fill="rgba(0,0,0,0.3)"/>
        </svg>`;
    }

    private getNotesIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4C4 2.9 4.9 2 6 2H18C19.1 2 20 2.9 20 4V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4Z" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M8 7H16M8 11H16M8 15H13" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
    }

    private getRemindersIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M12 6V12L16 14" stroke="rgba(0,0,0,0.3)" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="12" r="2" fill="rgba(0,0,0,0.3)"/>
        </svg>`;
    }

    private getStocksIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 18L9 12L13 16L21 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M21 8H17V12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    }

    private getWalletIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="18" height="14" rx="2" fill="white" stroke="white" stroke-width="1.5"/>
            <rect x="15" y="9" width="6" height="6" rx="1" fill="rgba(0,0,0,0.3)"/>
            <path d="M3 9H15" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>
        </svg>`;
    }

    private getSettingsIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M12 1V3M12 21V23M23 12H21M3 12H1M19.07 4.93L17.66 6.34M6.34 17.66L4.93 19.07M19.07 19.07L17.66 17.66M6.34 6.34L4.93 4.93" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
    }

    private getHealthIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M12 8V16M8 12H16" stroke="rgba(0,0,0,0.3)" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
    }

    private getPodcastsIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9C5 12.87 8.13 16 12 16C15.87 16 19 12.87 19 9C19 5.13 15.87 2 12 2Z" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M12 18V22M8 22H16" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="9" r="2" fill="rgba(0,0,0,0.3)"/>
        </svg>`;
    }

    private getAppStoreIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="3" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M8 8H16M8 12H16M8 16H12" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
    }

    private getPhoneIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="2" width="12" height="20" rx="2" fill="white" stroke="white" stroke-width="1.5"/>
            <rect x="9" y="16" width="6" height="2" rx="1" fill="rgba(0,0,0,0.3)"/>
            <circle cx="12" cy="7" r="1.5" fill="rgba(0,0,0,0.3)"/>
        </svg>`;
    }

    private getSafariIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M8 12L12 8L16 12L12 16L8 12Z" fill="rgba(0,0,0,0.3)"/>
            <circle cx="12" cy="12" r="2" fill="white"/>
        </svg>`;
    }

    private getMusicIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18V5L21 3V16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <circle cx="6" cy="18" r="3" fill="white" stroke="white" stroke-width="1.5"/>
            <circle cx="18" cy="16" r="3" fill="white" stroke="white" stroke-width="1.5"/>
            <circle cx="6" cy="18" r="1.5" fill="rgba(0,0,0,0.3)"/>
            <circle cx="18" cy="16" r="1.5" fill="rgba(0,0,0,0.3)"/>
        </svg>`;
    }

    private getFilesIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4C4 2.9 4.9 2 6 2H14L20 8V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4Z" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M14 2V8H20" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 12H16M8 16H13" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
    }

    private getBooksIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 19.5C4 18.9 4.4 18.5 5 18.5H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <path d="M6 4H20C20.6 4 21 4.4 21 5V19C21 19.6 20.6 20 20 20H6C5.4 20 5 19.6 5 19V5C5 4.4 5.4 4 6 4Z" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M9 8H15M9 12H15" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
    }

    private getTVIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="4" width="20" height="14" rx="2" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M7 22L12 18L17 22" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 9L14 13M14 9L10 13" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
    }

    private getNewsIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4C4 2.9 4.9 2 6 2H18C19.1 2 20 2.9 20 4V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4Z" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M8 7H16M8 11H16M8 15H12" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
    }

    private getVideosIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="18" height="14" rx="2" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M10 10L15 13L10 16V10Z" fill="rgba(0,0,0,0.3)"/>
        </svg>`;
    }

    private getGameCenterIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="white" stroke="white" stroke-width="1.5"/>
            <circle cx="9" cy="9" r="2" fill="rgba(0,0,0,0.3)"/>
            <circle cx="15" cy="9" r="2" fill="rgba(0,0,0,0.3)"/>
            <path d="M9 15C9 15 10.5 17 12 17C13.5 17 15 15 15 15" stroke="rgba(0,0,0,0.3)" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
    }

    private getWatchIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="2" width="6" height="4" rx="1" fill="white" stroke="white" stroke-width="1.5"/>
            <rect x="9" y="18" width="6" height="4" rx="1" fill="white" stroke="white" stroke-width="1.5"/>
            <rect x="6" y="6" width="12" height="12" rx="3" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M12 9V12L14 14" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
    }

    private getHomeIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.6 5.4 21 6 21H9M19 10L21 12M19 10V20C19 20.6 18.6 21 18 21H15M9 21C9.6 21 10 20.6 10 20V16C10 15.4 10.4 15 11 15H13C13.6 15 14 15.4 14 16V20C14 20.6 14.4 21 15 21M9 21H15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>`;
    }

    private getVoiceMemosIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C10.9 2 10 2.9 10 4V12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12V4C14 2.9 13.1 2 12 2Z" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M19 10V12C19 15.9 15.9 19 12 19C8.1 19 5 15.9 5 12V10" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 19V22M8 22H16" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
    }

    private getCompassIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M12 6L14 10L18 12L14 14L12 18L10 14L6 12L10 10L12 6Z" fill="rgba(0,0,0,0.3)"/>
        </svg>`;
    }

    private getFlashlightIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 2L7 4H17L15 2H9Z" fill="white" stroke="white" stroke-width="1.5"/>
            <rect x="6" y="4" width="12" height="14" rx="1" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M10 10H14M12 8V12" stroke="rgba(0,0,0,0.3)" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
    }

    private getCalculatorIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="3" width="16" height="18" rx="2" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M8 7H16M8 11H16M8 15H12M12 15H16" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
    }

    private getMeasureIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 21L21 3" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <circle cx="3" cy="21" r="2" fill="white"/>
            <circle cx="21" cy="3" r="2" fill="white"/>
            <path d="M8 8L16 16M8 16L16 8" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
    }

    private getShortcutsIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M8 8H16M8 12H16M8 16H13" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="16" cy="16" r="2" fill="rgba(0,0,0,0.3)"/>
        </svg>`;
    }

    private getFindMyIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="white" stroke="white" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="6" fill="rgba(0,0,0,0.3)"/>
            <circle cx="12" cy="12" r="2" fill="white"/>
        </svg>`;
    }

    private getTipsIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M12 8V12M12 16H12.01" stroke="rgba(0,0,0,0.3)" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
    }

    private getICloudIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 10C19.1 10 20 10.9 20 12C20 13.1 19.1 14 18 14H6C4.9 14 4 13.1 4 12C4 10.9 4.9 10 6 10C6.6 10 7.1 10.2 7.5 10.6C8.2 8.5 10.1 7 12.5 7C14.9 7 16.8 8.5 17.5 10.6C17.9 10.2 18.4 10 19 10H18Z" fill="white" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    }

    private getDefaultIcon(): string {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="3" fill="white" stroke="white" stroke-width="1.5"/>
            <path d="M8 8H16M8 12H16M8 16H12" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
    }
}
