export interface Message {
    sender: string;
    content: string;
    timestamp: string;
    isOutgoing: boolean;
}

export interface Conversation {
    contact: string;
    messages: Message[];
    lastMessage: string;
    time: string;
    avatar: string;
}

export interface Photo {
    url: string;
    caption: string;
    requiredUploadName?: string;
    requiredTypes?: string;
    requiredSize?: string;
    isUploadPlaceholder?: boolean;
}

export interface Email {
    from: string;
    subject: string;
    preview: string;
    body?: string;
    time: string;
}

export interface Note {
    title: string;
    content: string;
    time: string;
}

export interface FileItem {
    name: string;
    type: string;  // Encrypted, Screenshot, Document, Folder, Image
    description: string;
    fileFormat?: string; // docx, pdf, xlsx, txt
    modifiedAt?: string;
    size?: string;
    content?: string; // Used by text-like previews (docx/txt)
    rows?: Record<string, string | number>[]; // Used by spreadsheet-like previews
}

export interface CallLog {
    contact: string;     // name or phone number
    time: string;        // when the call was made
    date?: string;       // date string e.g. "21.10.2007"
    duration: string;    // e.g. "2 min", "0 min"
    type?: string;       // "Primit" | "Efectuat" | "Pierdut"
    isIncoming: boolean; // true = owner received the call
    answered: boolean;   // was the call answered
    audioUrl?: string;   // base64 data URL or upload-required:// placeholder
    audioFileName?: string; // original filename e.g. "Sorina.MP3"
}

export type DeviceType = 'iPhone' | 'Android' | 'Laptop';

export interface DeviceApp {
    appId: number;
    deviceId: number;
    appType: string;
    appData: any;
    createdAt: string;
}

export interface DeviceData {
    deviceId: number;
    gameId: number;
    deviceType: DeviceType;
    ownerName: string;
    uniqueUrl: string;
    qrCodeUrl?: string;
    passcode?: string;
    createdAt: string;
    apps: DeviceApp[];
}
