// Content script for Torn Markdown Notes
(function() {
  'use strict';

  let drawer = null;
  let backdrop = null;
  let isOpen = false;

  // Create drawer elements
  function createDrawer() {
    if (drawer) return;

    // Create backdrop
    backdrop = document.createElement('div');
    backdrop.id = 'torn-notes-backdrop';
    backdrop.addEventListener('click', closeDrawer);

    // Create drawer container
    drawer = document.createElement('div');
    drawer.id = 'torn-notes-drawer';

    // Create the drawer content directly in the DOM
    drawer.innerHTML = `
      <div class="torn-notes-content">
        <div class="header">
          <div class="header-left">
            <select class="note-selector" id="noteSelector">
              <option value="">Loading notes...</option>
            </select>
            <button class="btn" id="newNoteBtn">New</button>
            <button class="btn" id="saveBtn">Save</button>
            <button class="btn btn-secondary" id="importBtn">Import</button>
            <button class="btn btn-secondary" id="exportBtn">Export</button>
            <button class="btn btn-secondary" id="deleteBtn">Delete</button>
          </div>
          <button class="close-btn" id="closeBtn">&times;</button>
        </div>

        <input type="text" class="title-input" id="titleInput" placeholder="Note title...">

        <div class="content-area">
          <div class="editor-pane">
            <div class="pane-header">Markdown Editor</div>
            <textarea class="editor" id="editor" placeholder="Write your markdown here..."></textarea>
          </div>

          <div class="preview-pane">
            <div class="pane-header">Preview</div>
            <div class="preview" id="preview">
              <p style="color: #888;">Preview will appear here...</p>
            </div>
          </div>
        </div>

        <div class="status" id="status">Press cmd+[ to toggle drawer</div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    // Inject the drawer.js script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('drawer.js');
    drawer.appendChild(script);

    // Setup close button handler
    const closeBtn = drawer.querySelector('#closeBtn');
    closeBtn.addEventListener('click', closeDrawer);
  }

  // Open drawer
  function openDrawer() {
    createDrawer();

    // Force reflow to trigger animation
    setTimeout(() => {
      drawer.classList.add('open');
      backdrop.classList.add('visible');
      isOpen = true;
    }, 10);
  }

  // Close drawer
  function closeDrawer() {
    if (!drawer) return;

    drawer.classList.remove('open');
    backdrop.classList.remove('visible');
    isOpen = false;
  }

  // Toggle drawer
  function toggleDrawer() {
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  // Listen for keyboard shortcut: Cmd+[ or Ctrl+[
  document.addEventListener('keydown', (event) => {
    // Check for Cmd+[ (Mac) or Ctrl+[ (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.key === '[') {
      event.preventDefault();
      toggleDrawer();
    }

    // Also allow Escape to close
    if (event.key === 'Escape' && isOpen) {
      closeDrawer();
    }
  });

  console.log('Torn Markdown Notes extension loaded. Press Cmd+[ to open.');
})();
