// Drawer.js - Handles markdown rendering and note management
(function() {
  'use strict';

  // Elements
  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const titleInput = document.getElementById('titleInput');
  const notesList = document.getElementById('notesList');
  const notesSidebar = document.getElementById('notesSidebar');
  const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
  const newNoteBtn = document.getElementById('newNoteBtn');
  const saveBtn = document.getElementById('saveBtn');
  const importBtn = document.getElementById('importBtn');
  const closeBtn = document.getElementById('closeBtn');
  const status = document.getElementById('status');

  const Api = {
    GetNotes: () => fetch("https://www.torn.com/chat/notes", {
      "referrer": "https://www.torn.com/index.php",
      "method": "GET",
      "mode": "cors",
      "credentials": "include"
    }),
    CreateNote: (title, text) => fetch('https://www.torn.com/chat/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        title,
        text,
      }),
      credentials: 'include'
    }),
    UpdateNote: (_id, title, text) => fetch(`https://www.torn.com/chat/notes/${_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8'
      },
      body: JSON.stringify({
        lastModifiedTimestamp: Date.now(),
        title: title,
        text: text
      }),
      credentials: 'include'
    }),
    DeleteNote: (_id) => fetch(`https://www.torn.com/chat/notes/${_id}`, {
      method: 'DELETE',
      credentials: 'include'
    }), 
  }

  // State
  let notes = [];
  let currentNote = null;
  let isDirty = false;
  let isSidebarCollapsed = localStorage.getItem('torn-notes-sidebar-collapsed') === 'true';
  let collapsedFolders = new Set(JSON.parse(localStorage.getItem('torn-notes-collapsed-folders') || '[]'));

  // Toggle sidebar collapse
  function toggleSidebar() {
    isSidebarCollapsed = !isSidebarCollapsed;
    localStorage.setItem('torn-notes-sidebar-collapsed', isSidebarCollapsed);

    if (isSidebarCollapsed) {
      notesSidebar.classList.add('collapsed');
      toggleSidebarBtn.title = 'Expand sidebar';
      toggleSidebarBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.646 1.646a.5.5 0 01.708 0l6 6a.5.5 0 010 .708l-6 6a.5.5 0 01-.708-.708L10.293 8 4.646 2.354a.5.5 0 010-.708z"/>
        </svg>
      `;
    } else {
      notesSidebar.classList.remove('collapsed');
      toggleSidebarBtn.title = 'Collapse sidebar';
      toggleSidebarBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.354 1.646a.5.5 0 010 .708L5.707 8l5.647 5.646a.5.5 0 01-.708.708l-6-6a.5.5 0 010-.708l6-6a.5.5 0 01.708 0z"/>
        </svg>
      `;
    }
  }

  // Decode HTML entities
  function decodeHtmlEntities(text) {
    if (!text) return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  // Simple markdown parser
  function parseMarkdown(markdown) {
    if (!markdown) return '<p style="color: #888;">Preview will appear here...</p>';

    let html = markdown;

    // Escape HTML
    html = html.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Horizontal rule
    html = html.replace(/^---$/gim, '<hr>');

    // Unordered lists
    html = html.replace(/^\* (.+)$/gim, '<ul><li>$1</li></ul>');
    html = html.replace(/^- (.+)$/gim, '<ul><li>$1</li></ul>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gim, '<ol><li>$1</li></ol>');

    // Merge consecutive list items
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    html = html.replace(/<\/ol>\s*<ol>/g, '');

    // Blockquotes
    html = html.replace(/^&gt; (.*$)/gim, '<blockquote>$1</blockquote>');
    html = html.replace(/<\/blockquote>\s*<blockquote>/g, '<br>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraphs if not already in a block element
    if (!html.match(/^<[h|u|o|p|b]/)) {
      html = '<p>' + html + '</p>';
    }

    return html;
  }

  // Update preview
  function updatePreview() {
    const markdown = editor.value;
    preview.innerHTML = parseMarkdown(markdown);
  }

  // Show status message
  function showStatus(message, type = '') {
    status.textContent = message;
    status.className = 'status ' + type;
    setTimeout(() => {
      status.className = 'status';
      status.textContent = '';
    }, 3000);
  }

  // Load notes from API
  async function loadNotes() {
    try {

      const response = await Api.GetNotes();

      const data = await response.json();

      notes = data.notes || [];
      updateNotesList();

      if (notes.length > 0 && !currentNote) {
        loadNote(notes[0]);
      }

      showStatus('Notes loaded successfully', 'success');
    } catch (error) {
      console.error('Error loading notes:', error);
      showStatus('Error loading notes', 'error');
      notesList.innerHTML = '<div class="notes-empty">Error loading notes</div>';
    }
  }

  // Build folder tree from notes
  function buildFolderTree(notes) {
    const tree = { folders: {}, notes: [] };

    notes.forEach(note => {
      const title = note.title || 'Untitled';
      const parts = title.split('/');

      if (parts.length === 1) {
        // No folder, add to root
        tree.notes.push(note);
      } else {
        // Has folder(s)
        let current = tree;

        // Navigate/create folder structure
        for (let i = 0; i < parts.length - 1; i++) {
          const folderName = parts[i];
          if (!current.folders[folderName]) {
            current.folders[folderName] = { folders: {}, notes: [] };
          }
          current = current.folders[folderName];
        }

        // Add note to final folder
        current.notes.push(note);
      }
    });

    return tree;
  }

  // Toggle folder collapse state
  function toggleFolder(folderPath) {
    if (collapsedFolders.has(folderPath)) {
      collapsedFolders.delete(folderPath);
    } else {
      collapsedFolders.add(folderPath);
    }
    localStorage.setItem('torn-notes-collapsed-folders', JSON.stringify([...collapsedFolders]));
    updateNotesList();
  }

  // Render note item
  function renderNoteItem(note, depth = 0) {
    const noteItem = document.createElement('div');
    noteItem.className = 'note-item';
    noteItem.dataset.noteId = note._id;
    if (depth > 0) {
      noteItem.style.paddingLeft = `${16 + depth * 16}px`;
    }

    if (currentNote && currentNote._id === note._id) {
      noteItem.classList.add('active');
    }

    const noteTitle = document.createElement('div');
    noteTitle.className = 'note-item-title';
    // Show only the last part of the path (after last /)
    const title = note.title || 'Untitled';
    const parts = title.split('/');
    noteTitle.textContent = parts[parts.length - 1];

    const noteActions = document.createElement('div');
    noteActions.className = 'note-item-actions';

    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'note-action-btn';
    exportBtn.title = 'Export as markdown';
    exportBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 15a.5.5 0 01-.5-.5V5.207L5.354 7.354a.5.5 0 11-.708-.708l3-3a.5.5 0 01.708 0l3 3a.5.5 0 01-.708.708L8.5 5.207V14.5A.5.5 0 018 15z"/>
        <path d="M2.5 2.5A.5.5 0 013 2h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z"/>
      </svg>
    `;
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportNote(note);
    });

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'note-action-btn note-action-btn-danger';
    deleteBtn.title = 'Delete note';
    deleteBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6.5 1a.5.5 0 00-.5.5v1h4v-1a.5.5 0 00-.5-.5h-3zM11 2.5v-1A1.5 1.5 0 009.5 0h-3A1.5 1.5 0 005 1.5v1H2.5a.5.5 0 000 1h.05l.5 8.5A1.5 1.5 0 004.55 14h6.9a1.5 1.5 0 001.5-1.5l.5-8.5h.05a.5.5 0 000-1H11z"/>
      </svg>
    `;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNote(note);
    });

    noteActions.appendChild(exportBtn);
    noteActions.appendChild(deleteBtn);

    noteItem.appendChild(noteTitle);
    noteItem.appendChild(noteActions);

    // Add click handler for note item
    noteItem.addEventListener('click', () => {
      if (isDirty && !confirm('You have unsaved changes. Continue?')) {
        return;
      }
      loadNote(note);
    });

    return noteItem;
  }

  // Render folder and its contents recursively
  function renderFolder(folderName, folderData, parentPath = '', depth = 0) {
    const elements = [];
    const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
    const isCollapsed = collapsedFolders.has(folderPath);

    // Create folder item
    const folderItem = document.createElement('div');
    folderItem.className = 'folder-item';

    const folderHeader = document.createElement('div');
    folderHeader.className = 'folder-header';
    if (depth > 0) {
      folderHeader.style.paddingLeft = `${16 + depth * 16}px`;
    }

    const folderIcon = document.createElement('span');
    folderIcon.className = 'folder-toggle-icon';
    folderIcon.innerHTML = isCollapsed ? `
      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
        <polygon points="2,1 7,4 2,7"/>
      </svg>
    ` : `
      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
        <polygon points="1,2 4,7 7,2"/>
      </svg>
    `;

    const folderLabel = document.createElement('span');
    folderLabel.className = 'folder-label';
    folderLabel.textContent = folderName;

    folderHeader.appendChild(folderIcon);
    folderHeader.appendChild(folderLabel);
    folderItem.appendChild(folderHeader);

    folderHeader.addEventListener('click', () => {
      toggleFolder(folderPath);
    });

    elements.push(folderItem);

    // Render folder contents if not collapsed
    if (!isCollapsed) {
      // Create combined list of folders and notes for sorting
      const items = [];

      // Add subfolders
      Object.keys(folderData.folders).forEach(subfolderName => {
        items.push({
          type: 'folder',
          name: subfolderName.toLowerCase(),
          data: { name: subfolderName, folder: folderData.folders[subfolderName] }
        });
      });

      // Add notes
      folderData.notes.forEach(note => {
        const noteName = (note.title || 'Untitled').split('/').pop();
        items.push({
          type: 'note',
          name: noteName.toLowerCase(),
          data: note
        });
      });

      // Sort everything together alphabetically
      items.sort((a, b) => a.name.localeCompare(b.name));

      // Render in sorted order
      items.forEach(item => {
        if (item.type === 'folder') {
          const subfolderElements = renderFolder(
            item.data.name,
            item.data.folder,
            folderPath,
            depth + 1
          );
          elements.push(...subfolderElements);
        } else {
          elements.push(renderNoteItem(item.data, depth + 1));
        }
      });
    }

    return elements;
  }

  // Update notes list in sidebar
  function updateNotesList() {
    notesList.innerHTML = '';

    if (notes.length === 0) {
      notesList.innerHTML = '<div class="notes-empty">No notes - Create a new one</div>';
      return;
    }

    // Sort notes alphabetically by full title (case-insensitive)
    const sortedNotes = [...notes].sort((a, b) => {
      const titleA = (a.title || 'Untitled').toLowerCase();
      const titleB = (b.title || 'Untitled').toLowerCase();
      return titleA.localeCompare(titleB);
    });

    // Build folder tree
    const tree = buildFolderTree(sortedNotes);

    // Create combined list of root folders and notes for sorting
    const rootItems = [];

    // Add root folders
    Object.keys(tree.folders).forEach(folderName => {
      rootItems.push({
        type: 'folder',
        name: folderName.toLowerCase(),
        data: { name: folderName, folder: tree.folders[folderName] }
      });
    });

    // Add root notes
    tree.notes.forEach(note => {
      const noteName = (note.title || 'Untitled');
      rootItems.push({
        type: 'note',
        name: noteName.toLowerCase(),
        data: note
      });
    });

    // Sort everything together alphabetically
    rootItems.sort((a, b) => a.name.localeCompare(b.name));

    // Render in sorted order
    rootItems.forEach(item => {
      if (item.type === 'folder') {
        const folderElements = renderFolder(item.data.name, item.data.folder);
        folderElements.forEach(el => notesList.appendChild(el));
      } else {
        notesList.appendChild(renderNoteItem(item.data, 0));
      }
    });
  }

  // Load a specific note
  function loadNote(note) {
    currentNote = note;
    titleInput.value = decodeHtmlEntities(note.title) || '';
    editor.value = decodeHtmlEntities(note.text) || '';
    updatePreview();
    isDirty = false;
    updateNotesList();
  }

  // Create new note
  async function createNewNote() {
    try {
      const response = await Api.CreateNote("New note", "");

      if (!response.ok) throw new Error('Failed to create note');

      const newNote = await response.json();

      // Refresh notes list from server
      await loadNotes();

      // Load the newly created note
      const createdNote = notes.find(n => n._id === newNote._id);
      if (createdNote) {
        loadNote(createdNote);
      }

      showStatus('New note created', 'success');
    } catch (error) {
      console.error('Error creating note:', error);
      showStatus('Error creating note', 'error');
    }
  }

  // Save current note
  async function saveNote() {
    if (!currentNote) {
      showStatus('No note selected', 'error');
      return;
    }

    try {
      const response = await Api.UpdateNote(
        currentNote._id,
        titleInput.value || 'Untitled',
        editor.value
      );

      if (!response.ok) throw new Error('Failed to save note');

      currentNote.title = titleInput.value;
      currentNote.text = editor.value;
      isDirty = false;
      updateNotesList();
      showStatus('Note saved successfully', 'success');
    } catch (error) {
      console.error('Error saving note:', error);
      showStatus('Error saving note', 'error');
    }
  }

  // Delete a note
  async function deleteNote(note) {
    if (!note) {
      showStatus('No note selected', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${note.title || 'Untitled'}"?`)) {
      return;
    }

    try {
      const response = await Api.DeleteNote(note._id);

      if (!response.ok) throw new Error('Failed to delete note');

      // Remove from notes array
      notes = notes.filter(n => n._id !== note._id);

      // If we deleted the current note, load another one
      if (currentNote && currentNote._id === note._id) {
        currentNote = null;
        if (notes.length > 0) {
          loadNote(notes[0]);
        } else {
          titleInput.value = '';
          editor.value = '';
          updatePreview();
        }
      }

      updateNotesList();
      showStatus('Note deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting note:', error);
      showStatus('Error deleting note', 'error');
    }
  }

  // Import note from .md file
  function importNote() {
    try {
      // Create file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.md,.markdown,.txt';

      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const content = await file.text();
          const fileName = file.name.replace(/\.(md|markdown|txt)$/i, '');

          // Create new note with imported content
          const response = await Api.CreateNote(
            fileName,
            content
          );

          if (!response.ok) throw new Error('Failed to create note');

          const newNote = await response.json();

          // Refresh notes list from server
          await loadNotes();

          // Load the newly imported note
          const importedNote = notes.find(n => n._id === newNote._id);
          if (importedNote) {
            loadNote(importedNote);
          }

          showStatus('Note imported successfully', 'success');
        } catch (error) {
          console.error('Error importing note:', error);
          showStatus('Error importing note', 'error');
        }
      });

      // Trigger file picker
      fileInput.click();
    } catch (error) {
      console.error('Error importing note:', error);
      showStatus('Error importing note', 'error');
    }
  }

  // Export a note as .md file
  function exportNote(note) {
    if (!note) {
      showStatus('No note selected', 'error');
      return;
    }

    try {
      // Use decoded content from the note
      const content = decodeHtmlEntities(note.text) || '';
      const title = decodeHtmlEntities(note.title) || 'Untitled';

      if (!content && !title) {
        showStatus('No content to export', 'error');
        return;
      }

      // Create blob with markdown content
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Sanitize filename: remove invalid characters
      const sanitizedTitle = title.replace(/[/\\?%*:|"<>]/g, '-');
      link.download = `${sanitizedTitle}.md`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showStatus('Note exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting note:', error);
      showStatus('Error exporting note', 'error');
    }
  }

  // Event listeners
  editor.addEventListener('input', () => {
    updatePreview();
    isDirty = true;
  });

  titleInput.addEventListener('input', () => {
    isDirty = true;
  });

  toggleSidebarBtn.addEventListener('click', toggleSidebar);
  newNoteBtn.addEventListener('click', createNewNote);
  saveBtn.addEventListener('click', saveNote);
  importBtn.addEventListener('click', importNote);

  // Note: closeBtn is now handled in content.js

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Cmd+S / Ctrl+S to save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveNote();
    }
  });

  // Initialize
  // Restore sidebar collapsed state
  if (isSidebarCollapsed) {
    toggleSidebar();
  }

  loadNotes();
})();
