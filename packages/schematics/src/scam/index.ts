import { chain, externalSchematic, Rule } from '@angular-devkit/schematics';
import { Schema as NgComponentOptions } from '@schematics/angular/component/schema';

export interface ScamOptions extends NgComponentOptions {
    separateModule: boolean;
}

export function scam(options: ScamOptions): Rule {

    return chain([
        externalSchematic('@schematics/angular', 'module', options),
        externalSchematic('@schematics/angular', 'component', {
            ...options,
            export: true,
            module: options.name
        }),
    ]);
}
