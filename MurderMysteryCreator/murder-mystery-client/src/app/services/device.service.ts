import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DigitalDevice } from '../models/models';

@Injectable({
    providedIn: 'root'
})
export class DeviceService {
    private apiUrl = 'http://localhost:5230/api/games';

    constructor(private http: HttpClient) { }

    getDevices(gameId: number): Observable<DigitalDevice[]> {
        return this.http.get<DigitalDevice[]>(`${this.apiUrl}/${gameId}/devices`);
    }

    getInvestigatorDevices(gameId: number): Observable<DigitalDevice[]> {
        return this.http.get<DigitalDevice[]>(`${this.apiUrl}/${gameId}/devices/investigator`);
    }

    getDevice(gameId: number, deviceId: number): Observable<DigitalDevice> {
        return this.http.get<DigitalDevice>(`${this.apiUrl}/${gameId}/devices/${deviceId}`);
    }

    createDevice(gameId: number, device: Partial<DigitalDevice>): Observable<DigitalDevice> {
        return this.http.post<DigitalDevice>(`${this.apiUrl}/${gameId}/devices`, device);
    }

    updateDevice(gameId: number, deviceId: number, device: Partial<DigitalDevice>): Observable<DigitalDevice> {
        return this.http.put<DigitalDevice>(`${this.apiUrl}/${gameId}/devices/${deviceId}`, device);
    }

    deleteDevice(gameId: number, deviceId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${gameId}/devices/${deviceId}`);
    }

    // Device Apps Methods
    getDeviceWithApps(gameId: number, deviceId: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${gameId}/devices/${deviceId}/full`);
    }

    // Get device by slug (deviceType + ownerName)
    getDeviceBySlug(gameId: number, deviceType: string, ownerName: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${gameId}/devices/by-slug`, {
            params: {
                deviceType: deviceType,
                ownerName: ownerName
            }
        });
    }

    getDeviceApps(gameId: number, deviceId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/${gameId}/devices/${deviceId}/apps`);
    }

    createDeviceApp(gameId: number, deviceId: number, appData: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/${gameId}/devices/${deviceId}/apps`, appData);
    }

    updateDeviceApp(gameId: number, deviceId: number, appId: number, appData: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${gameId}/devices/${deviceId}/apps/${appId}`, appData);
    }

    deleteDeviceApp(gameId: number, deviceId: number, appId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${gameId}/devices/${deviceId}/apps/${appId}`);
    }

    // Public endpoint — no auth required (used by QR-scanned device pages)
    getDeviceByPublicSlug(slug: string): Observable<any> {
        return this.http.get<any>(`http://localhost:5230/api/devices/public/${slug}`);
    }

    // Download QR code PDF
    downloadQRCodePDF(gameId: number, deviceId: number): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/${gameId}/devices/${deviceId}/qr-pdf`, {
            responseType: 'blob',
            headers: new HttpHeaders({
                'Accept': 'application/pdf'
            })
        });
    }
}
