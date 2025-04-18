import fs from 'fs';
import * as AllComps from '.';

const avoidCheck = [
  '.stories',
  '.test',
  'index',
  '__snapshots__',
  // Not exported on purpose
  'ReleaseNotes',
  'ActionsNotifier',
  'AlertNotification',
  'ErrorBoundary',
];

const checkExports = [
  'ActionButton',
  'BackLink',
  'Chart',
  'ConfirmDialog',
  'ConfirmButton',
  'CreateResourceButton',
  'Dialog',
  'EmptyContent',
  'ErrorPage',
  'InnerTable',
  'Label',
  'LabelListItem',
  'Link',
  'Loader',
  'LogViewer',
  'NamespacesAutocomplete',
  'NameValueTable',
  'Resource',
  'SectionBox',
  'SectionFilterHeader',
  'SectionHeader',
  'ShowHideLabel',
  'SimpleTable',
  'Table',
  'Tabs',
  'Terminal',
  'TileChart',
  'TimezoneSelect',
  'Tooltip',
  'ObjectEventList',
];

function getFilesToVerify() {
  const filesToVerify: string[] = [];
  fs.readdirSync(__dirname).forEach(file => {
    const fileNoSuffix = file.replace(/\.[^/.]+$/, '');
    if (fileNoSuffix && !avoidCheck.find(suffix => fileNoSuffix.endsWith(suffix))) {
      filesToVerify.push(fileNoSuffix);
    }
  });

  return filesToVerify;
}

const filesToVerify = getFilesToVerify();

describe('Import tests', () => {
  test('Left out imports', () => {
    filesToVerify.forEach((file: string) => {
      expect(checkExports).toContain(file);
    });
  });

  // Not important, but just for the sake of keeping this file clean.
  test('Left over imports', () => {
    checkExports.forEach((file: string) => {
      expect(filesToVerify).toContain(file);
    });
  });

  test('Check imports', async () => {
    for (const file of filesToVerify) {
      const r = await import(`./${file}`);

      // Check that all components are exported.
      for (const key in r) {
        if (key === 'default') {
          // If default, then we try to import by file name.
          expect(AllComps).toHaveProperty(file);
        } else {
          expect(AllComps).toHaveProperty(key);
        }
      }
    }
  });
});
