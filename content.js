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
          <div class="header-main">
            <div class="header-left">
              <a href="https://github.com/1514924/torn-city-better-notes" target="_blank" class="app-title">Better Notes</a>
            </div>
            <div class="header-right">
              <a href="https://www.torn.com/profiles.php?XID=1514924" target="_blank" class="creator-link">
                created by Shane [1514924]
              </a>
              <button class="close-btn" id="closeBtn">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 7.293l3.646-3.647a.5.5 0 01.708.708L8.707 8l3.647 3.646a.5.5 0 01-.708.708L8 8.707l-3.646 3.647a.5.5 0 01-.708-.708L7.293 8 3.646 4.354a.5.5 0 01.708-.708L8 7.293z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="main-container">
          <div class="notes-sidebar">
            <div class="sidebar-header">
              <span>Notes</span>
              <div class="sidebar-actions">
                <button class="toolbar-btn" id="newNoteBtn" title="Create new note">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 3.5a.5.5 0 01.5.5v3.5H12a.5.5 0 010 1H8.5V12a.5.5 0 01-1 0V8.5H4a.5.5 0 010-1h3.5V4a.5.5 0 01.5-.5z"/>
                  </svg>
                </button>
                <button class="toolbar-btn" id="importBtn" title="Import markdown file">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a.5.5 0 01.5.5v9.793l2.146-2.147a.5.5 0 01.708.708l-3 3a.5.5 0 01-.708 0l-3-3a.5.5 0 11.708-.708L7.5 11.293V1.5A.5.5 0 018 1z"/>
                    <path d="M2.5 13.5a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="notes-list" id="notesList">
              <div class="notes-loading">Loading notes...</div>
            </div>
          </div>

          <div class="editor-container">
            <div class="title-section">
              <input type="text" class="title-input" id="titleInput" placeholder="Untitled Note" spellcheck="false">
              <div class="toolbar">
                <div class="toolbar-group">
                  <button class="toolbar-btn" id="exportBtn" title="Export as markdown">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 15a.5.5 0 01-.5-.5V5.207L5.354 7.354a.5.5 0 11-.708-.708l3-3a.5.5 0 01.708 0l3 3a.5.5 0 01-.708.708L8.5 5.207V14.5A.5.5 0 018 15z"/>
                      <path d="M2.5 2.5A.5.5 0 013 2h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z"/>
                    </svg>
                    <span>Export</span>
                  </button>
                </div>
                <div class="toolbar-separator"></div>
                <div class="toolbar-group">
                  <button class="toolbar-btn toolbar-btn-primary" id="saveBtn" title="Save note (Cmd/Ctrl+S)">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z"/>
                    </svg>
                    <span>Save</span>
                  </button>
                </div>
                <div class="toolbar-spacer"></div>
                <div class="toolbar-group">
                  <button class="toolbar-btn toolbar-btn-danger" id="deleteBtn" title="Delete note">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M6.5 1a.5.5 0 00-.5.5v1h4v-1a.5.5 0 00-.5-.5h-3zM11 2.5v-1A1.5 1.5 0 009.5 0h-3A1.5 1.5 0 005 1.5v1H2.5a.5.5 0 000 1h.05l.5 8.5A1.5 1.5 0 004.55 14h6.9a1.5 1.5 0 001.5-1.5l.5-8.5h.05a.5.5 0 000-1H11z"/>
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>

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
