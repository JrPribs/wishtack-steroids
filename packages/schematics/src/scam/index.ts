import { strings } from '@angular-devkit/core';
import { chain, externalSchematic, Rule } from '@angular-devkit/schematics';
import { Schema as NgComponentOptions } from '@schematics/angular/component/schema';
import { findModuleFromOptions } from '@schematics/angular/utility/find-module';
import { buildDefaultPath, getProject } from '@schematics/angular/utility/project';

export interface ScamOptions extends NgComponentOptions {
    separateModule: boolean;
}

export function scam(options: ScamOptions): Rule {

    /* Dasherize component/module name. */
    options = {
        ...options,
        name: strings.dasherize(options.name)
    };

    let ruleList = [
        externalSchematic('@schematics/angular', 'module', options),
        externalSchematic('@schematics/angular', 'component', {
            ...options,
            export: true,
            module: options.name
        })
    ];

    if (!options.separateModule) {
        ruleList = [
            ...ruleList,
            _mergeModuleIntoComponentFile(options)
        ];
    }

    return chain(ruleList);

}

/**
 * Schematics rule factory that merges module into component.
 * @private
 */
export const _mergeModuleIntoComponentFile: (options: ScamOptions) => Rule = options => tree => {

    const project = getProject(tree, options.project);

    const modulePath = findModuleFromOptions(tree, {
        ...options,
        path: options.path || buildDefaultPath(project)
    });

    /* @hack: Well, that's a dirty way for guessing the component's path from the module. */
    const componentPath = modulePath.replace(/module.ts$/, 'component.ts');

    const moduleContent = tree.read(modulePath).toString();
    const componentContent = tree.read(componentPath).toString();

    tree.overwrite(componentPath, _mergeComponentAndModule({componentContent, moduleContent}));

    tree.delete(modulePath);

    return tree;

};

/**
 * A function that simply merges component and module, and removes useless imports.
 * @param componentContent
 * @param moduleContent
 * @private
 */
export function _mergeComponentAndModule({componentContent, moduleContent}:
                                             { componentContent: string, moduleContent: string }): string {

    let componentLineList = componentContent.split('\n');
    let moduleLineList = moduleContent.split('\n');

    /* Remove useless imports from module. */
    moduleLineList = moduleLineList
        .filter(line => {

            line = line.trim();

            /* Keep everything which is not an import. */
            if (!_isImportLine(line)) {
                return true;
            }

            /* Keep only imports from @angular scope, except NgModule. */
            return line.includes('@angular/')
                && !line.includes('NgModule');

        });

    /* Add `NgModule` import to component. */
    componentLineList = componentLineList
        .map(line => {

            const trimmedLine = line.trim();

            if (_isImportLine(line) && trimmedLine.includes('@angular/core')) {
                return line.replace(/Component,\s*OnInit/, 'Component, NgModule, OnInit');
            }

            return line;

        });

    const lineList = [
        ...componentLineList,
        ...moduleLineList
    ];

    const importLineList = lineList.filter(_isImportLine);
    const otherLineList = lineList.filter(line => !_isImportLine(line));

    const content = [
        ...importLineList,
        ...otherLineList
    ].join('\n');

    /* Merge multiple empty lines into one. */
    return content
        .replace(/\n{2,}/g, '\n\n');

}

export function _isImportLine(line: string) {
    return line.startsWith('import ');
}
