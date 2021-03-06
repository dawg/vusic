import FileExplorer from '@/extra/explorer/FileExplorer.vue';
import * as dawg from '@/dawg';
import * as t from '@/lib/io';
import { remote } from 'electron';
import { Extensions } from '@/extra/explorer/types';
import { loadBuffer } from '@/lib/wav';
import { parseMidi } from '@/lib/mutils';
import fs from '@/lib/fs';
import { Sample, createSamplePrototype } from '@/models';
import { commands } from '@/core/commands';
import { createExtension } from '@/lib/framework/extensions';
import { createComponent } from '@vue/composition-api';
import { createFileExplorer, FileExplorerAPI } from '@/extra/explorer/common';
import Vue from 'vue';

const loadMidi = async (path: string) => {
  const buffer = await fs.readFile(path);
  const ab = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(ab);
  buffer.forEach((value, i) => {
    view[i] = value;
  });

  return parseMidi(ab, dawg.project.bpm.value);
};

const extensions: Extensions = {
  wav: {
    dragGroup: 'arranger',
    iconComponent: 'wav-icon',
    load: async (path: string) => {
      const buffer = await loadBuffer(path);
      const sample = Sample.create(path, buffer);
      return sample;
    },
    createTransferData: (sample: Sample) => {
      return createSamplePrototype({ row: 0, duration: sample.beats, time: 0  }, sample, {});
    },
    preview: (sample: Sample) => {
      const result = sample.preview();
      if (result.started) {
        return result;
      }

      return {
        dispose: () => {
          //
        },
      };
    },
  },
  mid: {
    dragGroup: 'midi',
    iconComponent: 'midi-icon',
    load: loadMidi,
  },
  midi: {
    dragGroup: 'midi',
    iconComponent: 'midi-icon',
    load: loadMidi,
  },
};

let api: FileExplorerAPI | null = null;
export const extension = createExtension({
  id: 'dawg.explorer',
  global: {
    folders: {
      type: t.array(t.type({ rootFolder: t.string, openedFolders: t.array(t.string) })),
      default: [],
    },
    selected: t.type({
      rootFolder: t.string,
      selectedPath: t.string,
    }),
  },
  activate(context) {
    const extensionSet = new Set(Object.keys(extensions).map((ext) => ext.toLowerCase()));
    const nonNullApi = api = createFileExplorer(extensionSet);
    context.subscriptions.push(nonNullApi);

    api.setMemento({
      folders: context.global.folders.value,
      selected: context.global.selected.value,
    });

    context.subscriptions.push(commands.registerCommand({
      text: 'Open File Explorer',
      shortcut: ['CmdOrCtrl', 'E'],
      callback: () => {
        // This must match the tab name below
        dawg.ui.openedSideTab.value = 'Explorer';
      },
    }));

    const openFolder = async () => {
      const { dialog } = remote;
      const toAdd = await dialog.showOpenDialog({ properties: ['openDirectory'] });

      // We should only ever get undefined or an array of length 1
      if (!toAdd.filePaths || toAdd.filePaths.length === 0) {
        return;
      }

      const rootFolder = toAdd.filePaths[0];
      nonNullApi.addFolder(rootFolder);
    };

    const component = Vue.extend(createComponent({
      props: {},
      components: { FileExplorer },
      template: `
      <file-explorer
        :extensions="extensions"
        :trees="trees"
        @open-explorer="openFolder"
        @remove="remove"
      ></file-explorer>
      `,
      setup() {
        return {
          trees: nonNullApi.trees,
          openFolder,
          extensions,
          remove: nonNullApi.removeFolder,
        };
      },
    }));

    dawg.ui.activityBar.push({
      icon: 'folder',
      name: 'Explorer',
      component,
      order: 1,
    });

    context.subscriptions.push(dawg.commands.registerCommand({
      text: 'Add Folder to Workspace',
      callback: openFolder,
    }));
  },
  deactivate(context) {
    if (api) {
      const memento = api.createMemento();
      context.global.folders.value = memento.folders;
      context.global.selected.value = memento.selected;
    }
  },
});
