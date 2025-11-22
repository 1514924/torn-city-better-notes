// Drawer.js - Handles markdown rendering and note management
(function() {
  'use strict';

  // Elements
  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const titleInput = document.getElementById('titleInput');
  const noteSelector = document.getElementById('noteSelector');
  const newNoteBtn = document.getElementById('newNoteBtn');
  const saveBtn = document.getElementById('saveBtn');
  const exportBtn = document.getElementById('exportBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const closeBtn = document.getElementById('closeBtn');
  const status = document.getElementById('status');

  // State
  let notes = [];
  let currentNote = null;
  let isDirty = false;

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
      status.textContent = 'Press cmd+[ to toggle drawer';
    }, 3000);
  }

  // Load notes from API
  async function loadNotes() {
    try {
      // const response = await fetch('https://www.torn.com/chat/notes');

      const response = await fetch("https://www.torn.com/chat/notes", {
        "headers": {
          "accept": "*/*",
          "accept-language": "en-US,en;q=0.9",
          "baggage": "sentry-trace_id=d3ebc9d02055460f95326ec1f74979db,sentry-sample_rate=0.00025,sentry-transaction=%2Findex.php,sentry-public_key=a78f3131e2934d6dbfe3e3d4acea7ee4,sentry-release=torn%40f7bbf65b161870c9f8f59c9896d0c576aa71e176,sentry-environment=production,sentry-sampled=false,sentry-sample_rand=0.634768",
          "cache-control": "no-cache",
          "pragma": "no-cache",
          "priority": "u=1, i",
          "sec-ch-ua": "\"Google Chrome\";v=\"141\", \"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"141\"",
          "sec-ch-ua-arch": "\"arm\"",
          "sec-ch-ua-bitness": "\"64\"",
          "sec-ch-ua-full-version": "\"141.0.7390.108\"",
          "sec-ch-ua-full-version-list": "\"Google Chrome\";v=\"141.0.7390.108\", \"Not?A_Brand\";v=\"8.0.0.0\", \"Chromium\";v=\"141.0.7390.108\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-model": "\"\"",
          "sec-ch-ua-platform": "\"macOS\"",
          "sec-ch-ua-platform-version": "\"26.0.1\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "sentry-trace": "d3ebc9d02055460f95326ec1f74979db-9cab9165288c0674-0"
        },
        "referrer": "https://www.torn.com/index.php",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include"
      });

      const data = await response.json();

      notes = data.notes || [];
      updateNoteSelector();

      if (notes.length > 0 && !currentNote) {
        loadNote(notes[0]);
      }

      showStatus('Notes loaded successfully', 'success');
    } catch (error) {
      console.error('Error loading notes:', error);
      showStatus('Error loading notes', 'error');
      noteSelector.innerHTML = '<option value="">Error loading notes</option>';
    }
  }

  // Update note selector dropdown
  function updateNoteSelector() {
    noteSelector.innerHTML = '';

    if (notes.length === 0) {
      noteSelector.innerHTML = '<option value="">No notes - Create a new one</option>';
      return;
    }

    notes.forEach(note => {
      const option = document.createElement('option');
      option.value = note._id;
      option.textContent = note.title || 'Untitled';
      if (currentNote && currentNote._id === note._id) {
        option.selected = true;
      }
      noteSelector.appendChild(option);
    });
  }

  // Load a specific note
  function loadNote(note) {
    currentNote = note;
    titleInput.value = note.title || '';
    editor.value = note.text || '';
    updatePreview();
    isDirty = false;
    updateNoteSelector();
  }

  // Create new note
  async function createNewNote() {
    try {
      const response = await fetch('https://www.torn.com/chat/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          title: 'New Note',
          text: ''
        }),
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to create note');

      const newNote = await response.json();
      notes.unshift(newNote);
      loadNote(newNote);
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
      const response = await fetch(`https://www.torn.com/chat/notes/${currentNote._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8'
        },
        body: JSON.stringify({
          lastModifiedTimestamp: Date.now(),
          title: titleInput.value || 'Untitled',
          text: editor.value
        }),
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to save note');

      currentNote.title = titleInput.value;
      currentNote.text = editor.value;
      isDirty = false;
      updateNoteSelector();
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
      const response = await fetch(`https://www.torn.com/chat/notes/${currentNote._id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete note');

      notes = notes.filter(n => n._id !== currentNote._id);
      currentNote = null;

      if (notes.length > 0) {
        loadNote(notes[0]);
      } else {
        titleInput.value = '';
        editor.value = '';
        updatePreview();
      }

      updateNoteSelector();
      showStatus('Note deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting note:', error);
      showStatus('Error deleting note', 'error');
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

  noteSelector.addEventListener('change', (e) => {
    if (isDirty && !confirm('You have unsaved changes. Continue?')) {
      noteSelector.value = currentNote ? currentNote._id : '';
      return;
    }

    const selectedNote = notes.find(n => n._id === e.target.value);
    if (selectedNote) {
      loadNote(selectedNote);
    }
  });

  newNoteBtn.addEventListener('click', createNewNote);
  saveBtn.addEventListener('click', saveNote);
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
