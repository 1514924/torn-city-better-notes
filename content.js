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
      <div class="resize-handle"></div>
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

    // Setup resize handle
    setupResizeHandle();
  }

  // Setup resize handle functionality
  function setupResizeHandle() {
    const resizeHandle = drawer.querySelector('.resize-handle');
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    // Load saved width from localStorage
    const savedWidth = localStorage.getItem('torn-notes-drawer-width');
    if (savedWidth) {
      drawer.style.width = savedWidth;
    }

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = drawer.offsetWidth;

      // Add class to disable transitions during resize
      drawer.classList.add('resizing');

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const newWidth = startWidth + deltaX;

      // Constrain width between min and max
      const minWidth = 600;
      const maxWidth = window.innerWidth * 0.9;
      const constrainedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

      drawer.style.width = `${constrainedWidth}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        drawer.classList.remove('resizing');

        // Save width to localStorage
        localStorage.setItem('torn-notes-drawer-width', drawer.style.width);
      }
    });
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
