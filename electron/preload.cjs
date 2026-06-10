/* Electron preload — exposes a safe, typed bridge to the renderer */
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('mdreader', {
  fs: {
    tree: (absPath) => ipcRenderer.invoke('fs:tree', absPath),
    browse: (absPath) => ipcRenderer.invoke('fs:browse', absPath),
    read: (absPath) => ipcRenderer.invoke('fs:read', absPath),
    write: (absPath, content, roots) => ipcRenderer.invoke('fs:write', { absPath, content, roots }),
    pickDirectory: () => ipcRenderer.invoke('fs:pickDirectory'),
    homeDir: () => ipcRenderer.invoke('fs:homeDir'),
    search: (opts) => ipcRenderer.invoke('fs:search', opts),
    searchCancel: (sessionId) => ipcRenderer.send('fs:search:cancel', sessionId),
    watch: (absPath) => ipcRenderer.invoke('fs:watch', absPath),
    unwatch: (absPath) => ipcRenderer.invoke('fs:unwatch', absPath),
    onChanged: (cb) => {
      const listener = (_e, root) => cb(root);
      ipcRenderer.on('fs:changed', listener);
      return () => ipcRenderer.removeListener('fs:changed', listener);
    },
    watchFile: (absPath) => ipcRenderer.invoke('fs:watchFile', absPath),
    unwatchFile: (absPath) => ipcRenderer.invoke('fs:unwatchFile', absPath),
    onFileChanged: (cb) => {
      const listener = (_e, absPath) => cb(absPath);
      ipcRenderer.on('fs:fileChanged', listener);
      return () => ipcRenderer.removeListener('fs:fileChanged', listener);
    },
  },
  term: {
    spawn: (opts) => ipcRenderer.invoke('term:spawn', opts),
    write: (id, data) => ipcRenderer.invoke('term:write', { id, data }),
    resize: (id, cols, rows) => ipcRenderer.invoke('term:resize', { id, cols, rows }),
    kill: (id) => ipcRenderer.invoke('term:kill', { id }),
    onData: (id, cb) => {
      const channel = `term:data:${id}`;
      const listener = (_e, data) => cb(data);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
    onExit: (id, cb) => {
      const channel = `term:exit:${id}`;
      const listener = (_e, code) => cb(code);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
  },
  app: {
    onOpenFile: (cb) => {
      const listener = (_e, filePath) => cb(filePath);
      ipcRenderer.on('app:open-file', listener);
      return () => ipcRenderer.removeListener('app:open-file', listener);
    },
    onInitialState: (cb) => {
      const listener = (_e, initial) => cb(initial);
      ipcRenderer.on('app:initial-state', listener);
      return () => ipcRenderer.removeListener('app:initial-state', listener);
    },
    logError: (scope, message) => ipcRenderer.invoke('app:logError', { scope, message }),
    openLog: () => ipcRenderer.invoke('app:openLog'),
    logPath: () => ipcRenderer.invoke('app:logPath'),
    versionInfo: () => ipcRenderer.invoke('app:versionInfo'),
  },
  git: {
    detect: (folderPath) => ipcRenderer.invoke('git:detect', folderPath),
    status: (root) => ipcRenderer.invoke('git:status', root),
    branches: (root) => ipcRenderer.invoke('git:branches', root),
    diff: (root, path, staged) => ipcRenderer.invoke('git:diff', { root, path, staged }),
    stage: (root, paths) => ipcRenderer.invoke('git:stage', { root, paths }),
    unstage: (root, paths) => ipcRenderer.invoke('git:unstage', { root, paths }),
    discard: (root, paths) => ipcRenderer.invoke('git:discard', { root, paths }),
    commit: (root, message) => ipcRenderer.invoke('git:commit', { root, message }),
    checkout: (root, branch) => ipcRenderer.invoke('git:checkout', { root, branch }),
    createBranch: (root, name, from) => ipcRenderer.invoke('git:createBranch', { root, name, from }),
    merge: (root, branch) => ipcRenderer.invoke('git:merge', { root, branch }),
    fetch: (root) => ipcRenderer.invoke('git:fetch', root),
    pull: (root) => ipcRenderer.invoke('git:pull', root),
    push: (root) => ipcRenderer.invoke('git:push', root),
    sync: (root) => ipcRenderer.invoke('git:sync', root),
  },
  window: {
    spawn: (opts) => ipcRenderer.invoke('window:spawn', opts),
    setTitleBarColors: (color) => ipcRenderer.invoke('window:setTitleBarColors', { color }),
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximizeToggle: () => ipcRenderer.invoke('window:maximizeToggle'),
    close: () => ipcRenderer.invoke('window:close'),
  },
  clipboard: {
    saveImage: () => ipcRenderer.invoke('clipboard:saveImage'),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch),
    reset: () => ipcRenderer.invoke('settings:reset'),
  },
  fonts: {
    list: () => ipcRenderer.invoke('fonts:list'),
    add: () => ipcRenderer.invoke('fonts:add'),
    remove: (id) => ipcRenderer.invoke('fonts:remove', id),
    data: (id) => ipcRenderer.invoke('fonts:data', id),
  },
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    install: () => ipcRenderer.invoke('update:install'),
    onUpdateReady: (cb) => {
      const listener = (_e, version) => cb(version);
      ipcRenderer.on('app:update-ready', listener);
      return () => ipcRenderer.removeListener('app:update-ready', listener);
    },
  },
  fileUtil: {
    // Returns the absolute host path for a File obtained from drag-and-drop, or null on failure.
    pathForFile: (file) => {
      try {
        return webUtils.getPathForFile(file) || null;
      } catch {
        return null;
      }
    },
  },
});
