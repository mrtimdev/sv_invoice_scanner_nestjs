import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Setting } from 'src/entities/setting.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(Setting)
        private readonly settingRepository: Repository<Setting>,
    ) {}

    async getSetting(): Promise<Setting> {
        let setting = await this.settingRepository.findOne({ where: {} });
        if (!setting) {
        setting = this.settingRepository.create();
        await this.settingRepository.save(setting);
        }
        return setting;
    }

    async updateSetting(data: Partial<Setting>): Promise<Setting> {
        const setting = await this.getSetting();
        const updated = this.settingRepository.merge(setting, data);
        return this.settingRepository.save(updated);
    }
}
