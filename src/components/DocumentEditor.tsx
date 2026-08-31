import React, { useRef, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { parseDocxFile, generateDocxBlob } from '../services/docManager';
import saveAs from 'file-saver';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table as TableIcon,
  Undo,
  Redo,
  Upload,
  Download,
  Sparkles,
  FileText,
  Trash2,
} from 'lucide-react';

interface DocumentEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  onOpenHumanizerForSelection: (selectedText: string) => void;
  resumeFileName?: string;
  onFileLoaded?: (fileName: string) => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  initialContent,
  onChange,
  onOpenHumanizerForSelection,
  resumeFileName = 'My_Resume.docx',
  onFileLoaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectionCoords, setSelectionCoords] = useState<{ top: number; left: number } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        underline: false as any,
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Paste your resume content or upload a .docx file...',
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to, ' ');
        setSelectedText(text);

        // Position custom bubble menu
        const domSelection = window.getSelection();
        if (domSelection && domSelection.rangeCount > 0) {
          const rect = domSelection.getRangeAt(0).getBoundingClientRect();
          setSelectionCoords({
            top: Math.max(10, rect.top - 45),
            left: rect.left + rect.width / 2,
          });
        }
      } else {
        setSelectedText('');
        setSelectionCoords(null);
      }
    },
  });

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      const isFocused = editor.isFocused;
      if (!isFocused) {
        editor.commands.setContent(initialContent, { emitUpdate: false });
      }
    }
  }, [initialContent, editor]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    try {
      if (file.name.endsWith('.docx')) {
        const { html } = await parseDocxFile(file);
        editor.commands.setContent(html);
        onChange(html);
        if (onFileLoaded) onFileLoaded(file.name);
      } else {
        const text = await file.text();
        editor.commands.setContent(`<p>${text.replace(/\n/g, '<br>')}</p>`);
        onChange(editor.getHTML());
        if (onFileLoaded) onFileLoaded(file.name);
      }
    } catch (err) {
      console.error('Failed to parse uploaded document:', err);
      alert('Could not parse the file. Please ensure it is a valid .docx or text document.');
    }
  };

  const handleExportDocx = async () => {
    if (!editor) return;
    try {
      const html = editor.getHTML();
      const blob = await generateDocxBlob(html, resumeFileName.replace(/\.docx$/i, ''));
      saveAs(blob, resumeFileName.endsWith('.docx') ? resumeFileName : `${resumeFileName}.docx`);
    } catch (err) {
      console.error('Failed to export DOCX:', err);
      alert('Error generating DOCX document. Please try again.');
    }
  };

  const getWordCount = () => {
    if (!editor) return 0;
    const text = editor.getText();
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs relative">
      {/* Top File Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
            {resumeFileName}
          </span>
          <span className="text-[11px] text-slate-400 font-medium ml-1">
            ({getWordCount()} words)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".docx,.doc,.txt"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors shadow-2xs"
            title="Upload an existing .docx resume"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload .docx</span>
          </button>

          <button
            type="button"
            onClick={handleExportDocx}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
            title="Export formatted Microsoft Word (.docx) resume"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .docx</span>
          </button>
        </div>
      </div>

      {/* MS Word-Grade Document Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-white border-b border-slate-200 text-slate-700">
        {/* Headings */}
        <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              editor.isActive('heading', { level: 1 }) ? 'bg-blue-50 text-blue-700 font-bold' : ''
            }`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              editor.isActive('heading', { level: 2 }) ? 'bg-blue-50 text-blue-700 font-bold' : ''
            }`}
            title="Heading 2 (Section Title)"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              editor.isActive('heading', { level: 3 }) ? 'bg-blue-50 text-blue-700 font-bold' : ''
            }`}
            title="Heading 3 (Role/Company)"
          >
            <Heading3 className="w-4 h-4" />
          </button>
        </div>

        {/* Text Styling */}
        <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              editor.isActive('bold') ? 'bg-blue-50 text-blue-700 font-bold' : ''
            }`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              editor.isActive('italic') ? 'bg-blue-50 text-blue-700' : ''
            }`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              editor.isActive('underline') ? 'bg-blue-50 text-blue-700' : ''
            }`}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              editor.isActive('strike') ? 'bg-blue-50 text-blue-700' : ''
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              editor.isActive('highlight') ? 'bg-amber-100 text-amber-900' : ''
            }`}
            title="Highlight Key Skills"
          >
            <Highlighter className="w-4 h-4" />
          </button>
        </div>

        {/* Lists & Hierarchy */}
        <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              editor.isActive('bulletList') ? 'bg-blue-50 text-blue-700' : ''
            }`}
            title="Bullet List (Bullet Points)"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              editor.isActive('orderedList') ? 'bg-blue-50 text-blue-700' : ''
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              editor.isActive('blockquote') ? 'bg-blue-50 text-blue-700' : ''
            }`}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              editor.isActive({ textAlign: 'left' }) ? 'bg-blue-50 text-blue-700' : ''
            }`}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              editor.isActive({ textAlign: 'center' }) ? 'bg-blue-50 text-blue-700' : ''
            }`}
            title="Align Center (Header / Contact)"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              editor.isActive({ textAlign: 'right' }) ? 'bg-blue-50 text-blue-700' : ''
            }`}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>

        {/* Table & Structure */}
        <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
          <button
            type="button"
            onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()}
            className="p-1.5 rounded hover:bg-slate-100 transition-colors"
            title="Insert Multi-column Layout / Table"
          >
            <TableIcon className="w-4 h-4" />
          </button>
          {editor.isActive('table') && (
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete Table"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 pl-1 ml-auto">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Selection Menu */}
      {selectedText && selectionCoords && (
        <div
          style={{
            position: 'fixed',
            top: `${selectionCoords.top}px`,
            left: `${selectionCoords.left}px`,
            transform: 'translateX(-50%)',
            zIndex: 40,
          }}
          className="flex items-center gap-1 bg-slate-900 text-white px-2 py-1.5 rounded-lg shadow-xl border border-slate-800 animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            type="button"
            onClick={() => onOpenHumanizerForSelection(selectedText)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 rounded text-white transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Humanize Selection
          </button>
        </div>
      )}

      {/* Document Canvas Surface */}
      <div className="flex-1 overflow-y-auto bg-slate-100/70 p-4 md:p-6 flex justify-center">
        <div className="w-full max-w-[800px] min-h-[700px] bg-white rounded-lg border border-slate-200/90 shadow-md">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};
