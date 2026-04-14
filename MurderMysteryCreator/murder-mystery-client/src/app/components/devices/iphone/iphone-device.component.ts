import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BaseDeviceComponent } from '../base-device.component';
import { DeviceService } from '../../../services/device.service';

@Component({
    selector: 'app-iphone-device',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './iphone-device.component.html',
    styleUrls: ['./iphone-device.component.scss']
})
export class IPhoneDeviceComponent extends BaseDeviceComponent {
    constructor(
        protected override route: ActivatedRoute,
        protected override deviceService: DeviceService
    ) {
        super(route, deviceService);
    }
}
