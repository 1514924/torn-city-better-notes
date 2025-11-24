// Drawer.js - Handles markdown rendering and note management
(function() {
  'use strict';

  // Elements
  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const titleInput = document.getElementById('titleInput');
  const notesList = document.getElementById('notesList');
  const newNoteBtn = document.getElementById('newNoteBtn');
  const saveBtn = document.getElementById('saveBtn');
  const importBtn = document.getElementById('importBtn');
  const exportBtn = document.getElementById('exportBtn');
  const deleteBtn = document.getElementById('deleteBtn');
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

  // Update notes list in sidebar
  function updateNotesList() {
    notesList.innerHTML = '';

    if (notes.length === 0) {
      notesList.innerHTML = '<div class="notes-empty">No notes - Create a new one</div>';
      return;
    }

    notes.forEach(note => {
      const noteItem = document.createElement('div');
      noteItem.className = 'note-item';
      noteItem.dataset.noteId = note._id;

      if (currentNote && currentNote._id === note._id) {
        noteItem.classList.add('active');
      }

      const noteTitle = document.createElement('div');
      noteTitle.className = 'note-item-title';
      noteTitle.textContent = note.title || 'Untitled';

      noteItem.appendChild(noteTitle);

      // Add click handler
      noteItem.addEventListener('click', () => {
        if (isDirty && !confirm('You have unsaved changes. Continue?')) {
          return;
        }
        loadNote(note);
      });

      notesList.appendChild(noteItem);
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

  // Delete current note
  async function deleteNote() {
    if (!currentNote) {
      showStatus('No note selected', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      const response = await Api.DeleteNote(currentNote._id);

      if (!response.ok) throw new Error('Failed to delete note');

      // Refresh notes list from server
      await loadNotes();

      notes = notes.filter(n => n._id !== currentNote._id);
      currentNote = null;

      if (notes.length > 0) {
        loadNote(notes[0]);
      } else {
        titleInput.value = '';
        editor.value = '';
        updatePreview();
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

  // Export current note as .md file
  function exportNote() {
    if (!editor.value && !titleInput.value) {
      showStatus('No content to export', 'error');
      return;
    }

    try {
      // Create markdown content
      const content = editor.value;
      const title = titleInput.value || 'Untitled';

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

  newNoteBtn.addEventListener('click', createNewNote);
  saveBtn.addEventListener('click', saveNote);
  importBtn.addEventListener('click', importNote);
  exportBtn.addEventListener('click', exportNote);
  deleteBtn.addEventListener('click', deleteNote);

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
  loadNotes();
})();
