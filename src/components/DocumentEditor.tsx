import React, { useRef, useState, useEffect, useCallback } from 'react';
import { renderAsync } from 'docx-preview';
import { generateDocxBlob } from '../services/docManager';
import saveAs from 'file-saver';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Undo,
  Redo,
  Upload,
  Download,
  Sparkles,
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Save,
} from 'lucide-react';

interface DocumentEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  onOpenHumanizerForSelection: (selectedText: string) => void;
  resumeFileName?: string;
  onFileLoaded?: (fileName: string, filePath?: string) => void;
  onRegisterInsertSnippet?: (inserter: (snippet: string, targetSection?: string) => boolean) => void;
  currentFilePath?: string | null;
  onSaveDirect?: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  onChange,
  onOpenHumanizerForSelection,
  resumeFileName = 'Ajitkumar Subramanyam -  PO June 2nd 2026.docx',
  onFileLoaded,
  onRegisterInsertSnippet,
  currentFilePath,
  onSaveDirect,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectionCoords, setSelectionCoords] = useState<{ top: number; left: number } | null>(null);
  const [isLoadingDocx, setIsLoadingDocx] = useState(false);
  const [zoom, setZoom] = useState<number>(0.85); // 85% zoom fits standard 8.5x11 page perfectly
  const [wordCount, setWordCount] = useState<number>(0);
  const [rawBuffer, setRawBuffer] = useState<ArrayBuffer | null>(null);

  // Load and render a docx buffer using docx-preview
  const renderDocx = useCallback(async (buffer: ArrayBuffer) => {
    if (!docxContainerRef.current) return;
    setIsLoadingDocx(true);
    setRawBuffer(buffer);

    try {
      docxContainerRef.current.innerHTML = '';
      await renderAsync(buffer, docxContainerRef.current, undefined, {
        className: 'docx-preview',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
        experimental: true,
        trimXmlDeclaration: true,
        useBase64URL: true,
      });

      const sections = docxContainerRef.current.querySelectorAll('section, .docx-preview');
      sections.forEach((sec) => {
        sec.setAttribute('contenteditable', 'true');
        sec.setAttribute('spellcheck', 'true');
      });

      // Extract initial plain text and update word count
      const text = docxContainerRef.current.innerText || '';
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      onChange(docxContainerRef.current.innerHTML);
    } catch (err) {
      console.error('Failed to render document with docx-preview:', err);
    } finally {
      setIsLoadingDocx(false);
    }
  }, [onChange]);

  const hasLoadedInitialRef = useRef(false);

  // Automatically load the sample resume docx on initial mount once
  useEffect(() => {
    if (hasLoadedInitialRef.current) return;
    hasLoadedInitialRef.current = true;

    fetch('/sample-resume.docx')
      .then((res) => {
        if (res.ok) return res.arrayBuffer();
        return null;
      })
      .then((buffer) => {
        if (buffer && docxContainerRef.current) {
          renderDocx(buffer);
          if (onFileLoaded) {
            onFileLoaded('Ajitkumar Subramanyam -  PO June 2nd 2026.docx');
          }
        }
      })
      .catch((err) => {
        console.log('No default sample docx found:', err);
      });
  }, [renderDocx, onFileLoaded]);

  // Handle user typing and changes inside the contentEditable document
  const handleContentInput = useCallback(() => {
    if (!docxContainerRef.current) return;
    const text = docxContainerRef.current.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
    onChange(docxContainerRef.current.innerHTML);
  }, [onChange]);

  // Layout-aware insertion: Inserts snippets into the target section without breaking tables or layout
  useEffect(() => {
    if (onRegisterInsertSnippet) {
      onRegisterInsertSnippet((snippet: string, targetSection: string = 'Experience') => {
        if (!docxContainerRef.current) return false;

        // 1. If user has an active selection or caret inside the document, insert at cursor
        const selection = window.getSelection();
        if (
          selection &&
          selection.rangeCount > 0 &&
          docxContainerRef.current.contains(selection.anchorNode)
        ) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(snippet);
          range.insertNode(textNode);
          handleContentInput();
          return true;
        }

        // 2. Otherwise, find the target section container (e.g. Experience, Profile, Skills)
        const sectionKeywords = targetSection.toLowerCase().split(/[\s&/]+/);
        const allElements = Array.from(docxContainerRef.current.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, span, div, td'));

        let targetHeaderEl: HTMLElement | null = null;
        for (const el of allElements) {
          const text = el.innerText ? el.innerText.trim().toLowerCase() : '';
          if (text.length > 2 && text.length < 40) {
            if (sectionKeywords.some((kw) => text.includes(kw))) {
              targetHeaderEl = el;
              break;
            }
          }
        }

        let containerCell: HTMLElement | null = null;
        let referenceSibling: HTMLElement | null = null;

        if (targetHeaderEl) {
          const cell = targetHeaderEl.closest('td, section, div');
          if (cell) {
            containerCell = cell as HTMLElement;
            const existingList = cell.querySelector('ul, ol');
            if (existingList) {
              referenceSibling = existingList.lastElementChild as HTMLElement;
            } else {
              const paras = Array.from(cell.querySelectorAll('p'));
              if (paras.length > 0) {
                referenceSibling = paras[paras.length - 1];
              }
            }
          }
        }

        // Fallback: If no section header matched, find the main content column (widest td or section)
        if (!containerCell) {
          const cells = Array.from(docxContainerRef.current.querySelectorAll('td'));
          if (cells.length > 0) {
            cells.sort((a, b) => ((b as HTMLElement).innerText || '').length - ((a as HTMLElement).innerText || '').length);
            containerCell = cells[0] as HTMLElement;
            const paras = Array.from(containerCell.querySelectorAll('p'));
            if (paras.length > 0) referenceSibling = paras[paras.length - 1];
          } else {
            containerCell = (docxContainerRef.current.querySelector('section') || docxContainerRef.current) as HTMLElement;
          }
        }

        // 3. Create the new element preserving identical sibling styling
        const isList = referenceSibling && referenceSibling.tagName === 'LI';
        const newEl = document.createElement(isList ? 'li' : 'p');

        if (referenceSibling) {
          newEl.className = referenceSibling.className;
          newEl.style.cssText = referenceSibling.style.cssText;
        }

        newEl.innerText = snippet;
        newEl.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
        newEl.style.borderLeft = '3px solid #10b981';
        newEl.style.paddingLeft = '6px';
        newEl.style.transition = 'all 1.5s ease';

        if (referenceSibling && referenceSibling.parentElement) {
          referenceSibling.parentElement.appendChild(newEl);
        } else {
          containerCell.appendChild(newEl);
        }

        // Scroll into view smoothly and remove temporary highlight
        newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => {
          newEl.style.backgroundColor = 'transparent';
          newEl.style.borderLeft = 'none';
          newEl.style.paddingLeft = '0px';
        }, 3000);

        handleContentInput();
        return true;
      });
    }
  }, [onRegisterInsertSnippet, handleContentInput]);

  // Selection change listener to detect highlighted text for Humanizer
  const handleSelectionChange = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectedText('');
      setSelectionCoords(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length > 4) {
      setSelectedText(text);
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionCoords({
          top: Math.max(10, rect.top - 45),
          left: rect.left + rect.width / 2,
        });
      }
    } else {
      setSelectedText('');
      setSelectionCoords(null);
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  // Upload custom .docx file
  const handleUploadClick = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.openDocxDialog();
      if (result) {
        const uint8 = new Uint8Array(result.data);
        await renderDocx(uint8.buffer);
        if (onFileLoaded) onFileLoaded(result.fileName, result.filePath);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      await renderDocx(buffer);
      const filePath = (file as any).path || undefined;
      if (onFileLoaded) onFileLoaded(file.name, filePath);
    } catch (err) {
      console.error('Failed to parse uploaded document:', err);
      alert('Could not parse the file. Please ensure it is a valid .docx document.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Please drop a valid .docx resume document.');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      await renderDocx(buffer);
      const filePath = (file as any).path || undefined;
      if (onFileLoaded) onFileLoaded(file.name, filePath);
    } catch (err) {
      console.error('Failed to parse dropped document:', err);
    }
  };

  // Export / Download .docx
  const handleExportDocx = async () => {
    try {
      if (rawBuffer) {
        // If raw docx buffer exists, save it directly preserving all OpenXML formatting
        const blob = new Blob([rawBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        saveAs(blob, resumeFileName.endsWith('.docx') ? resumeFileName : `${resumeFileName}.docx`);
      } else if (docxContainerRef.current) {
        const html = docxContainerRef.current.innerHTML;
        const blob = await generateDocxBlob(html, resumeFileName.replace(/\.docx$/i, ''));
        saveAs(blob, resumeFileName.endsWith('.docx') ? resumeFileName : `${resumeFileName}.docx`);
      }
    } catch (err) {
      console.error('Failed to export DOCX:', err);
      alert('Error generating DOCX document. Please try again.');
    }
  };

  // Formatting commands on the active contentEditable selection
  const executeCommand = (cmd: string, value: string = '') => {
    document.execCommand(cmd, false, value);
    handleContentInput();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col h-full bg-white rounded-xl border ${
        isDragging ? 'border-blue-500 ring-2 ring-blue-300' : 'border-slate-200'
      } overflow-hidden shadow-xs relative`}
    >
      {/* Native Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-600/10 backdrop-blur-xs border-2 border-dashed border-blue-600 flex items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <div className="bg-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-sm font-semibold text-blue-700">
            <Upload className="w-5 h-5 text-blue-600 animate-bounce" />
            <span>Drop .docx file to open directly in Resume Improver</span>
          </div>
        </div>
      )}

      {/* Top File Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800 truncate max-w-[220px]" title={currentFilePath || resumeFileName}>
            {resumeFileName}
          </span>
          <span className="text-[11px] text-slate-500 font-medium shrink-0">
            ({wordCount.toLocaleString()} words)
          </span>
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
            Word Fidelity
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".docx"
            className="hidden"
          />
          <button
            type="button"
            onClick={handleUploadClick}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            title={window.electronAPI ? 'Open Word Document via Windows Dialog' : 'Upload .docx file'}
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload .docx</span>
          </button>

          {window.electronAPI && onSaveDirect && (
            <button
              type="button"
              onClick={onSaveDirect}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs"
              title="Save changes directly to disk (Ctrl + S)"
            >
              <Save className="w-3.5 h-3.5 text-emerald-600" />
              <span>Save (Ctrl+S)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportDocx}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .docx</span>
          </button>
        </div>
      </div>

      {/* Formatting & Zoom Toolbar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-white border-b border-slate-200 overflow-x-auto no-scrollbar shrink-0">
        <div className="flex items-center gap-1">
          {/* Headings */}
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<h1>')}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<h2>')}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 mx-1" />

          {/* Basic Text Formatting */}
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700 font-bold"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('italic')}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700 italic"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('underline')}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700 underline"
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertOrderedList')}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 mx-1" />

          {/* Undo / Redo */}
          <button
            type="button"
            onClick={() => executeCommand('undo')}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('redo')}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 text-xs text-slate-600 pl-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
            className="p-1 rounded hover:bg-slate-100 text-slate-600"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-semibold w-11 text-center text-[11px]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
            className="p-1 rounded hover:bg-slate-100 text-slate-600"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(0.85)}
            className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-[11px] font-medium text-blue-600"
            title="Fit Width"
          >
            <Maximize2 className="w-3 h-3 inline mr-0.5" />
            Fit
          </button>
        </div>
      </div>

      {/* Floating Selection Menu for Humanizer */}
      {selectionCoords && selectedText && (
        <div
          style={{
            position: 'fixed',
            top: `${selectionCoords.top}px`,
            left: `${selectionCoords.left}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
          className="bg-slate-900 text-white rounded-lg shadow-xl px-2.5 py-1.5 flex items-center gap-2 text-xs border border-slate-700 animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            type="button"
            onClick={() => {
              onOpenHumanizerForSelection(selectedText);
              setSelectionCoords(null);
            }}
            className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Humanize Selection</span>
          </button>
        </div>
      )}

      {/* High-Fidelity Microsoft Word Document Viewport */}
      <div
        className="flex-1 overflow-auto bg-slate-200/70 p-3 flex justify-center items-start relative"
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
      >
        {isLoadingDocx && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center z-20 text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-sm font-medium">Rendering Microsoft Word Document...</p>
            <p className="text-xs text-slate-400">Preserving exact layout tables, styles, and typography</p>
          </div>
        )}

        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className="docx-render-stage"
        >
          <div
            ref={docxContainerRef}
            onInput={handleContentInput}
            className="docx-editor-root"
          />
        </div>
      </div>
    </div>
  );
};
